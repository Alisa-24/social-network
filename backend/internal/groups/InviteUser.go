package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"backend/internal/ws"
	"net/http"
	"strconv"
	"strings"
	"time"
)

func InviteUser(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Get current user ID from context
	inviterID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	// Parse request body
	err := r.ParseForm()
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid request",
		})
		return
	}

	groupIDStr := r.FormValue("group_id")
	inviteeIDStr := r.FormValue("invitee_id")

	groupID, err := strconv.ParseInt(groupIDStr, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid group ID",
		})
		return
	}

	inviteeID, err := strconv.Atoi(inviteeIDStr)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid invitee ID",
		})
		return
	}

	// Check if inviter is a member of the group
	isMember, err := queries.IsUserGroupMember(int(groupID), inviterID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Error checking membership",
		})
		return
	}

	if !isMember {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "You must be a member to invite others",
		})
		return
	}

	// Check if invitee is already a member
	isAlreadyMember, err := queries.IsUserGroupMember(int(groupID), inviteeID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Error checking invitee membership",
		})
		return
	}

	if isAlreadyMember {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "User is already a member",
		})
		return
	}

	// Check if invitee has a pending join request - if so, auto-accept them
	hasPendingRequest, err := queries.HasPendingJoinRequest(groupID, inviteeID)
	if err == nil && hasPendingRequest {
		// User has a pending request, so add them directly as a member
		err = queries.AddGroupMember(groupID, inviteeID)
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to add user to the group",
			})
			return
		}

		// Delete the pending join request
		err = queries.DeleteGroupJoinRequest(groupID, inviteeID)
		if err != nil {
			// Log error but don't fail the request
			println("Failed to delete join request:", err.Error())
		}

		// Send notification to the user that they were accepted
		group, _ := queries.GetGroupByID(groupID)
		notification := models.NotificationMessage{
			Type: "join_request_approved",
			Data: map[string]interface{}{
				"group_id":   groupID,
				"group_name": group.Name,
				"message":    "You have been added to the group!",
			},
			Timestamp: time.Now(),
		}
		ws.SendNotificationToUser(inviteeID, notification)

		utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
			Success: true,
			Message: "User had a pending request and was automatically added to the group",
		})
		return
	}

	// Create invitation
	err = queries.CreateGroupInvitation(groupID, inviterID, inviteeID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to create invitation",
		})
		return
	}

	// Get group and inviter details for notification
	group, _ := queries.GetGroupByID(groupID)
	inviter, _ := queries.GetUserByID(inviterID)

	// Send WebSocket notification to invitee
	notification := models.NotificationMessage{
		Type: "group_invitation",
		Data: map[string]interface{}{
			"group_id":     groupID,
			"group_name":   group.Name,
			"inviter_id":   inviterID,
			"inviter_name": inviter.FirstName + " " + inviter.LastName,
		},
		Timestamp: time.Now(),
	}

	ws.SendNotificationToUser(inviteeID, notification)

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Invitation sent successfully",
	})
}

func HandleInvitation(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Get current user ID from context
	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	// Parse request body
	err := r.ParseForm()
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid request",
		})
		return
	}

	invitationIDStr := strings.TrimSpace(r.FormValue("invitation_id"))
	action := strings.TrimSpace(r.FormValue("action")) // "accept" or "decline"

	if invitationIDStr == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Missing invitation ID",
		})
		return
	}

	invitationID, err := strconv.Atoi(invitationIDStr)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid invitation ID",
		})
		return
	}

	if action != "accept" && action != "decline" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid action. Must be 'accept' or 'decline'",
		})
		return
	}

	// Get invitation details to verify it belongs to this user
	groupID, inviteeID, err := queries.GetGroupInvitationByID(invitationID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Invitation not found",
		})
		return
	}

	// Verify the invitation is for the current user
	if inviteeID != userID {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "This invitation is not for you",
		})
		return
	}

	// If accepted, add user to group
	if action == "accept" {
		err = queries.AddGroupMember(groupID, userID)
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to add you to the group",
			})
			return
		}
	}

	// Delete the invitation
	err = queries.DeleteGroupInvitation(invitationID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to process invitation",
		})
		return
	}

	message := "Invitation declined"
	if action == "accept" {
		message = "You have joined the group!"
		// Notify the user via WebSocket so the UI can refresh groups list
		group, _ := queries.GetGroupByID(groupID)
		notification := models.NotificationMessage{
			Type: "group_joined",
			Data: map[string]interface{}{
				"group_id":   groupID,
				"group_name": group.Name,
			},
			Timestamp: time.Now(),
		}
		ws.SendNotificationToUser(userID, notification)
	}

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: message,
	})
}

func GetInvitations(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Get current user ID from context
	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	// Get all pending invitations for the user
	invitations, err := queries.GetUserInvitations(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to fetch invitations",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":     true,
		"invitations": invitations,
	})
}
