package queries

func CreateNotification(userID int, actorID *int, notificationType string, data string) error {
	_, err := DB.Exec(`
		INSERT INTO notifications (user_id, actor_id, type, data)
		VALUES (?, ?, ?, ?)
	`, userID, actorID, notificationType, data)
	return err
}

func GetNotifications(userID int) ([]map[string]interface{}, error) {
	rows, err := DB.Query(`
		SELECT id, actor_id, type, data, read, created_at
		FROM notifications
		WHERE user_id = ?
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifications []map[string]interface{}
	for rows.Next() {
		var id int
		var actorID *int
		var nType, data string
		var read int
		var createdAt string
		err := rows.Scan(&id, &actorID, &nType, &data, &read, &createdAt)
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
		}
		notifications = append(notifications, notif)
	}
	return notifications, nil
}
