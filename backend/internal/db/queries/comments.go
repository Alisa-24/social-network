package queries

import (
	"backend/internal/models"
	"fmt"
)

// GetComments returns top-level comments for a post (no replies), oldest first,
// including a count of replies for each.
func GetComments(postID int64) ([]models.Comment, error) {
	rows, err := DB.Query(`
		SELECT c.id, c.post_id, c.user_id, c.content, c.created_at,
		       (SELECT COUNT(*) FROM comments r WHERE r.parent_id = c.id) AS replies_count
		FROM comments c
		WHERE c.post_id = ? AND c.parent_id IS NULL
		ORDER BY c.created_at ASC
	`, postID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []models.Comment
	for rows.Next() {
		var c models.Comment
		if err := rows.Scan(&c.ID, &c.PostID, &c.UserID, &c.Content, &c.CreatedAt, &c.RepliesCount); err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

// GetReplies returns all replies for a given comment, oldest first.
func GetReplies(commentID int64) ([]models.Comment, error) {
	rows, err := DB.Query(`
		SELECT id, post_id, user_id, content, created_at, parent_id
		FROM comments
		WHERE parent_id = ?
		ORDER BY created_at ASC
	`, commentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var replies []models.Comment
	for rows.Next() {
		var c models.Comment
		if err := rows.Scan(&c.ID, &c.PostID, &c.UserID, &c.Content, &c.CreatedAt, &c.ParentID); err != nil {
			return nil, err
		}
		replies = append(replies, c)
	}
	return replies, rows.Err()
}

// AddComment inserts a new top-level comment and returns its ID.
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

// AddReply inserts a reply to a comment and returns its ID.
func AddReply(postID, parentID int64, userID int, content string) (int64, error) {
	result, err := DB.Exec(`
		INSERT INTO comments (post_id, user_id, content, parent_id)
		VALUES (?, ?, ?, ?)
	`, postID, userID, content, parentID)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// GetCommentOwnerID returns the user_id of the comment author.
func GetCommentOwnerID(commentID int64) (int, error) {
	var userID int
	err := DB.QueryRow(`SELECT user_id FROM comments WHERE id = ?`, commentID).Scan(&userID)
	return userID, err
}

// DeleteComment deletes a comment (or reply) by ID, only if the caller owns it.
// Replies cascade-delete automatically via the FK when a parent comment is deleted.
func DeleteComment(commentID int64, callerID int) error {
	result, err := DB.Exec(`DELETE FROM comments WHERE id = ? AND user_id = ?`, commentID, callerID)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("not found or not owner")
	}
	return nil
}

// UpdateComment updates the content of a comment (or reply), only if the caller owns it.
func UpdateComment(commentID int64, callerID int, content string) error {
	result, err := DB.Exec(
		`UPDATE comments SET content = ? WHERE id = ? AND user_id = ?`,
		content, commentID, callerID,
	)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("not found or not owner")
	}
	return nil
}

// GetCommentCount returns the total number of comments (including replies) for a post.
func GetCommentCount(postID int64) (int, error) {
	var count int
	err := DB.QueryRow(`SELECT COUNT(*) FROM comments WHERE post_id = ?`, postID).Scan(&count)
	return count, err
}
