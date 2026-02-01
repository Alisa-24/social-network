package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"backend/internal/ws"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

func JoinGroup(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	groupID := r.FormValue("groupID")
	if groupID == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Group ID is required",
		})
		return
	}

	groupIDInt, err := strconv.ParseInt(groupID, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid group ID",
		})
		return
	}

	// Get group details
	group, err := queries.GetGroupByID(groupIDInt)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Group not found",
		})
		return
	}

	//Check if user is already a member
	isMember, err := queries.IsUserGroupMember(int(groupIDInt), userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to check membership",
		})
		return
	}
	if isMember {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Already a member of the group",
		})
		return
	}

	// Check if user already has a pending request
	hasPending, err := queries.HasPendingJoinRequest(groupIDInt, userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to check pending requests",
		})
		return
	}
	if hasPending {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "You already have a pending join request for this group",
		})
		return
	}

	// Check if user has a pending invitation - if so, auto-accept them
	hasInvitation, err := queries.HasPendingInvitation(groupIDInt, userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to check pending invitations",
		})
		return
	}

	if hasInvitation {
		// User has an invitation, so add them directly as a member
		err = queries.AddGroupMember(groupIDInt, userID)
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to add you to the group",
			})
			return
		}

		// Delete all pending invitations for this user and group
		err = queries.DeletePendingInvitation(groupIDInt, userID)
		if err != nil {
			fmt.Printf("Failed to delete pending invitation: %v\n", err)
		}

		utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
			Success: true,
			Message: "You have been added to the group!",
		})
		return
	}

	// No invitation, send join request
	err = queries.CreateGroupJoinRequest(groupIDInt, userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to send join request",
		})
		return
	}

	// Get user details to send in notification
	user, err := queries.GetUserByID(userID)
	if err == nil {
		// Send WebSocket notification to group owner
		userPublic := &models.UserPublic{
			UserId:    user.ID,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Avatar:    user.Avatar,
			Nickname:  user.Nickname,
		}

		notification := models.NotificationMessage{
			Type: "group_join_request",
			Data: map[string]interface{}{
				"group_id":   group.ID,
				"group_name": group.Name,
				"user":       userPublic,
			},
			Timestamp: time.Now(),
		}

		fmt.Printf("Sending join request notification to owner ID %d for group %s\n", group.OwnerID, group.Name)
		ws.SendNotificationToUser(group.OwnerID, notification)
	}

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Join request sent successfully",
	})
}
