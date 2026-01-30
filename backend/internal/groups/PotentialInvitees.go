package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strconv"
	"strings"
)

// PotentialInvitee represents a simplified user for invite lists
type PotentialInvitee struct {
	ID        int    `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Avatar    string `json:"avatar"`
}

// GetPotentialInvitees returns users who are not members of the group
func GetPotentialInvitees(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	// Extract group ID from URL path: /api/groups/{id}/invitees
	// After Trim and Split: ["api", "groups", "123", "invitees"] => id at index 2
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 4 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid URL format: missing group ID",
		})
		return
	}
	groupIDStr := pathParts[2]

	groupID, err := strconv.ParseInt(groupIDStr, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid group ID",
		})
		return
	}

	// Ensure requester is a member (only members can invite)
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
			Message: "You must be a member to invite users",
		})
		return
	}

	users, err := queries.GetUsersNotInGroup(groupID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Error fetching users",
		})
		return
	}

	var resp []PotentialInvitee
	for _, u := range users {
		resp = append(resp, PotentialInvitee{
			ID:        u.UserId,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			Avatar:    u.Avatar,
		})
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"users":   resp,
	})
}
