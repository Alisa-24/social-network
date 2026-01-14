package auth

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"fmt"
	"time"

	"backend/internal/models"
	"backend/internal/db/queries"
	"backend/internal/utils"

	"golang.org/x/crypto/bcrypt"
)

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.AuthResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.AuthResponse{
			Success: false,
			Message: "Invalid request body",
		})
		return
	}

	if req.Email == "" || req.Password == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.AuthResponse{
			Success: false,
			Message: "Email and password are required",
		})
		return
	}

	// Get user by email
	dbUser, err := queries.GetUserByEmail(req.Email)
	if err != nil {
		fmt.Printf("GetUserByEmail error: %v (type: %T)\n", err, err)
		if err == sql.ErrNoRows {
			utils.RespondJSON(w, http.StatusUnauthorized, models.AuthResponse{
				Success: false,
				Message: "Invalid email or password",
			})
			return
		}
		fmt.Printf("Database error details: %v\n", err)
		utils.RespondJSON(w, http.StatusInternalServerError, models.AuthResponse{
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
		utils.RespondJSON(w, http.StatusUnauthorized, models.AuthResponse{
			Success: false,
			Message: "Invalid email or password",
		})
		return
	}

	// Check for existing valid session
	sessionID, err := queries.GetValidSessionByUserID(dbUser.ID)
	if err == sql.ErrNoRows {
		// No valid session exists, create a new one
		sessionID, err = queries.CreateSession(dbUser.ID)
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.AuthResponse{
				Success: false,
				Message: "Failed to create session",
			})
			return
		}
		fmt.Printf("Created new session for user %d: %s\n", dbUser.ID, sessionID)
	} else if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.AuthResponse{
			Success: false,
			Message: "Failed to check session",
		})
		return
	} else {
		fmt.Printf("Reusing existing session for user %d: %s\n", dbUser.ID, sessionID)
	}

	// Set session cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
		MaxAge:   30 * 24 * 60 * 60, // 30 days in seconds
		Expires:  time.Now().Add(30 * 24 * time.Hour),
	})

	// Respond WITHOUT sensitive fields
	utils.RespondJSON(w, http.StatusOK, models.AuthResponse{
		Success: true,
		Message: "Login successful",
		User: &models.UserPublic{
			Email:     dbUser.Email,
			FirstName: dbUser.FirstName,
			LastName:  dbUser.LastName,
			Nickname:  dbUser.Nickname,
			Avatar:    dbUser.Avatar,
		},
	})
	return
}
