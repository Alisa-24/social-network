package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strconv"
	"strings"
)

func KickMember(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodDelete {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Get current user ID from context
	currentUserID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	// Extract group ID and user ID from URL path
	// Expected format: /api/groups/{groupId}/members/{userId}
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 5 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid URL format",
		})
		return
	}

	groupIDStr := pathParts[2]
	userIDStr := pathParts[4]

	groupID, err := strconv.ParseInt(groupIDStr, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid group ID",
		})
		return
	}

	targetUserID, err := strconv.Atoi(userIDStr)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid user ID",
		})
		return
	}

	// Get group details
	group, err := queries.GetGroupByID(groupID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Group not found",
		})
		return
	}

	// Check if current user is the owner
	if group.OwnerID != currentUserID {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "Only the group owner can kick members",
		})
		return
	}

	// Cannot kick yourself
	if currentUserID == targetUserID {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "You cannot kick yourself from the group",
		})
		return
	}

	// Cannot kick the owner
	if group.OwnerID == targetUserID {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Cannot kick the group owner",
		})
		return
	}

	// Check if target user is actually a member
	isMember, err := queries.IsUserGroupMember(int(groupID), targetUserID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Error checking membership",
		})
		return
	}

	if !isMember {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "User is not a member of this group",
		})
		return
	}

	// Remove the member
	err = queries.RemoveGroupMember(groupID, targetUserID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to remove member",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Member removed successfully",
	})
}
