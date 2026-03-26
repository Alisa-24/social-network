package queries

import "backend/internal/models"

// GetComments returns all comments for a post, oldest first
func GetComments(postID int64) ([]models.Comment, error) {
	rows, err := DB.Query(`
		SELECT id, post_id, user_id, content, created_at
		FROM comments
		WHERE post_id = ?
		ORDER BY created_at ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var c models.Comment
		if err := rows.Scan(&c.ID, &c.PostID, &c.UserID, &c.Content, &c.CreatedAt); err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

// AddComment inserts a new comment and returns its ID
func AddComment(postID int64, userID int, content string) (int64, error) {
	result, err := DB.Exec(`
		INSERT INTO comments (post_id, user_id, content)
		VALUES (?, ?, ?)
	`, postID, userID, content)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// GetCommentCount returns the number of comments for a post
func GetCommentCount(postID int64) (int, error) {
	var count int
	err := DB.QueryRow(`SELECT COUNT(*) FROM comments WHERE post_id = ?`, postID).Scan(&count)
	return count, err
}
