package users

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strings"
)

// SearchUsersHandler handles GET /api/users/search?q=<term>
func SearchUsersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get session cookie to identify the user (same pattern as GetGroups)
	cookie, err := r.Cookie("session_id")
	if err != nil {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false, Message: "Not authenticated",
		})
		return
	}

	session, err := queries.GetSessionByID(cookie.Value)
	if err != nil {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false, Message: "Invalid session",
		})
		return
	}

	term := strings.TrimSpace(r.URL.Query().Get("q"))

	users, err := queries.SearchUsers(term, session.UserID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false, Message: "Failed to search users",
		})
		return
	}

	if users == nil {
		users = []models.UserSearchResult{}
	}

	utils.RespondJSON(w, http.StatusOK, models.SearchUsersResponse{
		Success: true,
		Users:   users,
	})
}
