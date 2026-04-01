package queries

// GetUserStats returns activity counts for a given user:
//   - postsCount      : personal (non-group) posts they authored
//   - likesReceived   : total likes on their posts
//   - commentsReceived: total comments on their posts
func GetUserStats(userID int) (postsCount, likesReceived, commentsReceived int, err error) {
	err = DB.QueryRow(
		`SELECT COUNT(*) FROM posts WHERE user_id = ? AND group_id IS NULL`,
		userID,
	).Scan(&postsCount)
	if err != nil {
		return
	}

	err = DB.QueryRow(`
		SELECT COUNT(*)
		FROM post_likes pl
		JOIN posts p ON pl.post_id = p.id
		WHERE p.user_id = ? AND p.group_id IS NULL
	`, userID).Scan(&likesReceived)
	if err != nil {
		return
	}

	err = DB.QueryRow(`
		SELECT COUNT(*)
		FROM comments c
		JOIN posts p ON c.post_id = p.id
		WHERE p.user_id = ? AND p.group_id IS NULL
	`, userID).Scan(&commentsReceived)
	return
}
