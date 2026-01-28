package queries

import (
	"backend/internal/models"
	"backend/internal/utils"
	"time"
)

func GetSessionByID(sessionID string) (models.Session, error) {
	var session models.Session
	err := DB.QueryRow(`
		SELECT id, user_id, expires_at, browser_fingerprint 
		FROM sessions 
		WHERE id = ?
	`, sessionID).Scan(&session.ID, &session.UserID, &session.ExpiresAt, &session.BrowserFingerprint)

	return session, err
}

func GetValidSessionByUserID(userID int) (string, error) {
	var sessionID string
	err := DB.QueryRow(`
		SELECT id FROM sessions 
		WHERE user_id = ?
		ORDER BY expires_at DESC
		LIMIT 1
	`, userID).Scan(&sessionID)

	return sessionID, err
}

func CreateSession(userID int, browserFingerprint string) (string, error) {
	sessionID := utils.GenerateSessionID()
	expiresAt := time.Now().Add(30 * 24 * time.Hour)

	_, err := DB.Exec(`
		INSERT INTO sessions (id, user_id, expires_at, browser_fingerprint, created_at)
		VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
	`, sessionID, userID, expiresAt, browserFingerprint)

	return sessionID, err
}

func DeleteSession(sessionID string) error {
	_, err := DB.Exec(`DELETE FROM sessions WHERE id = ?`, sessionID)
	return err
}
