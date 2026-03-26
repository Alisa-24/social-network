package posts

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strconv"
)

// GetComments handles GET /api/posts/{id}/comments
func GetComments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	postIDStr := r.PathValue("id")
	postID, err := strconv.ParseInt(postIDStr, 10, 64)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid post ID",
		})
		return
	}

	rawComments, err := queries.GetComments(postID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to fetch comments",
		})
		return
	}

	// Attach author info to each comment
	result := make([]models.Comment, 0, len(rawComments))
	for _, c := range rawComments {
		author, err := queries.GetUserByID(c.UserID)
		if err == nil {
			c.Author = &author
		}
		result = append(result, c)
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"comments": result,
	})
}

// AddComment handles POST /api/posts/{id}/comments
// Accepts JSON: { content }
func AddComment(w http.ResponseWriter, r *http.Request) {
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

	var body struct {
		Content string `json:"content"`
	}
	if err := utils.ParseJSON(r, &body); err != nil || len(body.Content) == 0 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Comment content is required",
		})
		return
	}

	if len(body.Content) > 300 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Comment must be 300 characters or less",
		})
		return
	}

	commentID, err := queries.AddComment(postID, userID, body.Content)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to add comment",
		})
		return
	}

	utils.RespondJSON(w, http.StatusCreated, map[string]interface{}{
		"success":    true,
		"message":    "Comment added",
		"comment_id": commentID,
	})
}
