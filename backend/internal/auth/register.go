package auth

import (
	"net/http"
	"strings"
	"time"
	"fmt"

	"backend/internal/models"
	"backend/internal/db/queries"
	"backend/internal/utils"

	"golang.org/x/crypto/bcrypt"
)

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.AuthResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Parse multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10 MB max
		utils.RespondJSON(w, http.StatusBadRequest, models.AuthResponse{
			Success: false,
			Message: "Invalid form data",
		})
		return
	}

	// Extract form values
	req := models.RegisterRequest{
		Email:       strings.TrimSpace(r.FormValue("email")),
		Password:    r.FormValue("password"),
		FirstName:   strings.TrimSpace(r.FormValue("firstName")),
		LastName:    strings.TrimSpace(r.FormValue("lastName")),
		DateOfBirth: r.FormValue("dateOfBirth"),
		Nickname:    strings.TrimSpace(r.FormValue("nickname")),
		AboutMe:     strings.TrimSpace(r.FormValue("aboutMe")),
	}

	// Validate required fields
	if req.Email == "" || req.Password == "" ||
		req.FirstName == "" || req.LastName == "" || req.DateOfBirth == "" {

		utils.RespondJSON(w, http.StatusBadRequest, models.AuthResponse{
			Success: false,
			Message: "All required fields must be provided",
		})
		return
	}

	// Password policy
	if len(req.Password) < 8 {
		utils.RespondJSON(w, http.StatusBadRequest, models.AuthResponse{
			Success: false,
			Message: "Password must be at least 8 characters long",
		})
		return
	}

	// Check email uniqueness
	exists, err := queries.EmailExists(req.Email)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.AuthResponse{
			Success: false,
			Message: "Failed to validate email",
		})
		return
	}
	if exists {
		utils.RespondJSON(w, http.StatusConflict, models.AuthResponse{
			Success: false,
			Message: "Email is already registered",
		})
		return
	}
	// Check nickname uniqueness if provided
	if req.Nickname != "" {
		exists, err := queries.NicknameExists(req.Nickname)
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.AuthResponse{
				Success: false,
				Message: "Failed to validate nickname",
			})
			return
		}
		if exists {
			utils.RespondJSON(w, http.StatusConflict, models.AuthResponse{
				Success: false,
				Message: "Nickname is already taken",
			})
			return
		}
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(req.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.AuthResponse{
			Success: false,
			Message: "Failed to secure password",
		})
		return
	}

	// Create user
	err = queries.CreateUser(models.CreateUserParams{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		DateOfBirth:  req.DateOfBirth,
		Nickname:     req.Nickname,
		AboutMe:      req.AboutMe,
	})
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.AuthResponse{
			Success: false,
			Message: "Failed to create user",
		})
		return
	}

	// Get the newly created user
	dbUser, err := queries.GetUserByEmail(req.Email)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.AuthResponse{
			Success: false,
			Message: "Failed to retrieve user",
		})
		return
	}

	// Create session for the new user
	sessionID, err := queries.CreateSession(dbUser.ID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.AuthResponse{
			Success: false,
			Message: "Failed to create session",
		})
		return
	}
	fmt.Printf("Created new session for user %d: %s\n", dbUser.ID, sessionID)

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
		Message: "Registration successful",
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
