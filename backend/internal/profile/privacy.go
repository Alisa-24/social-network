package profile

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"backend/internal/ws"
	"encoding/json"
	"net/http"
	"time"
)

// TogglePrivacyHandler handles PATCH /api/profile/privacy
// Body: { "isPublic": true | false }
func TogglePrivacyHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{Success: false, Message: "Unauthorized"})
		return
	}

	var body struct {
		IsPublic bool `json:"isPublic"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Invalid request body"})
		return
	}

	currentUser, err := queries.GetUserByID(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{Success: false, Message: "User not found"})
		return
	}

	// Update is_public in the database
	if err := queries.UpdateUserPrivacy(userID, body.IsPublic); err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to update privacy"})
		return
	}

	// Switching private → public: auto-accept all pending follow requests
	var autoAccepted []models.UserSearchResult
	if body.IsPublic && !currentUser.IsPublic {
		autoAccepted, _ = queries.GetPendingFollowRequests(userID)
		if err := queries.AcceptAllPendingFollowers(userID); err != nil {
			println("AcceptAllPendingFollowers failed:", err.Error())
		}
	}

	updatedUser, err := queries.GetUserByID(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to retrieve updated user"})
		return
	}

	// Notify each auto-accepted follower so their UI flips to "Following"
	for _, follower := range autoAccepted {
		ws.SendNotificationToUser(follower.UserID, models.NotificationMessage{
			Type: "follow_update",
			Data: map[string]interface{}{
				"followerId":       follower.UserID,
				"followerUsername": follower.Username,
				"status":           "accepted",
				"targetUsername":   updatedUser.Username,
			},
			Timestamp: time.Now(),
		})
	}

	// Broadcast privacy change to all connected users
	go func() {
		ws.BroadcastToAll(models.NotificationMessage{
			Type: "privacy_changed",
			Data: map[string]interface{}{
				"userId":   updatedUser.ID,
				"username": updatedUser.Username,
				"isPublic": updatedUser.IsPublic,
			},
			Timestamp: time.Now(),
		})
	}()

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Privacy updated",
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
