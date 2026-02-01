package queries

import (
	"backend/internal/models"
	"fmt"
)

// HasPendingJoinRequest checks if a user has a pending join request for a group
func HasPendingJoinRequest(groupID int64, userID int) (bool, error) {
	var exists bool
	err := DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM group_join_requests 
			WHERE group_id = ? AND user_id = ? AND status = 'pending'
		)
	`, groupID, userID).Scan(&exists)

	return exists, err
}

// CreateGroupJoinRequest creates a new join request for a group
func CreateGroupJoinRequest(groupID int64, userID int) error {
	_, err := DB.Exec(`
		INSERT INTO group_join_requests (group_id, user_id, status) 
		VALUES (?, ?, 'pending')
	`, groupID, userID)
	return err
}

// GetPendingJoinRequests retrieves all pending join requests for a group
func GetPendingJoinRequests(groupID int64) ([]models.GroupJoinRequest, error) {
	rows, err := DB.Query(`
		SELECT 
			gjr.id,
			gjr.group_id,
			gjr.user_id,
			gjr.status,
			gjr.created_at
		FROM group_join_requests gjr
		WHERE gjr.group_id = ? AND gjr.status = 'pending'
		ORDER BY gjr.created_at DESC
	`, groupID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []models.GroupJoinRequest
	for rows.Next() {
		var req models.GroupJoinRequest
		err := rows.Scan(
			&req.ID,
			&req.GroupID,
			&req.UserID,
			&req.Status,
			&req.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		requests = append(requests, req)
	}

	return requests, rows.Err()
}

// UpdateJoinRequestStatus updates the status of a join request (approved/rejected)
func UpdateJoinRequestStatus(requestID int64, status string) error {
	result, err := DB.Exec(`
		UPDATE group_join_requests 
		SET status = ? 
		WHERE id = ?
	`, status, requestID)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	fmt.Printf("UpdateJoinRequestStatus: Updated %d rows for request ID %d to status %s\n", rowsAffected, requestID, status)
	return nil
}

// DeleteJoinRequest deletes a join request by ID
func DeleteJoinRequest(requestID int64) error {
	result, err := DB.Exec(`
		DELETE FROM group_join_requests 
		WHERE id = ?
	`, requestID)

	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	fmt.Printf("DeleteJoinRequest: Deleted %d rows for request ID %d\n", rowsAffected, requestID)
	return nil
}

// GetJoinRequestByID retrieves a join request by its ID
func GetJoinRequestByID(requestID int64) (models.GroupJoinRequest, error) {
	var req models.GroupJoinRequest
	err := DB.QueryRow(`
		SELECT id, group_id, user_id, status, created_at
		FROM group_join_requests
		WHERE id = ?
	`, requestID).Scan(
		&req.ID,
		&req.GroupID,
		&req.UserID,
		&req.Status,
		&req.CreatedAt,
	)
	return req, err
}

// DeleteGroupJoinRequest deletes all pending join requests for a user and group
func DeleteGroupJoinRequest(groupID int64, userID int) error {
	_, err := DB.Exec(`
		DELETE FROM group_join_requests 
		WHERE group_id = ? AND user_id = ? AND status = 'pending'
	`, groupID, userID)
	return err
}
