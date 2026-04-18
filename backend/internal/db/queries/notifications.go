package queries

func CreateNotification(userID int, actorID *int, notificationType string, data string) (int64, error) {
	result, err := DB.Exec(`
		INSERT INTO notifications (user_id, actor_id, type, data)
		VALUES (?, ?, ?, ?)
	`, userID, actorID, notificationType, data)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func GetNotifications(userID int) ([]map[string]interface{}, error) {
	rows, err := DB.Query(`
		SELECT n.id, n.actor_id, n.type, n.data, n.read, n.created_at,
		       u.first_name, u.last_name, u.avatar, u.username
		FROM notifications n
		LEFT JOIN users u ON n.actor_id = u.id
		WHERE user_id = ?
		ORDER BY n.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	notifications := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int
		var actorID *int
		var nType, data string
		var read int
		var createdAt string
		var firstName, lastName, avatar, username *string
		err := rows.Scan(&id, &actorID, &nType, &data, &read, &createdAt, &firstName, &lastName, &avatar, &username)
		if err != nil {
			return nil, err
		}

		notif := map[string]interface{}{
			"id":         id,
			"actor_id":   actorID,
			"type":       nType,
			"data":       data,
			"read":       read,
			"created_at": createdAt,
			"actor": map[string]interface{}{
				"first_name": firstName,
				"last_name":  lastName,
				"avatar":     avatar,
				"username":   username,
			},
		}
		notifications = append(notifications, notif)
	}
	return notifications, nil
}

func MarkNotificationRead(userID int, notificationID int) error {
	_, err := DB.Exec(`
		UPDATE notifications
		SET read = 1
		WHERE id = ? AND user_id = ?
	`, notificationID, userID)
	return err
}

func MarkAllNotificationsRead(userID int) error {
	_, err := DB.Exec(`
		UPDATE notifications
		SET read = 1
		WHERE user_id = ?
	`, userID)
	return err
}

// GetNotificationByID retrieves a single notification by ID
func GetNotificationByID(notificationID int64) (map[string]interface{}, error) {
	var id int
	var userID int
	var actorID *int
	var nType, data string
	var read int
	var createdAt string

	err := DB.QueryRow(`
		SELECT id, user_id, actor_id, type, data, read, created_at
		FROM notifications
		WHERE id = ?
	`, notificationID).Scan(&id, &userID, &actorID, &nType, &data, &read, &createdAt)

	if err != nil {
		return nil, err
	}

	notif := map[string]interface{}{
		"id":         id,
		"user_id":    userID,
		"actor_id":   actorID,
		"type":       nType,
		"data":       data,
		"read":       read,
		"created_at": createdAt,
	}

	return notif, nil
}

// DeleteNotification hard-deletes a notification
func DeleteNotification(notificationID int64, userID int) error {
	_, err := DB.Exec(`
		DELETE FROM notifications
		WHERE id = ? AND user_id = ?
	`, notificationID, userID)
	return err
}
