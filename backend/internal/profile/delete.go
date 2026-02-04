package profile

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"os"
	"path/filepath"
)

func DeleteProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get user ID from context
	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	// Get user data for cleanup
	user, err := queries.GetUserByID(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "User not found",
		})
		return
	}

	// Delete avatar file if exists
	if user.Avatar != "" {
		avatarPath := filepath.Join(".", user.Avatar)
		os.Remove(avatarPath) // Ignore errors
	}

	// Delete user from database (cascading deletes should handle related data)
	_, err = queries.DB.Exec("DELETE FROM users WHERE id = ?", userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to delete account",
		})
		return
	}

	// Clear session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	})

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Account deleted successfully",
	})
}
