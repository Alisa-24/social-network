package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"backend/internal/ws"
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

// GetJoinRequests retrieves all pending join requests for a group
func GetJoinRequests(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
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

	groupIDStr := r.URL.Query().Get("groupID")
	if groupIDStr == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Group ID is required",
		})
		return
	}

	groupID, err := strconv.ParseInt(groupIDStr, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid group ID",
		})
		return
	}

	// Verify user is the group owner
	group, err := queries.GetGroupByID(groupID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Group not found",
		})
		return
	}

	if group.OwnerID != userID {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "Only group owner can view join requests",
		})
		return
	}

	// Get pending join requests
	requests, err := queries.GetPendingJoinRequests(groupID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to retrieve join requests",
		})
		return
	}

	// Populate user details for each request
	for i := range requests {
		user, err := queries.GetUserByID(requests[i].UserID)
		if err == nil {
			requests[i].User = &models.UserPublic{
				UserId:    user.ID,
				FirstName: user.FirstName,
				LastName:  user.LastName,
				Avatar:    user.Avatar,
				Nickname:  user.Nickname,
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"requests": requests,
	})
}

// HandleJoinRequest approves or rejects a join request
func HandleJoinRequest(w http.ResponseWriter, r *http.Request) {
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

	requestIDStr := r.FormValue("requestID")
	action := r.FormValue("action") // "approve" or "reject"

	if requestIDStr == "" || action == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Request ID and action are required",
		})
		return
	}

	requestID, err := strconv.ParseInt(requestIDStr, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid request ID",
		})
		return
	}

	// Get the join request
	joinRequest, err := queries.GetJoinRequestByID(requestID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Join request not found",
		})
		return
	}

	// Verify user is the group owner
	group, err := queries.GetGroupByID(joinRequest.GroupID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Group not found",
		})
		return
	}

	if group.OwnerID != userID {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "Only group owner can handle join requests",
		})
		return
	}

	if joinRequest.Status != "pending" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "This request has already been processed",
		})
		return
	}

	var message string

	if action == "approve" {
		// Add user to group
		err = queries.AddGroupMember(joinRequest.GroupID, joinRequest.UserID)
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to add member to group",
			})
			return
		}
		message = "Join request approved"

		// Send notification to the user who requested
		notification := models.NotificationMessage{
			Type: "join_request_approved",
			Data: map[string]interface{}{
				"group_id":   group.ID,
				"group_name": group.Name,
				"message":    "Your request to join " + group.Name + " has been approved",
			},
			Timestamp: time.Now(),
		}
		ws.SendNotificationToUser(joinRequest.UserID, notification)

	} else if action == "reject" {
		message = "Join request rejected"

		// Send notification to the user who requested
		notification := models.NotificationMessage{
			Type: "join_request_rejected",
			Data: map[string]interface{}{
				"group_id":   group.ID,
				"group_name": group.Name,
				"message":    "Your request to join " + group.Name + " has been rejected",
			},
			Timestamp: time.Now(),
		}
		ws.SendNotificationToUser(joinRequest.UserID, notification)

	} else {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid action. Use 'approve' or 'reject'",
		})
		return
	}

	// Delete the request after processing
	err = queries.DeleteJoinRequest(requestID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to delete request",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: message,
	})
}
