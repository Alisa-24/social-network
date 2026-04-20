package follow

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	activity "backend/internal/notifications"
	"backend/internal/utils"
	"backend/internal/ws"
	"fmt"
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

	message := activity.FollowAcceptedForSender(target.Username).Message
	if status == "pending" {
		message = activity.FollowRequestSent(target.Username).Message
	}

	// Notify the target user in real-time
	follower, err := queries.GetUserByID(currentUserID)
	if err == nil {
		var senderText activity.RecentActivityText
		var receiverText activity.RecentActivityText
		if status == "pending" {
			senderText = activity.FollowRequestSent(target.Username)
			receiverText = activity.FollowRequestReceived(follower.Username)
			_, _ = activity.StoreRecentActivity(currentUserID, &target.ID, "follow_request", senderText, map[string]interface{}{
				"target_username": target.Username,
				"status":          status,
			})
			_ = activity.NotifyRecentActivity(target.ID, &currentUserID, "follow_request", receiverText, map[string]interface{}{
				"sender_username": follower.Username,
				"status":          status,
			})
		} else {
			senderText = activity.FollowAcceptedForSender(target.Username)
			receiverText = activity.FollowAcceptedForReceiver(follower.Username)
			_, _ = activity.StoreRecentActivity(currentUserID, &target.ID, "follow_update", senderText, map[string]interface{}{
				"target_username": target.Username,
				"status":          status,
			})
			_ = activity.NotifyRecentActivity(target.ID, &currentUserID, "follow_update", receiverText, map[string]interface{}{
				"sender_username": follower.Username,
				"status":          status,
			})
		}
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

// GetFollowRequestsHandler handles GET /api/follow/requests
func GetFollowRequestsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{Success: false, Message: "Unauthorized"})
		return
	}
	userRequests, err := queries.GetPendingFollowRequests(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to fetch requests"})
		return
	}

	// Transform UserSearchResult into the expected response structure
	type FollowRequest struct {
		ID          int                     `json:"id"`
		RequesterID int                     `json:"requester_id"`
		CreatedAt   string                  `json:"created_at"`
		Requester   models.UserSearchResult `json:"requester"`
	}

	var requests []FollowRequest
	for _, requester := range userRequests {
		requests = append(requests, FollowRequest{
			ID:          requester.UserID, // Use userId as the request ID (since request is identified by follower_id)
			RequesterID: requester.UserID,
			CreatedAt:   time.Now().Format(time.RFC3339), // Placeholder - ideally we'd get this from DB
			Requester:   requester,
		})
	}

	if requests == nil {
		requests = []FollowRequest{}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{"success": true, "requests": requests})
}

// HandleFollowRequestHandler handles POST /api/follow/requests/handle
// Body: request_id (follower_id) and action (accept|decline)
func HandleFollowRequestHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{Success: false, Message: "Unauthorized"})
		return
	}

	// Parse form data
	if err := r.ParseForm(); err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Invalid request"})
		return
	}

	requestIDStr := r.FormValue("request_id")
	action := r.FormValue("action")

	if requestIDStr == "" || (action != "accept" && action != "decline") {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Invalid request"})
		return
	}

	requesterID := 0
	if _, err := fmt.Sscanf(requestIDStr, "%d", &requesterID); err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Invalid request ID"})
		return
	}

	// Verify the follow request exists
	requester, err := queries.GetUserByID(requesterID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{Success: false, Message: "User not found"})
		return
	}

	// Handle the request
	if action == "accept" {
		err = queries.AcceptFollowRequest(requesterID, userID)
	} else {
		err = queries.DeclineFollowRequest(requesterID, userID)
	}

	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to handle request"})
		return
	}

	// Notify the requester of the decision
	target, err := queries.GetUserByID(userID)
	if err == nil {
		status := "accepted"
		if action == "decline" {
			status = "none"
		}
		ws.SendNotificationToUser(requesterID, models.NotificationMessage{
			Type: "follow_update",
			Data: map[string]interface{}{
				"followerId":        requesterID,
				"followerUsername":  requester.Username,
				"followerFirstName": requester.FirstName,
				"followerLastName":  requester.LastName,
				"followerAvatar":    requester.Avatar,
				"status":            status,
				"targetUsername":    target.Username,
				"action":            action,
			},
			Timestamp: time.Now(),
		})
		ws.SendNotificationToUser(userID, models.NotificationMessage{
			Type: "follow_update",
			Data: map[string]interface{}{
				"followerId":        requesterID,
				"followerUsername":  requester.Username,
				"followerFirstName": requester.FirstName,
				"followerLastName":  requester.LastName,
				"followerAvatar":    requester.Avatar,
				"status":            status,
				"message":           activity.FollowAcceptedForReceiver(requester.Username).Message,
				"subtitle":          activity.FollowAcceptedForReceiver(requester.Username).Subtitle,
			},
			Timestamp: time.Now(),
		})

		if action == "accept" {
			_, _ = activity.StoreRecentActivity(requesterID, &userID, "follow_update", activity.FollowAcceptedForSender(target.Username), map[string]interface{}{
				"target_username": target.Username,
				"status":          "accepted",
			})
			_ = activity.NotifyRecentActivity(userID, &requesterID, "follow_update", activity.FollowAcceptedForReceiver(requester.Username), map[string]interface{}{
				"sender_username": requester.Username,
				"status":          "accepted",
			})
		} else {
			declinedText := activity.RecentActivityText{
				Message:  "Your follow request was declined",
				Subtitle: "Follow Request",
			}
			_, _ = activity.StoreRecentActivity(requesterID, &userID, "follow_update", declinedText, map[string]interface{}{
				"target_username": target.Username,
				"status":          "declined",
			})
		}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{"success": true, "action": action})
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

// GetMyFollowersHandler handles GET /api/follow/followers
// Returns the list of users who follow the current authenticated user (accepted only).
func GetMyFollowersHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{Success: false, Message: "Unauthorized"})
		return
	}

	users, err := queries.GetFollowersWithDetails(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to fetch followers"})
		return
	}

	type FollowerInfo struct {
		ID        int    `json:"id"`
		Username  string `json:"username"`
		FirstName string `json:"firstName"`
		LastName  string `json:"lastName"`
		Avatar    string `json:"avatar"`
	}

	result := make([]FollowerInfo, 0, len(users))
	for _, u := range users {
		result = append(result, FollowerInfo{
			ID:        u.ID,
			Username:  u.Username,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			Avatar:    u.Avatar,
		})
	}

	utils.RespondJSON(w, http.StatusOK, map[string]any{
		"success":   true,
		"followers": result,
	})
}
