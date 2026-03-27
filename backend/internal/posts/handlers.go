package posts

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strconv"
)

// GetFeedPosts handles GET /api/posts
// Privacy is enforced in Go after fetching all posts:
//   - public    → everyone sees it
//   - followers → only accepted followers of the author see it
//   - selected  → only users in post_selected_followers see it
func GetFeedPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	viewerID, _ := utils.GetUserIDFromContext(r)

	// 1. Fetch all personal posts (no privacy filter in SQL)
	allPosts, err := queries.GetAllPersonalPosts()
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to fetch posts",
		})
		return
	}

	// 2. Build a set of author IDs the viewer follows (for "followers" privacy)
	followingIDs, _ := queries.GetFollowingIDs(viewerID)
	followingSet := make(map[int]bool, len(followingIDs))
	for _, id := range followingIDs {
		followingSet[id] = true
	}

	type PostWithMeta struct {
		models.Post
		Author        *models.User `json:"author"`
		Likes         int          `json:"likes"`
		IsLiked       bool         `json:"is_liked"`
		CommentsCount int          `json:"comments_count"`
	}

	result := make([]PostWithMeta, 0)

	for _, post := range allPosts {
		// 3. Apply privacy rules in Go
		// Authors always see their own posts regardless of privacy
		if post.UserID != viewerID {
			switch post.Privacy {
			case "public":
				// visible to everyone — always include

			case "followers":
				// visible only to accepted followers of the author
				if !followingSet[post.UserID] {
					continue
				}

			case "selected":
				// visible only to users in the post's selected-followers list
				ok, _ := queries.IsInSelectedFollowers(post.ID, viewerID)
				if !ok {
					continue
				}

			default:
				continue
			}
		}

		// 4. Attach author, likes, comment count
		author, err := queries.GetUserByID(post.UserID)
		if err != nil {
			continue
		}

		likesCount, _ := queries.GetPostLikesCount(post.ID)
		isLiked := false
		if viewerID != 0 {
			isLiked, _ = queries.IsPostLikedByUser(post.ID, viewerID)
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
	if len(content) > 500 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Content must be at most 500 characters",
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

	if len(content) == 0 && imagePath == nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Post must have content or an image",
		})
		return
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
