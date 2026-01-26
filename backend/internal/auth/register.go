package auth

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"

	"golang.org/x/crypto/bcrypt"
)

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Parse multipart form
	if err := r.ParseMultipartForm(5 << 20); err != nil { // 5 MB max
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Avatar file too large",
		})
		return
	}

	// Extract form values
	email := strings.TrimSpace(r.FormValue("email"))
	password := r.FormValue("password")
	firstName := strings.TrimSpace(r.FormValue("firstName"))
	lastName := strings.TrimSpace(r.FormValue("lastName"))
	dateOfBirth := r.FormValue("dateOfBirth")
	nickname := strings.TrimSpace(r.FormValue("nickname"))
	aboutMe := strings.TrimSpace(r.FormValue("aboutMe"))

	// Handle avatar file upload
	var avatarPath string
	file, handler, err := r.FormFile("avatar")
	if err == nil {
		defer file.Close()

		// Validate file type (must be specific image types)
		contentType := handler.Header.Get("Content-Type")
		allowedTypes := map[string]bool{
			"image/jpeg": true,
			"image/jpg":  true,
			"image/png":  true,
			"image/webp": true,
			"image/gif":  true,
		}

		if !allowedTypes[contentType] {
			utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
				Success: false,
				Message: "Avatar must be JPEG, PNG, WebP, or GIF",
			})
			return
		}

		// Generate unique filename
		ext := filepath.Ext(handler.Filename)
		filename := fmt.Sprintf("%d_%s%s", time.Now().Unix(), utils.GenerateSessionID(), ext)
		avatarPath = "/uploads/avatars/" + filename

		// Ensure uploads/avatars directory exists
		if err := os.MkdirAll("uploads/avatars", 0755); err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to create uploads directory",
			})
			return
		}

		// Save file to disk
		dst, err := os.Create(filepath.Join("uploads", "avatars", filename))
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to save avatar",
			})
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to save avatar",
			})
			return
		}
	}
	// If no file uploaded or error reading file (other than missing), avatarPath remains empty
	// Validate all fields using the validation functions
	validationResult := ValidateRegistrationRequest(
		email, password, firstName, lastName, dateOfBirth, nickname, aboutMe,
	)

	if !validationResult.IsValid {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: validationResult.AllErrors(),
		})
		return
	}

	// Check email uniqueness
	exists, err := queries.EmailExists(email)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to validate email",
		})
		return
	}
	if exists {
		utils.RespondJSON(w, http.StatusConflict, models.GenericResponse{
			Success: false,
			Message: "Email is already registered",
		})
		return
	}

	// Check nickname uniqueness if provided
	if nickname != "" {
		exists, err := queries.NicknameExists(nickname)
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to validate nickname",
			})
			return
		}
		if exists {
			utils.RespondJSON(w, http.StatusConflict, models.GenericResponse{
				Success: false,
				Message: "Nickname is already taken",
			})
			return
		}
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to secure password",
		})
		return
	}

	// Create user
	err = queries.CreateUser(models.CreateUserParams{
		Email:        email,
		PasswordHash: string(hashedPassword),
		FirstName:    firstName,
		LastName:     lastName,
		DateOfBirth:  dateOfBirth,
		Nickname:     nickname,
		Avatar:       avatarPath,
		AboutMe:      aboutMe,
	})
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to create user",
		})
		return
	}

	// Get the newly created user
	dbUser, err := queries.GetUserByEmail(email)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to retrieve user",
		})
		return
	}

	browserFingerprint := utils.FingerprintFromRequest(r)
	// Create session for the new user
	sessionID, err := queries.CreateSession(dbUser.ID, browserFingerprint)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
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
		Secure:   false, // Set to true in production with HTTPS
		SameSite: http.SameSiteLaxMode,
		MaxAge:   30 * 24 * 60 * 60, // 30 days in seconds
		Expires:  time.Now().Add(30 * 24 * time.Hour),
	})

	// Respond WITHOUT sensitive fields
	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Registration successful",
		User: &models.UserPublic{
			UserId:      dbUser.ID,
			Email:       dbUser.Email,
			FirstName:   dbUser.FirstName,
			LastName:    dbUser.LastName,
			DateOfBirth: dbUser.DateOfBirth,
			Nickname:    dbUser.Nickname,
			Avatar:      dbUser.Avatar,
			AboutMe:     dbUser.AboutMe,
			CreatedAt:   dbUser.CreatedAt,
		},
	})
}
