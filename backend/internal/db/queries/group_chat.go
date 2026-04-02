package queries

import (
	"backend/internal/models"
	"database/sql"
	"errors"
	"time"

	"github.com/mattn/go-sqlite3"
)

// CreateGroupChatMessage creates a new message in a group chat
func CreateGroupChatMessage(groupID, userID int, content string) (int, error) {
	query := `INSERT INTO group_chat_messages (group_id, user_id, content, created_at) VALUES (?, ?, ?, ?)`

	var (
		result sql.Result
		err    error
	)

	for attempt := 0; attempt < 4; attempt++ {
		result, err = DB.Exec(query, groupID, userID, content, time.Now())
		if err == nil {
			break
		}

		if !isSQLiteBusy(err) || attempt == 3 {
			return 0, err
		}

		time.Sleep(time.Duration(20*(1<<attempt)) * time.Millisecond)
	}

	id, err := result.LastInsertId()
	return int(id), err
}

func isSQLiteBusy(err error) bool {
	var sqliteErr sqlite3.Error
	if errors.As(err, &sqliteErr) {
		return sqliteErr.Code == sqlite3.ErrBusy || sqliteErr.Code == sqlite3.ErrLocked
	}
	return false
}

// GetGroupChatMessages retrieves messages for a group with pagination
func GetGroupChatMessages(groupID, limit, offset int) ([]models.GroupChatMessage, error) {
	query := `
		SELECT m.id, m.group_id, m.user_id, m.content, m.created_at,
		       u.id, u.username, u.first_name, u.last_name, u.avatar, u.nickname
		FROM group_chat_messages m
		JOIN users u ON m.user_id = u.id
		WHERE m.group_id = ?
		ORDER BY m.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := DB.Query(query, groupID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.GroupChatMessage
	for rows.Next() {
		var msg models.GroupChatMessage
		var user models.User
		var avatar sql.NullString
		var nickname sql.NullString

		err := rows.Scan(
			&msg.ID, &msg.GroupID, &msg.UserID, &msg.Content, &msg.CreatedAt,
			&user.ID, &user.Username, &user.FirstName, &user.LastName, &avatar, &nickname,
		)
		if err != nil {
			return nil, err
		}

		if avatar.Valid {
			user.Avatar = avatar.String
		}
		if nickname.Valid {
			user.Nickname = nickname.String
		}

		msg.User = user
		messages = append(messages, msg)
	}

	return messages, nil
}
