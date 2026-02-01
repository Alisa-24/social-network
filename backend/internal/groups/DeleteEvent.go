package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"backend/internal/ws"
	"net/http"
	"os"
	"strconv"
)

func DeleteAnEvent(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodDelete {
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

	// Extract event ID from URL path: /api/groups/events/{id}
	idStr := r.PathValue("id")
	if idStr == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Missing event ID",
		})
		return
	}

	eventID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid event ID",
		})
		return
	}

	// Get group ID before deleting to broadcast
	groupID, err := queries.GetGroupIDByEventID(eventID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Event not found",
		})
		return
	}

	// Get the event owner
	eventOwnerID, err := queries.GetEventOwnerID(eventID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Event not found",
		})
		return
	}
	//get the group owner id
	GroupOwnerID, err := queries.GetGroupOwnerIDByEventID(eventID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Group not found",
		})
		return
	}

	// Check if the user is the event owner or group owner
	if eventOwnerID != int64(userID) && GroupOwnerID != int64(userID) {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "Forbidden: You do not own this event",
		})
		return
	}

	imagePath, err := queries.GetEventImagePath(eventID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to get event image path",
		})
		return
	}

	err = queries.DeleteGroupEvent(eventID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to delete event",
		})
		return
	}

	// delete image if exists
	if imagePath != "" {
		err = os.Remove(imagePath)
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to delete event image",
			})
			return
		}
	}

	// Broadcast the deletion
	ws.BroadcastToGroup(groupID, "event_deleted", map[string]interface{}{
		"eventId": eventID,
		"groupId": groupID,
	})

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Event deleted successfully",
	})
}
