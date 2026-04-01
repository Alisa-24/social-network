package users

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
)

// GetPublicProfileHandler handles GET /api/users/{username}
// Returns the public profile of any user, including follow status and counts.
func GetPublicProfileHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	viewerID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false, Message: "Unauthorized",
		})
		return
	}

	targetUsername := r.PathValue("username")
	if targetUsername == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false, Message: "Username required",
		})
		return
	}

	target, err := queries.GetUserByIdentifier(targetUsername)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false, Message: "User not found",
		})
		return
	}

	followStatus, err := queries.GetFollowStatus(viewerID, target.ID)
	if err != nil {
		followStatus = "none"
	}

	followersCount, _ := queries.GetFollowersCount(target.ID)
	followingCount, _ := queries.GetFollowingCount(target.ID)

	isOwner := viewerID == target.ID
	isFollower := followStatus == "accepted"

	// Private account: only the owner or accepted followers can see full profile
	if !target.IsPublic && !isOwner && !isFollower {
		utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
			"success":        true,
			"userId":         target.ID,
			"username":       target.Username,
			"nickname":       target.Nickname,
			"avatar":         target.Avatar,
			"isPublic":       false,
			"isLocked":       true,
			"createdAt":      target.CreatedAt,
			"followStatus":   followStatus,
			"followersCount": followersCount,
			"followingCount": 0,
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":        true,
		"userId":         target.ID,
		"username":       target.Username,
		"firstName":      target.FirstName,
		"lastName":       target.LastName,
		"nickname":       target.Nickname,
		"avatar":         target.Avatar,
		"aboutMe":        target.AboutMe,
		"isPublic":       target.IsPublic,
		"isLocked":       false,
		"createdAt":      target.CreatedAt,
		"followStatus":   followStatus,
		"followersCount": followersCount,
		"followingCount": followingCount,
	})
}
