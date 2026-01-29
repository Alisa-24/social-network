package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"os"
	"strconv"
	"strings"
)

func DeletePost(w http.ResponseWriter, r *http.Request) {
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

	// Extract post ID from URL path: /posts/{id}
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 2 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid post ID",
		})
		return
	}

	postID, err := strconv.ParseInt(pathParts[1], 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid post ID",
		})
		return
	}

	// Get the post owner
	postOwnerID, err := queries.GetPostOwnerID(postID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false,
			Message: "Post not found",
		})
		return
	}

	// Check if it's a group post
	groupID, err := queries.GetPostGroupID(postID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to verify post",
		})
		return
	}

	// Verify user can delete (must be post creator or group owner)
	canDelete := userID == postOwnerID

	if groupID != nil {
		// If it's a group post, also check if user is group owner
		group, err := queries.GetGroupByID(*groupID)
		if err == nil && group.OwnerID == userID {
			canDelete = true
		}
	}

	if !canDelete {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "You don't have permission to delete this post",
		})
		return
	}

	// Get the image path before deleting
	imagePath, err := queries.GetPostImagePath(postID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to retrieve post details",
		})
		return
	}

	// Delete the post from database
	err = queries.DeletePost(postID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to delete post",
		})
		return
	}

	// Delete the image file from disk if it exists
	if imagePath != nil && *imagePath != "" {
		// Remove leading slash to get relative path from project root
		filePath := strings.TrimPrefix(*imagePath, "/")
		if err := os.Remove(filePath); err != nil {
		}
	}

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Post deleted successfully",
	})
}
