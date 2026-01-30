package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strconv"
	"strings"
)

// MemberResponse represents a group member with their details
type MemberResponse struct {
	ID        int    `json:"ID"`
	FirstName string `json:"FirstName"`
	LastName  string `json:"LastName"`
	Avatar    string `json:"Avatar"`
	Role      string `json:"Role"`
	JoinedAt  string `json:"JoinedAt"`
}

func GetMembers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Get current user ID from context
	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	// Extract group ID from URL path by locating the "groups" segment
	// Expected format somewhere in path: /.../groups/{groupId}/members
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	groupIDStr := ""
	for i, p := range pathParts {
		if p == "groups" && i+1 < len(pathParts) {
			groupIDStr = pathParts[i+1]
			break
		}
	}

	if groupIDStr == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid URL format: missing group ID",
		})
		return
	}

	groupID, err := strconv.ParseInt(groupIDStr, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid group ID",
		})
		return
	}

	// Check if user is a member of the group
	isMember, err := queries.IsUserGroupMember(int(groupID), userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Error checking membership",
		})
		return
	}

	if !isMember {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "You must be a member to view members",
		})
		return
	}

	// Get group details to determine owner
	group, err := queries.GetGroupByID(groupID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Group not found",
		})
		return
	}

	// Get all members with details
	members, err := queries.GetGroupMembersWithDetails(groupID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Error fetching members",
		})
		return
	}

	// Format response with role information
	var membersResponse []MemberResponse
	for _, member := range members {
		role := "member"
		if member.UserID == group.OwnerID {
			role = "owner"
		}

		membersResponse = append(membersResponse, MemberResponse{
			ID:        member.UserID,
			FirstName: member.FirstName,
			LastName:  member.LastName,
			Avatar:    member.Avatar,
			Role:      role,
			JoinedAt:  member.JoinedAt,
		})
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"members": membersResponse,
	})
}
