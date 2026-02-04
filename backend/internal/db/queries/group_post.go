package queries

import (
	"backend/internal/models"
)

// GetGroupPosts retrieves all posts for a specific group
func GetGroupPosts(groupID int64) ([]models.Post, error) {
	rows, err := DB.Query(`
		SELECT 
			id, 
			user_id,
			group_id, 
			content, 
			COALESCE(image_path, '') as image_path,
			COALESCE(privacy, '') as privacy,
			created_at
		FROM posts
		WHERE group_id = ?
		ORDER BY created_at DESC
	`, groupID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var post models.Post
		err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.GroupID,
			&post.Content,
			&post.ImagePath,
			&post.Privacy,
			&post.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}

	return posts, rows.Err()
}

// CreateGroupPost creates a new post in a group
// All group posts are public to group members only
func CreateGroupPost(groupID int64, userID int, content string, imagePath *string) error {
	var imagePathValue interface{}
	if imagePath != nil {
		imagePathValue = *imagePath
	}

	_, err := DB.Exec(`
		INSERT INTO posts (user_id, group_id, content, image_path, privacy) 
		VALUES (?, ?, ?, ?, 'public')
	`, userID, groupID, content, imagePathValue)

	return err
}
