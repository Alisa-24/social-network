package users

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
)

// GetContactsHandler handles GET /api/users/contacts
// Returns all users that the authenticated user follows OR who follow them (accepted status).
func GetContactsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok || userID == 0 {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false, Message: "Not authenticated",
		})
		return
	}

	contacts, err := queries.GetFollowContacts(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false, Message: "Failed to fetch contacts",
		})
		return
	}

	if contacts == nil {
		contacts = []models.UserSearchResult{}
	}

	utils.RespondJSON(w, http.StatusOK, models.SearchUsersResponse{
		Success: true,
		Users:   contacts,
	})
}
