package queries

import (
	"backend/internal/models"
)

// GetSuggestedUsers returns 5 random users excluding the current user,
// with the viewer's follow status included for each result.
func GetSuggestedUsers(currentUserID int) ([]models.UserSearchResult, error) {
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
		FROM users u
		LEFT JOIN followers f  ON f.follower_id  = ? AND f.following_id = u.id
		LEFT JOIN followers fm ON fm.follower_id = u.id AND fm.following_id = ? AND fm.status = 'accepted'
		WHERE u.id != ?
		ORDER BY RANDOM()
		LIMIT 5
	`, currentUserID, currentUserID, currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserResults(rows)
}

// SearchUsers returns up to 50 users matching the search term, excluding the current user,
// with the viewer's follow status included for each result.
func SearchUsers(term string, currentUserID int) ([]models.UserSearchResult, error) {
	like := "%" + term + "%"
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
		FROM users u
		LEFT JOIN followers f  ON f.follower_id  = ? AND f.following_id = u.id
		LEFT JOIN followers fm ON fm.follower_id = u.id AND fm.following_id = ? AND fm.status = 'accepted'
		WHERE u.id != ?
		  AND (
			    LOWER(u.username)              LIKE LOWER(?)
			 OR LOWER(u.first_name)            LIKE LOWER(?)
			 OR LOWER(u.last_name)             LIKE LOWER(?)
			 OR LOWER(COALESCE(u.nickname,'')) LIKE LOWER(?)
		  )
		ORDER BY u.first_name, u.last_name
		LIMIT 50
	`, currentUserID, currentUserID, currentUserID, like, like, like, like)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserResults(rows)
}

type userResultScanner interface {
	Next() bool
	Scan(dest ...any) error
}

func scanUserResults(rows userResultScanner) ([]models.UserSearchResult, error) {
	var results []models.UserSearchResult
	for rows.Next() {
		var r models.UserSearchResult
		var followsMe int // SQLite returns 0/1 for CASE WHEN
		if err := rows.Scan(
			&r.UserID,
			&r.Username,
			&r.FirstName,
			&r.LastName,
			&r.Nickname,
			&r.Avatar,
			&r.AboutMe,
			&r.IsPublic,
			&r.FollowStatus,
			&followsMe,
		); err != nil {
			return nil, err
		}
		r.FollowsMe = followsMe == 1
		results = append(results, r)
	}
	return results, nil
}
