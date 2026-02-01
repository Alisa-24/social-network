package queries

import (
	"backend/internal/models"
)

// CreateGroupInvitation creates a new group invitation
func CreateGroupInvitation(groupID int64, inviterID int, inviteeID int) error {
	_, err := DB.Exec(`
		INSERT INTO group_invitations (group_id, inviter_id, invited_user_id, status)
		VALUES (?, ?, ?, 'pending')
	`, groupID, inviterID, inviteeID)
	return err
}

// GetUserInvitations retrieves all pending invitations for a user
func GetUserInvitations(userID int) ([]models.GroupInvitation, error) {
	rows, err := DB.Query(`
		SELECT 
			gi.id,
			gi.group_id,
			g.name as group_name,
			gi.inviter_id,
			u.first_name || ' ' || u.last_name as inviter_name,
			gi.created_at
		FROM group_invitations gi
		INNER JOIN groups g ON gi.group_id = g.id
		INNER JOIN users u ON gi.inviter_id = u.id
		WHERE gi.invited_user_id = ? AND gi.status = 'pending'
		ORDER BY gi.created_at DESC
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invitations []models.GroupInvitation
	for rows.Next() {
		var inv models.GroupInvitation
		err := rows.Scan(
			&inv.ID,
			&inv.GroupID,
			&inv.GroupName,
			&inv.InviterID,
			&inv.InviterName,
			&inv.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		invitations = append(invitations, inv)
	}

	return invitations, rows.Err()
}

// DeleteGroupInvitation deletes an invitation
func DeleteGroupInvitation(invitationID int) error {
	_, err := DB.Exec(`DELETE FROM group_invitations WHERE id = ?`, invitationID)
	return err
}

// GetGroupInvitationByID retrieves an invitation by its ID
func GetGroupInvitationByID(invitationID int) (int64, int, error) {
	var groupID int64
	var inviteeID int
	err := DB.QueryRow(`
		SELECT group_id, invited_user_id
		FROM group_invitations
		WHERE id = ?
	`, invitationID).Scan(&groupID, &inviteeID)
	return groupID, inviteeID, err
}

// HasPendingInvitation checks if a user has a pending invitation to a specific group
func HasPendingInvitation(groupID int64, userID int) (bool, error) {
	var count int
	err := DB.QueryRow(`
		SELECT COUNT(*) 
		FROM group_invitations 
		WHERE group_id = ? AND invited_user_id = ? AND status = 'pending'
	`, groupID, userID).Scan(&count)

	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// DeletePendingInvitation deletes all pending invitations for a user to a specific group
func DeletePendingInvitation(groupID int64, userID int) error {
	_, err := DB.Exec(`
		DELETE FROM group_invitations 
		WHERE group_id = ? AND invited_user_id = ? AND status = 'pending'
	`, groupID, userID)
	return err
}
