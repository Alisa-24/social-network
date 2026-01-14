package auth

import (
	"net/http"
	"time"

	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
)

func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.AuthResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Get session cookie
	cookie, err := r.Cookie("session_id")
	if err == nil {
		// Delete session from database
		queries.DeleteSession(cookie.Value)
	}

	// Clear session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		MaxAge:   -1,
		Expires:  time.Now().Add(-1 * time.Hour),
	})

	utils.RespondJSON(w, http.StatusOK, models.AuthResponse{
		Success: true,
		Message: "Logged out successfully",
	})
}
