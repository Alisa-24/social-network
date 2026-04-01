package queries

import "time"

// SaveOTP stores a new OTP code for the user, replacing any existing one.
func SaveOTP(userID int, code string, expiresAt time.Time) error {
	_, err := DB.Exec(`DELETE FROM otp_codes WHERE user_id = ?`, userID)
	if err != nil {
		return err
	}
	_, err = DB.Exec(
		`INSERT INTO otp_codes (user_id, code, expires_at) VALUES (?, ?, ?)`,
		userID, code, expiresAt,
	)
	return err
}

// VerifyOTP checks the code and returns true if valid and not expired.
func VerifyOTP(userID int, code string) (bool, error) {
	var expiresAt time.Time
	err := DB.QueryRow(
		`SELECT expires_at FROM otp_codes WHERE user_id = ? AND code = ?`,
		userID, code,
	).Scan(&expiresAt)
	if err != nil {
		return false, nil // not found
	}
	if time.Now().After(expiresAt) {
		return false, nil // expired
	}
	return true, nil
}

// DeleteOTP removes all OTP codes for the user.
func DeleteOTP(userID int) error {
	_, err := DB.Exec(`DELETE FROM otp_codes WHERE user_id = ?`, userID)
	return err
}

// MarkUserVerified sets is_verified = true for the user.
func MarkUserVerified(userID int) error {
	_, err := DB.Exec(`UPDATE users SET is_verified = 1 WHERE id = ?`, userID)
	return err
}
