package posts

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strconv"
)

// GetUserPostsHandler handles GET /api/users/{username}/posts
// Returns privacy-filtered, paginated posts for a specific user.
func GetUserPostsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	viewerID, _ := utils.GetUserIDFromContext(r)
	username := r.PathValue("username")

	target, err := queries.GetUserByIdentifier(username)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{
			Success: false, Message: "User not found",
		})
		return
	}

	limit := 10
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err2 := strconv.Atoi(l); err2 == nil && v > 0 && v <= 20 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err2 := strconv.Atoi(o); err2 == nil && v >= 0 {
			offset = v
		}
	}

	isOwner := viewerID == target.ID
	followStatus, _ := queries.GetFollowStatus(viewerID, target.ID)
	isFollower := followStatus == "accepted"

	allPosts, err := queries.GetPostsByUserID(target.ID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false, Message: "Failed to fetch posts",
		})
		return
	}

	author, err := queries.GetUserByID(target.ID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false, Message: "Failed to fetch author",
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

	visible := make([]PostWithMeta, 0)
	for _, post := range allPosts {
		if !isOwner {
			switch post.Privacy {
			case "public":
				// visible to all
			case "followers":
				if !isFollower {
					continue
				}
			case "selected":
				ok, _ := queries.IsInSelectedFollowers(post.ID, viewerID)
				if !ok {
					continue
				}
			default:
				continue
			}
		}

		likesCount, _ := queries.GetPostLikesCount(post.ID)
		isLiked := false
		if viewerID != 0 {
			isLiked, _ = queries.IsPostLikedByUser(post.ID, viewerID)
		}
		commentsCount, _ := queries.GetCommentCount(post.ID)

		visible = append(visible, PostWithMeta{
			Post:          post,
			Author:        &author,
			Likes:         likesCount,
			IsLiked:       isLiked,
			CommentsCount: commentsCount,
		})
	}

	total := len(visible)
	if offset >= total {
		utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
			"success":  true,
			"posts":    []interface{}{},
			"has_more": false,
		})
		return
	}
	end := offset + limit
	if end > total {
		end = total
	}
	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"posts":    visible[offset:end],
		"has_more": end < total,
	})
}

// GetFeedPosts handles GET /api/posts
// Privacy is enforced in Go after fetching all posts:
//   - public    → everyone sees it
//   - followers → only accepted followers of the author see it
//   - selected  → only users in post_selected_followers see it
func GetFeedPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	viewerID, _ := utils.GetUserIDFromContext(r)

	limit := 5
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 20 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}

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

	// Paginate the privacy-filtered result
	total := len(result)
	if offset >= total {
		utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
			"success":  true,
			"posts":    []interface{}{},
			"has_more": false,
		})
		return
	}
	end := offset + limit
	if end > total {
		end = total
	}
	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"posts":    result[offset:end],
		"has_more": end < total,
	})
}

// GetPost handles GET /api/posts/{id}
func GetPost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	viewerID, _ := utils.GetUserIDFromContext(r)

	postIDStr := r.PathValue("id")
	postID, err := strconv.ParseInt(postIDStr, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{Success: false, Message: "Invalid post ID"})
		return
	}

	post, err := queries.GetPostByID(postID)
	if err != nil {
		utils.RespondJSON(w, http.StatusNotFound, models.GenericResponse{Success: false, Message: "Post not found"})
		return
	}

	// Privacy check
	if post.UserID != viewerID {
		switch post.Privacy {
		case "public":
			// ok
		case "followers":
			followingIDs, _ := queries.GetFollowingIDs(viewerID)
			followingSet := make(map[int]bool, len(followingIDs))
			for _, id := range followingIDs {
				followingSet[id] = true
			}
			if !followingSet[post.UserID] {
				utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{Success: false, Message: "Access denied"})
				return
			}
		case "selected":
			ok, _ := queries.IsInSelectedFollowers(postID, viewerID)
			if !ok {
				utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{Success: false, Message: "Access denied"})
				return
			}
		default:
			utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{Success: false, Message: "Access denied"})
			return
		}
	}

	author, err := queries.GetUserByID(post.UserID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{Success: false, Message: "Failed to fetch author"})
		return
	}

	likesCount, _ := queries.GetPostLikesCount(postID)
	isLiked := false
	if viewerID != 0 {
		isLiked, _ = queries.IsPostLikedByUser(postID, viewerID)
	}
	commentsCount, _ := queries.GetCommentCount(postID)

	type PostWithMeta struct {
		models.Post
		Author        *models.User `json:"author"`
		Likes         int          `json:"likes"`
		IsLiked       bool         `json:"is_liked"`
		CommentsCount int          `json:"comments_count"`
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"post": PostWithMeta{
			Post:          post,
			Author:        &author,
			Likes:         likesCount,
			IsLiked:       isLiked,
			CommentsCount: commentsCount,
		},
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

	if err := r.ParseMultipartForm(25 << 20); err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Request too large (max 25MB)",
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

	if imagePath == nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Post must include a photo, GIF, or video",
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
