package posts

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strconv"
)

// GetFeedPosts handles GET /api/posts
// Returns all personal (non-group) posts with author info, likes, and comment count
func GetFeedPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, _ := utils.GetUserIDFromContext(r)

	rawPosts, err := queries.GetFeedPosts()
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to fetch posts",
		})
		return
	}

	type PostWithMeta struct {
		models.Post
		Author        *models.User `json:"author"`
		Likes         int          `json:"likes"`
		IsLiked       bool         `json:"is_liked"`
		CommentsCount int          `json:"comments_count"`
	}

	result := make([]PostWithMeta, 0, len(rawPosts))
	for _, post := range rawPosts {
		author, err := queries.GetUserByID(post.UserID)
		if err != nil {
			continue
		}

		likesCount, _ := queries.GetPostLikesCount(post.ID)
		isLiked := false
		if userID != 0 {
			isLiked, _ = queries.IsPostLikedByUser(post.ID, userID)
		}
		commentsCount, _ := queries.GetCommentCount(post.ID)

		result = append(result, PostWithMeta{
			Post:          post,
			Author:        &author,
			Likes:         likesCount,
			IsLiked:       isLiked,
			CommentsCount: commentsCount,
		})
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"posts":   result,
	})
}

// CreatePost handles POST /api/posts
// Accepts multipart form: content, privacy (public|followers|selected), image (optional)
func CreatePost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok || userID == 0 {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	if err := r.ParseMultipartForm(5 << 20); err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Request too large (max 5MB)",
		})
		return
	}

	content := r.FormValue("content")
	if len(content) == 0 || len(content) > 500 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Content must be between 1 and 500 characters",
		})
		return
	}

	privacy := r.FormValue("privacy")
	validPrivacy := map[string]bool{"public": true, "followers": true, "selected": true}
	if !validPrivacy[privacy] {
		privacy = "public"
	}

	var imagePath *string
	file, handler, err := r.FormFile("image")
	if err == nil {
		defer file.Close()
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

	postID, err := queries.CreatePost(userID, content, imagePath, privacy)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to create post",
		})
		return
	}

	utils.RespondJSON(w, http.StatusCreated, map[string]interface{}{
		"success": true,
		"message": "Post created successfully",
		"post_id": postID,
	})
}

// UpdatePost handles PUT /api/posts/{id}
// Accepts JSON: { content, privacy }
func UpdatePost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok || userID == 0 {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	postIDStr := r.PathValue("id")
	postID, err := strconv.ParseInt(postIDStr, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid post ID",
		})
		return
	}

	// Ensure the caller owns the post
	ownerID, err := queries.GetPostOwnerID(postID)
	if err != nil || ownerID != userID {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "You can only edit your own posts",
		})
		return
	}

	var body struct {
		Content string `json:"content"`
		Privacy string `json:"privacy"`
	}
	if err := utils.ParseJSON(r, &body); err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid request body",
		})
		return
	}

	if len(body.Content) == 0 || len(body.Content) > 500 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Content must be between 1 and 500 characters",
		})
		return
	}

	validPrivacy := map[string]bool{"public": true, "followers": true, "selected": true}
	if !validPrivacy[body.Privacy] {
		body.Privacy = "public"
	}

	if err := queries.UpdatePost(postID, body.Content, body.Privacy); err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to update post",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Post updated successfully",
	})
}
