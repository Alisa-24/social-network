package otp

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"time"
)

// generateCode returns a random 6-digit string.
func generateCode() string {
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}

// SendOTPHandler handles POST /api/otp/send
// Generates a 6-digit OTP, stores it, and emails it to the user.
func SendOTPHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{Success: false, Message: "Unauthorized"})
		return
	}

	user, err := queries.GetUserByID(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "User not found"})
		return
	}

	if user.IsVerified {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Account already verified"})
		return
	}

	code := generateCode()
	expiresAt := time.Now().Add(10 * time.Minute)

	if err := queries.SaveOTP(userID, code, expiresAt); err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to save OTP"})
		return
	}

	displayName := user.FirstName
	if displayName == "" {
		displayName = user.Username
	}

	if err := utils.SendOTPEmail(user.Email, displayName, code); err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to send email: " + err.Error()})
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Verification code sent to " + user.Email,
	})
}

// VerifyOTPHandler handles POST /api/otp/verify
// Body: { "code": "123456" }
func VerifyOTPHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{Success: false, Message: "Unauthorized"})
		return
	}

	var body struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Code == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Code is required"})
		return
	}

	valid, err := queries.VerifyOTP(userID, body.Code)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Verification error"})
		return
	}
	if !valid {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Invalid or expired code"})
		return
	}

	if err := queries.MarkUserVerified(userID); err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to verify account"})
		return
	}

	queries.DeleteOTP(userID)

	updatedUser, err := queries.GetUserByID(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusOK, map[string]interface{}{"success": true, "message": "Account verified!"})
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Account verified!",
		"user": models.UserPublic{
			UserId:      updatedUser.ID,
			Email:       updatedUser.Email,
			Username:    updatedUser.Username,
			FirstName:   updatedUser.FirstName,
			LastName:    updatedUser.LastName,
			DateOfBirth: updatedUser.DateOfBirth,
			Nickname:    updatedUser.Nickname,
			Avatar:      updatedUser.Avatar,
			AboutMe:     updatedUser.AboutMe,
			IsPublic:    updatedUser.IsPublic,
			IsVerified:  updatedUser.IsVerified,
			CreatedAt:   updatedUser.CreatedAt,
		},
	})
}
