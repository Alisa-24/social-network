package queries

import (
	"backend/internal/models"
)

// GetUsersNotInGroup returns users who are not members of the given group
func GetUsersNotInGroup(groupID int64) ([]models.UserPublic, error) {
	rows, err := DB.Query(`
        SELECT u.id, u.email, u.first_name, u.last_name, COALESCE(u.nickname, '') as nickname, COALESCE(u.avatar, '') as avatar, COALESCE(u.about_me, '') as about_me, u.created_at
        FROM users u
        WHERE u.id NOT IN (SELECT user_id FROM group_members WHERE group_id = ?)
        ORDER BY u.first_name, u.last_name
    `, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.UserPublic
	for rows.Next() {
		var u models.UserPublic
		err := rows.Scan(
			&u.UserId,
			&u.Email,
			&u.FirstName,
			&u.LastName,
			&u.Nickname,
			&u.Avatar,
			&u.AboutMe,
			&u.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		users = append(users, u)
	}

	return users, rows.Err()
}
