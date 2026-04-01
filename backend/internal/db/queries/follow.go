package queries

import (
	"backend/internal/models"
	"database/sql"
)

// FollowUser creates or updates a follow relationship.
// Public profiles auto-accept; private profiles stay pending.
// Returns the resulting status ("accepted" or "pending").
func FollowUser(followerID, followingID int, targetIsPublic bool) (string, error) {
	status := "accepted"
	if !targetIsPublic {
		status = "pending"
	}

	// Check whether a relationship already exists
	var existing string
	err := DB.QueryRow(
		`SELECT status FROM followers WHERE follower_id = ? AND following_id = ?`,
		followerID, followingID,
	).Scan(&existing)

	if err == sql.ErrNoRows {
		// No relationship yet — insert
		_, err = DB.Exec(
			`INSERT INTO followers (follower_id, following_id, status) VALUES (?, ?, ?)`,
			followerID, followingID, status,
		)
	} else if err == nil {
		// Already exists — update status
		_, err = DB.Exec(
			`UPDATE followers SET status = ? WHERE follower_id = ? AND following_id = ?`,
			status, followerID, followingID,
		)
	}
	return status, err
}

// UnfollowUser removes a follow relationship entirely.
func UnfollowUser(followerID, followingID int) error {
	_, err := DB.Exec(`
		DELETE FROM followers WHERE follower_id = ? AND following_id = ?
	`, followerID, followingID)
	return err
}

// GetFollowStatus returns the follow status from followerID → followingID.
// Returns "none" when no relationship exists.
func GetFollowStatus(followerID, followingID int) (string, error) {
	var status string
	err := DB.QueryRow(`
		SELECT status FROM followers WHERE follower_id = ? AND following_id = ?
	`, followerID, followingID).Scan(&status)
	if err == sql.ErrNoRows {
		return "none", nil
	}
	return status, err
}

// GetFollowersList returns all users who follow userID (accepted only),
// enriched with the current viewer's follow status toward each returned user.
func GetFollowersList(userID, viewerID int) ([]models.UserSearchResult, error) {
	rows, err := DB.Query(`
		SELECT
			u.id,
			u.username,
			u.first_name,
			u.last_name,
			COALESCE(u.nickname, '')   AS nickname,
			COALESCE(u.avatar, '')     AS avatar,
			COALESCE(u.about_me, '')   AS about_me,
			u.is_public,
			COALESCE(f.status, 'none') AS follow_status,
			CASE WHEN fm.follower_id IS NOT NULL THEN 1 ELSE 0 END AS follows_me
		FROM followers fol
		JOIN users u ON u.id = fol.follower_id
		LEFT JOIN followers f  ON f.follower_id  = ? AND f.following_id = u.id
		LEFT JOIN followers fm ON fm.follower_id = u.id AND fm.following_id = ? AND fm.status = 'accepted'
		WHERE fol.following_id = ? AND fol.status = 'accepted'
		ORDER BY u.first_name, u.last_name
	`, viewerID, viewerID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserResults(rows)
}

// GetFollowingList returns all users that userID follows (accepted only),
// enriched with the current viewer's follow status toward each returned user.
func GetFollowingList(userID, viewerID int) ([]models.UserSearchResult, error) {
	rows, err := DB.Query(`
		SELECT
			u.id,
			u.username,
			u.first_name,
			u.last_name,
			COALESCE(u.nickname, '')   AS nickname,
			COALESCE(u.avatar, '')     AS avatar,
			COALESCE(u.about_me, '')   AS about_me,
			u.is_public,
			COALESCE(f.status, 'none') AS follow_status,
			CASE WHEN fm.follower_id IS NOT NULL THEN 1 ELSE 0 END AS follows_me
		FROM followers fol
		JOIN users u ON u.id = fol.following_id
		LEFT JOIN followers f  ON f.follower_id  = ? AND f.following_id = u.id
		LEFT JOIN followers fm ON fm.follower_id = u.id AND fm.following_id = ? AND fm.status = 'accepted'
		WHERE fol.follower_id = ? AND fol.status = 'accepted'
		ORDER BY u.first_name, u.last_name
	`, viewerID, viewerID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserResults(rows)
}

// AcceptAllPendingFollowers promotes every pending follow request for userID to accepted.
// Called when a private account switches to public.
func AcceptAllPendingFollowers(userID int) error {
	_, err := DB.Exec(
		`UPDATE followers SET status = 'accepted' WHERE following_id = ? AND status = 'pending'`,
		userID,
	)
	return err
}

// GetFollowerIDs returns the IDs of all accepted followers for userID.
func GetFollowerIDs(userID int) ([]int, error) {
	rows, err := DB.Query(
		`SELECT follower_id FROM followers WHERE following_id = ? AND status = 'accepted'`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

// GetPendingFollowRequests returns users who have a pending follow request to userID.
func GetPendingFollowRequests(userID int) ([]models.UserSearchResult, error) {
	rows, err := DB.Query(`
		SELECT
			u.id,
			u.username,
			u.first_name,
			u.last_name,
			COALESCE(u.nickname, '')  AS nickname,
			COALESCE(u.avatar, '')    AS avatar,
			COALESCE(u.about_me, '') AS about_me,
			u.is_public,
			'none'                    AS follow_status,
			0                         AS follows_me
		FROM followers f
		JOIN users u ON u.id = f.follower_id
		WHERE f.following_id = ? AND f.status = 'pending'
		ORDER BY u.first_name, u.last_name
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserResults(rows)
}

// AcceptFollowRequest promotes a single pending request to accepted.
func AcceptFollowRequest(followerID, targetID int) error {
	_, err := DB.Exec(
		`UPDATE followers SET status = 'accepted' WHERE follower_id = ? AND following_id = ? AND status = 'pending'`,
		followerID, targetID,
	)
	return err
}

// DeclineFollowRequest removes a pending follow request.
func DeclineFollowRequest(followerID, targetID int) error {
	_, err := DB.Exec(
		`DELETE FROM followers WHERE follower_id = ? AND following_id = ? AND status = 'pending'`,
		followerID, targetID,
	)
	return err
}

// GetFollowersCount returns the number of accepted followers for userID.
func GetFollowersCount(userID int) (int, error) {
	var count int
	err := DB.QueryRow(`
		SELECT COUNT(*) FROM followers WHERE following_id = ? AND status = 'accepted'
	`, userID).Scan(&count)
	return count, err
}

// GetFollowingCount returns the number of users that userID follows (accepted).
func GetFollowingCount(userID int) (int, error) {
	var count int
	err := DB.QueryRow(`
		SELECT COUNT(*) FROM followers WHERE follower_id = ? AND status = 'accepted'
	`, userID).Scan(&count)
	return count, err
}
