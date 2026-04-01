package users

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
)

func GetUserStatsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	username := r.PathValue("username")
	target, err := queries.GetUserByIdentifier(username)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false, Message: "User not found",
		})
		return
	}

	postsCount, likesReceived, commentsReceived, err := queries.GetUserStats(target.ID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false, Message: "Failed to fetch stats",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":          true,
		"postsCount":       postsCount,
		"likesReceived":    likesReceived,
		"commentsReceived": commentsReceived,
	})
}
