package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strconv"
)

func GetGroupChatMessages(w http.ResponseWriter, r *http.Request) {
	parts := utils.GetPathParts(r.URL.Path)
	// parts[0] = api, [1] = groups, [2] = {id}, [3] = messages

	if len(parts) < 4 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Invalid path"})
		return
	}

	groupIDStr := parts[2]
	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Invalid group ID"})
		return
	}

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0

	if limitStr != "" {
		l, err := strconv.Atoi(limitStr)
		if err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr != "" {
		o, err := strconv.Atoi(offsetStr)
		if err == nil && o >= 0 {
			offset = o
		}
	}

	messages, err := queries.GetGroupChatMessages(groupID, limit, offset)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to fetch messages"})
		return
	}

	// If nil, return empty array
	if messages == nil {
		messages = []models.GroupChatMessage{}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"messages": messages,
	})
}
