package follow

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"backend/internal/ws"
	"net/http"
	"time"
)

// FollowHandler handles POST /api/follow/{username}
func FollowHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUserID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{Success: false, Message: "Unauthorized"})
		return
	}

	targetUsername := r.PathValue("username")
	if targetUsername == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Username required"})
		return
	}

	target, err := queries.GetUserByIdentifier(targetUsername)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{Success: false, Message: "User not found"})
		return
	}

	if target.ID == currentUserID {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Cannot follow yourself"})
		return
	}

	status, err := queries.FollowUser(currentUserID, target.ID, target.IsPublic)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to follow user"})
		return
	}

	message := "Now following"
	if status == "pending" {
		message = "Follow request sent"
	}

	// Notify the target user in real-time
	follower, err := queries.GetUserByID(currentUserID)
	if err == nil {
		ws.SendNotificationToUser(target.ID, models.NotificationMessage{
			Type: "follow_update",
			Data: map[string]interface{}{
				"followerId":        follower.ID,
				"followerUsername":  follower.Username,
				"followerFirstName": follower.FirstName,
				"followerLastName":  follower.LastName,
				"followerAvatar":    follower.Avatar,
				"status":            status,
			},
			Timestamp: time.Now(),
		})
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"status":  status,
		"message": message,
	})
}

// UnfollowHandler handles DELETE /api/follow/{username}
func UnfollowHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	currentUserID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{Success: false, Message: "Unauthorized"})
		return
	}

	targetUsername := r.PathValue("username")
	if targetUsername == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Username required"})
		return
	}

	target, err := queries.GetUserByIdentifier(targetUsername)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{Success: false, Message: "User not found"})
		return
	}

	if err := queries.UnfollowUser(currentUserID, target.ID); err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to unfollow user"})
		return
	}

	// Notify the target user in real-time
	follower, err := queries.GetUserByID(currentUserID)
	if err == nil {
		ws.SendNotificationToUser(target.ID, models.NotificationMessage{
			Type: "follow_update",
			Data: map[string]interface{}{
				"followerId":        follower.ID,
				"followerUsername":  follower.Username,
				"followerFirstName": follower.FirstName,
				"followerLastName":  follower.LastName,
				"followerAvatar":    follower.Avatar,
				"status":            "none",
			},
			Timestamp: time.Now(),
		})
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"status":  "none",
		"message": "Unfollowed",
	})
}

// GetFollowersHandler handles GET /api/users/{username}/followers
func GetFollowersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	viewerID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{Success: false, Message: "Unauthorized"})
		return
	}

	targetUsername := r.PathValue("username")
	if targetUsername == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Username required"})
		return
	}

	target, err := queries.GetUserByIdentifier(targetUsername)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{Success: false, Message: "User not found"})
		return
	}

	followers, err := queries.GetFollowersList(target.ID, viewerID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to fetch followers"})
		return
	}

	if followers == nil {
		followers = []models.UserSearchResult{}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":   true,
		"followers": followers,
		"count":     len(followers),
	})
}

// GetFollowingListHandler handles GET /api/users/{username}/following
func GetFollowingListHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	viewerID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{Success: false, Message: "Unauthorized"})
		return
	}

	targetUsername := r.PathValue("username")
	if targetUsername == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Username required"})
		return
	}

	target, err := queries.GetUserByIdentifier(targetUsername)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{Success: false, Message: "User not found"})
		return
	}

	following, err := queries.GetFollowingList(target.ID, viewerID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to fetch following list"})
		return
	}

	if following == nil {
		following = []models.UserSearchResult{}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":   true,
		"following": following,
		"count":     len(following),
	})
}
