package auth

import (
	"database/sql"
	"net/http"

	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
)

func MeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.AuthResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Get session cookie
	cookie, err := r.Cookie("session_id")
	if err != nil {
		utils.RespondJSON(w, http.StatusUnauthorized, models.AuthResponse{
			Success: false,
			Message: "Not authenticated",
		})
		return
	}

	// Get session from database
	session, err := queries.GetSessionByID(cookie.Value)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.RespondJSON(w, http.StatusUnauthorized, models.AuthResponse{
				Success: false,
				Message: "Invalid session",
			})
			return
		}
		utils.RespondJSON(w, http.StatusInternalServerError, models.AuthResponse{
			Success: false,
			Message: "Failed to verify session",
		})
		return
	}

	// Get user by ID
	user, err := queries.GetUserByID(session.UserID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.AuthResponse{
			Success: false,
			Message: "Failed to get user",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, models.AuthResponse{
		Success: true,
		Message: "User retrieved successfully",
		User: &models.UserPublic{
			UserId:      user.ID,
			Email:       user.Email,
			FirstName:   user.FirstName,
			LastName:    user.LastName,
			DateOfBirth: user.DateOfBirth,
			Nickname:    user.Nickname,
			Avatar:      user.Avatar,
			AboutMe:     user.AboutMe,
			CreatedAt:   user.CreatedAt,
		},
	})
}
