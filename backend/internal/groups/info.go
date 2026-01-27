package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

func GetGroupInfo(w http.ResponseWriter, r *http.Request) {
	// Extract group ID from URL
	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 4 {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	groupID, err := strconv.ParseInt(pathParts[3], 10, 64)
	if err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	// Get current user ID from session
	userID, ok := r.Context().Value("userID").(int)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get group basic info
	group, err := queries.GetGroupByID(groupID)
	if err != nil {
		http.Error(w, "Group not found", http.StatusNotFound)
		return
	}

	// Check if user is a member
	isMember, err := queries.IsGroupMember(groupID, userID)
	if err != nil {
		http.Error(w, "Error checking membership", http.StatusInternalServerError)
		return
	}

	// Only allow members to view group details
	if !isMember {
		http.Error(w, "You must be a member to view this group", http.StatusForbidden)
		return
	}

	// Get members count
	membersCount, err := queries.GetGroupMembersCount(groupID)
	if err != nil {
		http.Error(w, "Error getting members count", http.StatusInternalServerError)
		return
	}

	// Get posts
	posts, err := queries.GetGroupPosts(groupID)
	if err != nil {
		posts = []models.Post{} // Empty array on error
	}

	// Get events
	events, err := queries.GetGroupEvents(groupID)
	if err != nil {
		events = []models.Event{} // Empty array on error
	}

	// Get owner details
	owner, err := queries.GetUserByID(group.OwnerID)
	var ownerPublic *models.UserPublic
	if err == nil {
		ownerPublic = &models.UserPublic{
			UserId:    owner.ID,
			Email:     owner.Email,
			FirstName: owner.FirstName,
			LastName:  owner.LastName,
			Nickname:  owner.Nickname,
			Avatar:    owner.Avatar,
			AboutMe:   owner.AboutMe,
			CreatedAt: owner.CreatedAt,
		}
	}

	// Build response
	groupInfo := models.GroupInfo{
		ID:             group.ID,
		Name:           group.Name,
		Description:    group.Description,
		CoverImagePath: group.CoverImagePath,
		OwnerID:        group.OwnerID,
		CreatedAt:      group.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		MembersCount:   membersCount,
		IsMember:       true,
		IsOwner:        group.OwnerID == userID,
		Owner:          ownerPublic,
		Posts:          posts,
		Events:         events,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"group":   groupInfo,
	})
}
