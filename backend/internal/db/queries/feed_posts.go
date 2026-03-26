package queries

import "backend/internal/models"

// GetFeedPosts retrieves all personal (non-group) public posts, newest first
func GetFeedPosts() ([]models.Post, error) {
	rows, err := DB.Query(`
		SELECT
			id,
			user_id,
			group_id,
			content,
			COALESCE(image_path, '') as image_path,
			COALESCE(privacy, 'public') as privacy,
			created_at
		FROM posts
		WHERE group_id IS NULL
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var post models.Post
		if err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.GroupID,
			&post.Content,
			&post.ImagePath,
			&post.Privacy,
			&post.CreatedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	return posts, rows.Err()
}

// CreatePost creates a new personal post (no group)
// Returns the new post ID
func CreatePost(userID int, content string, imagePath *string, privacy string) (int64, error) {
	var imageVal interface{}
	if imagePath != nil {
		imageVal = *imagePath
	}

	result, err := DB.Exec(`
		INSERT INTO posts (user_id, content, image_path, privacy)
		VALUES (?, ?, ?, ?)
	`, userID, content, imageVal, privacy)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

// UpdatePost updates content and privacy of a post
func UpdatePost(postID int64, content string, privacy string) error {
	_, err := DB.Exec(`
		UPDATE posts SET content = ?, privacy = ? WHERE id = ?
	`, content, privacy, postID)
	return err
}
