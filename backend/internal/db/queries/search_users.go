package queries

import (
	"backend/internal/models"
)

// GetSuggestedUsers returns 5 random users excluding the current user.
func GetSuggestedUsers(currentUserID int) ([]models.UserSearchResult, error) {
	rows, err := DB.Query(`
		SELECT
			id,
			username,
			first_name,
			last_name,
			COALESCE(nickname, '')  AS nickname,
			COALESCE(avatar, '')    AS avatar,
			COALESCE(about_me, '') AS about_me,
			is_public
		FROM users
		WHERE id != ?
		ORDER BY RANDOM()
		LIMIT 5
	`, currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanUserResults(rows)
}

// SearchUsers returns up to 50 users matching the search term, excluding the current user.
func SearchUsers(term string, currentUserID int) ([]models.UserSearchResult, error) {
	like := "%" + term + "%"
	rows, err := DB.Query(`
		SELECT
			id,
			username,
			first_name,
			last_name,
			COALESCE(nickname, '')  AS nickname,
			COALESCE(avatar, '')    AS avatar,
			COALESCE(about_me, '') AS about_me,
			is_public
		FROM users
		WHERE id != ?
		  AND (
			    LOWER(username)              LIKE LOWER(?)
			 OR LOWER(first_name)            LIKE LOWER(?)
			 OR LOWER(last_name)             LIKE LOWER(?)
			 OR LOWER(COALESCE(nickname,'')) LIKE LOWER(?)
		  )
		ORDER BY first_name, last_name
		LIMIT 50
	`, currentUserID, like, like, like, like)
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
		if err := rows.Scan(
			&r.UserID,
			&r.Username,
			&r.FirstName,
			&r.LastName,
			&r.Nickname,
			&r.Avatar,
			&r.AboutMe,
			&r.IsPublic,
		); err != nil {
			return nil, err
		}
		results = append(results, r)
	}
	return results, nil
}
