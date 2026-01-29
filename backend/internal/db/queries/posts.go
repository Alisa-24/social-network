package queries

// TogglePostLike adds or removes a like for a post
// Returns true if like was added, false if it was removed
func TogglePostLike(postID int64, userID int) (bool, error) {
	// Check if user already liked the post
	var exists bool
	err := DB.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?)
	`, postID, userID).Scan(&exists)

	if err != nil {
		return false, err
	}

	if exists {
		// Unlike the post
		_, err = DB.Exec(`DELETE FROM post_likes WHERE post_id = ? AND user_id = ?`, postID, userID)
		return false, err
	} else {
		// Like the post
		_, err = DB.Exec(`INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)`, postID, userID)
		return true, err
	}
}

// GetPostLikesCount returns the number of likes for a post
func GetPostLikesCount(postID int64) (int, error) {
	var count int
	err := DB.QueryRow(`SELECT COUNT(*) FROM post_likes WHERE post_id = ?`, postID).Scan(&count)
	return count, err
}

// IsPostLikedByUser checks if a user has liked a post
func IsPostLikedByUser(postID int64, userID int) (bool, error) {
	var exists bool
	err := DB.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?)
	`, postID, userID).Scan(&exists)
	return exists, err
}

// DeletePost deletes a post by ID
func DeletePost(postID int64) error {
	_, err := DB.Exec(`DELETE FROM posts WHERE id = ?`, postID)
	return err
}

// GetPostOwnerID returns the user_id of the post creator
func GetPostOwnerID(postID int64) (int, error) {
	var userID int
	err := DB.QueryRow(`SELECT user_id FROM posts WHERE id = ?`, postID).Scan(&userID)
	return userID, err
}

// GetPostGroupID returns the group_id of the post (if it's a group post)
func GetPostGroupID(postID int64) (*int64, error) {
	var groupID *int64
	err := DB.QueryRow(`SELECT group_id FROM posts WHERE id = ?`, postID).Scan(&groupID)
	return groupID, err
}

// GetPostImagePath returns the image_path of the post (if it has one)
func GetPostImagePath(postID int64) (*string, error) {
	var imagePath *string
	err := DB.QueryRow(`SELECT image_path FROM posts WHERE id = ?`, postID).Scan(&imagePath)
	return imagePath, err
}
