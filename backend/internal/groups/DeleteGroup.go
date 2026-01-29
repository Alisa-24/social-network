package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
)

func DeleteGroup(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodDelete {
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

	groupIDStr := r.URL.Query().Get("groupID")
	if groupIDStr == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Group ID is required",
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

	// Get group details
	group, err := queries.GetGroupByID(groupID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Group not found",
		})
		return
	}

	// Verify user is the group owner
	if group.OwnerID != userID {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "Only group owner can delete the group",
		})
		return
	}

	// Get cover image path before deleting
	coverImagePath := group.CoverImagePath

	// Delete the group (CASCADE will handle members, posts, events, etc.)
	err = queries.DeleteGroup(groupID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to delete group",
		})
		return
	}

	// Delete cover image from disk if it exists
	if coverImagePath != "" {
		filePath := strings.TrimPrefix(coverImagePath, "/")
		if err := os.Remove(filePath); err != nil {
			// Log error but don't fail the request since group is already deleted
			fmt.Printf("Failed to delete group cover image %s: %v\n", filePath, err)
		}
	}

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Group deleted successfully",
	})
}
