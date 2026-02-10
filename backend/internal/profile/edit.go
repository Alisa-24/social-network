package profile

import (
	"backend/internal/auth"
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"os"
	"path/filepath"

	"golang.org/x/crypto/bcrypt"
)

func EditProfile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		w.Header().Set("Content-Type", "application/json")
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// Get user ID from context
	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	// Parse multipart form (up to 10MB)
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		println("Failed to parse form:", err.Error())
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Failed to parse form data",
		})
		return
	}

	// Extract form fields
	firstName := r.FormValue("firstName")
	lastName := r.FormValue("lastName")
	username := r.FormValue("username")
	nickname := r.FormValue("nickname")
	email := r.FormValue("email")
	dateOfBirth := r.FormValue("dateOfBirth")
	aboutMe := r.FormValue("aboutMe")
	password := r.FormValue("password")
	isPublicStr := r.FormValue("isPublic")
	isPublic := isPublicStr == "true"


	// Validate required fields
	var validationErrors []auth.ValidationError

	if err := auth.ValidateFirstName(firstName); err != nil {
		validationErrors = append(validationErrors, *err)
	}
	if err := auth.ValidateLastName(lastName); err != nil {
		validationErrors = append(validationErrors, *err)
	}
	if err := auth.ValidateUsername(username); err != nil {
		validationErrors = append(validationErrors, *err)
	}
	if err := auth.ValidateEmail(email); err != nil {
		validationErrors = append(validationErrors, *err)
	}
	if err := auth.ValidateDateOfBirth(dateOfBirth); err != nil {
		validationErrors = append(validationErrors, *err)
	}
	if err := auth.ValidateNickname(nickname); err != nil {
		validationErrors = append(validationErrors, *err)
	}
	if err := auth.ValidateAboutMe(aboutMe); err != nil {
		validationErrors = append(validationErrors, *err)
	}

	if len(validationErrors) > 0 {
		utils.RespondJSON(w, http.StatusBadRequest, map[string]interface{}{
			"success": false,
			"message": "Validation failed",
			"errors":  validationErrors,
		})
		return
	}

	// Check if username or email already taken by another user
	if existingUser, err := queries.GetUserByIdentifier(username); err == nil && existingUser.ID != userID {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Username is already taken",
		})
		return
	}

	if existingUser, err := queries.GetUserByIdentifier(email); err == nil && existingUser.ID != userID {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Email is already taken",
		})
		return
	}

	// Get current user data
	currentUser, err := queries.GetUserByID(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "User not found",
		})
		return
	}

	// Handle avatar upload
	avatarPath := currentUser.Avatar
	file, header, err := r.FormFile("avatar")
	if err == nil {
		defer file.Close()

		// Validate file size (max 5MB)
		if header.Size > 5<<20 {
			utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
				Success: false,
				Message: "Image size must be less than 5MB",
			})
			return
		}

		// Delete old avatar if exists
		if currentUser.Avatar != "" {
			oldPath := filepath.Join(".", currentUser.Avatar)
			os.Remove(oldPath) // Ignore errors
		}

		// Save uploaded file using utils function
		savedPath, err := utils.SaveUploadedFile(file, header, "avatars")
		if err != nil {
			utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
				Success: false,
				Message: err.Error(),
			})
			return
		}

		avatarPath = savedPath
	}

	// Update user
	updateReq := models.UpdateUserRequest{
		FirstName:   firstName,
		LastName:    lastName,
		Username:    username,
		Nickname:    nickname,
		Email:       email,
		DateOfBirth: dateOfBirth,
		AboutMe:     aboutMe,
		IsPublic:    isPublic,
		Avatar:      avatarPath,
	}

	if err := queries.UpdateUser(userID, updateReq); err != nil {
		println("UpdateUser failed:", err.Error())
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to update profile: " + err.Error(),
		})
		return
	}

	println("Profile updated successfully for user:", userID)

	// Update password if provided
	if password != "" {
		if err := auth.ValidatePassword(password); err != nil {
			utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
				Success: false,
				Message: err.Message,
			})
			return
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to hash password",
			})
			return
		}

		if err := queries.UpdateUserPassword(userID, string(hashedPassword)); err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to update password",
			})
			return
		}
	}

	// Get updated user
	updatedUser, err := queries.GetUserByID(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to retrieve updated user",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Profile updated successfully",
		"user":    updatedUser,
	})
}
