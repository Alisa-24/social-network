package queries

import (
	"backend/internal/models"
	"github.com/google/uuid"
)

func GetSessionByID(sessionID string) (models.Session, error) {
	var session models.Session
	err := DB.QueryRow(`
		SELECT id, user_id, expires_at 
		FROM sessions 
		WHERE id = ? AND expires_at > datetime('now')
	`, sessionID).Scan(&session.ID, &session.UserID, &session.ExpiresAt)
	
	return session, err
}

func GetValidSessionByUserID(userID int) (string, error) {
	var sessionID string
	err := DB.QueryRow(`
		SELECT id FROM sessions 
		WHERE user_id = ? AND expires_at > datetime('now')
		ORDER BY expires_at DESC
		LIMIT 1
	`, userID).Scan(&sessionID)
	
	return sessionID, err
}

func CreateSession(userID int) (string, error) {
	sessionID := uuid.New().String()

	_, err := DB.Exec(`
		INSERT INTO sessions (id, user_id, expires_at)
		VALUES (?, ?, datetime('now', '+30 days'))
	`, sessionID, userID)

	if err != nil {
		return "", err
	}

	return sessionID, nil
}

func DeleteSession(sessionID string) error {
	_, err := DB.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
	return err
}
