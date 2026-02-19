package auth

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"

	"golang.org/x/crypto/bcrypt"
)

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid request body",
		})
		return
	}

	if req.Identifier == "" || req.Password == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Identifier and password are required",
		})
		return
	}

	// Get user by email or username
	dbUser, err := queries.GetUserByIdentifier(req.Identifier)
	if err != nil {
		if err == sql.ErrNoRows {
			utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
				Success: false,
				Message: "Invalid identifier or password",
			})
			return
		}
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to retrieve user: %v", err),
		})
		return
	}

	// Compare password
	if err := bcrypt.CompareHashAndPassword(
		[]byte(dbUser.Password),
		[]byte(req.Password),
	); err != nil {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Invalid identifier or password",
		})
		return
	}

	//get user's browser fingerprint
	browserFingerprint := utils.FingerprintFromRequest(r)
	// Create session
	sessionID, err := queries.CreateSession(dbUser.ID, browserFingerprint)
	if err != nil {
		utils.RespondJSON(
			w,
			http.StatusInternalServerError,
			models.GenericResponse{Success: false,
				Message: "Failed to create session",
			})
		return
	}

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,                // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode, // Lax works for localhost/same-origin
		MaxAge:   365 * 24 * 60 * 60,   // 1 year
		Expires:  time.Now().Add(365 * 24 * time.Hour),
	})

	// Respond WITHOUT sensitive fields
	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Login successful",
		User: &models.UserPublic{
			UserId:      dbUser.ID,
			Email:       dbUser.Email,
			FirstName:   dbUser.FirstName,
			LastName:    dbUser.LastName,
			Username:    dbUser.Username,
			DateOfBirth: dbUser.DateOfBirth,
			Nickname:    dbUser.Nickname,
			Avatar:      dbUser.Avatar,
			AboutMe:     dbUser.AboutMe,
			CreatedAt:   dbUser.CreatedAt,
		},
	})
}
