package queries

import "backend/internal/models"

// GetAllPersonalPosts fetches all non-group posts, newest first.
// Privacy filtering is handled in the application layer (see posts/handlers.go).
func GetAllPersonalPosts() ([]models.Post, error) {
	rows, err := DB.Query(`
		SELECT
			p.id,
			p.user_id,
			p.group_id,
			p.content,
			COALESCE(p.image_path, '') AS image_path,
			COALESCE(p.privacy, 'public')  AS privacy,
			p.created_at
		FROM posts p
		WHERE p.group_id IS NULL
		ORDER BY p.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var p models.Post
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.GroupID,
			&p.Content, &p.ImagePath, &p.Privacy, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

// GetPostByID fetches a single post by ID.
func GetPostByID(postID int64) (models.Post, error) {
	var p models.Post
	err := DB.QueryRow(`
		SELECT
			p.id,
			p.user_id,
			p.group_id,
			p.content,
			COALESCE(p.image_path, '') AS image_path,
			COALESCE(p.privacy, 'public')  AS privacy,
			p.created_at
		FROM posts p
		WHERE p.id = ?
	`, postID).Scan(&p.ID, &p.UserID, &p.GroupID, &p.Content, &p.ImagePath, &p.Privacy, &p.CreatedAt)
	return p, err
}

// IsInSelectedFollowers returns true when userID is in the selected-followers
// list for the given post.
func IsInSelectedFollowers(postID int64, userID int) (bool, error) {
	var exists bool
	err := DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM post_selected_followers
			WHERE post_id = ? AND user_id = ?
		)
	`, postID, userID).Scan(&exists)
	return exists, err
}

// CreatePost creates a new personal post (no group).
// Returns the new post ID.
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

// GetPostsByUserID fetches all non-group posts by a specific user, newest first.
// Privacy filtering is handled in the application layer.
func GetPostsByUserID(authorID int) ([]models.Post, error) {
	rows, err := DB.Query(`
		SELECT
			p.id,
			p.user_id,
			p.group_id,
			p.content,
			COALESCE(p.image_path, '') AS image_path,
			COALESCE(p.privacy, 'public') AS privacy,
			p.created_at
		FROM posts p
		WHERE p.user_id = ? AND p.group_id IS NULL
		ORDER BY p.created_at DESC
	`, authorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var p models.Post
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.GroupID,
			&p.Content, &p.ImagePath, &p.Privacy, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}

// UpdatePost updates content and privacy of a post.
func UpdatePost(postID int64, content string, privacy string) error {
	_, err := DB.Exec(
		`UPDATE posts SET content = ?, privacy = ? WHERE id = ?`,
		content, privacy, postID,
	)
	return err
}
