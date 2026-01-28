package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strconv"
)

func CreateGroupPost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	if err := r.ParseMultipartForm(5 << 20); err != nil { // 5 MB max
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Request too large",
		})
		return
	}

	content := r.FormValue("content")
	groupID := r.FormValue("groupID")

	// Convert groupID to int64
	groupIDInt, err := strconv.ParseInt(groupID, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid group ID",
		})
		return
	}

	// Validate user can post in this group
	if err := utils.ValidateUserCanPostOrCreateEvent(r, groupIDInt, queries.IsGroupMember); err != nil {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	// Get user ID from context
	userID, _ := utils.GetUserIDFromContext(r)
	if len(content) == 0 || len(content) > 500 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Content must be between 1 and 500 characters",
		})
		return
	}

	var imagePath *string
	// Handle optional image upload
	file, handler, err := r.FormFile("image")
	if err == nil {
		defer file.Close()
		// Save image to uploads/posts
		path, err := utils.SaveUploadedFile(file, handler, "posts")
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: err.Error(),
			})
			return
		}
		imagePath = &path
	}

	// Create post in database
	if err := queries.CreateGroupPost(groupIDInt, userID, content, imagePath); err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to create post",
		})
		return
	}

	utils.RespondJSON(w, http.StatusCreated, models.GenericResponse{
		Success: true,
		Message: "Post created successfully",
	})
}

func GetGroupPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Get groupID from query parameter
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

	// Validate user can view posts in this group (must be a member)
	if err := utils.ValidateUserCanPostOrCreateEvent(r, groupID, queries.IsGroupMember); err != nil {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	// Fetch posts from database
	posts, err := queries.GetGroupPosts(groupID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to fetch posts",
		})
		return
	}

	// Fetch author details for each post
	type PostWithAuthor struct {
		models.Post
		Author *models.User `json:"author"`
	}

	postsWithAuthors := make([]PostWithAuthor, 0, len(posts))
	for _, post := range posts {
		user, err := queries.GetUserByID(post.UserID)
		if err != nil {
			// Skip posts with missing authors
			continue
		}

		postsWithAuthors = append(postsWithAuthors, PostWithAuthor{
			Post:   post,
			Author: &user,
		})
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"posts":   postsWithAuthors,
	})
}
