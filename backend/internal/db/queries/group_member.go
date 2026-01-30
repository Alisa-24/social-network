package queries

import (
	"backend/internal/models"
)

// AddGroupMember adds a user to a group
func AddGroupMember(groupID int64, userID int) error {
	_, err := DB.Exec(`
		INSERT INTO group_members (group_id, user_id) 
		VALUES (?, ?)
	`, groupID, userID)

	return err
}

// IsGroupMember checks if a user is a member of a group
func IsGroupMember(groupID int64, userID int) (bool, error) {
	var exists bool
	err := DB.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?)
	`, groupID, userID).Scan(&exists)

	return exists, err
}

// GetUserGroups retrieves all groups a user is a member of
func GetUserGroups(userID int) ([]models.Group, error) {
	rows, err := DB.Query(`
		SELECT 
			g.id, 
			g.name, 
			g.description, 
			COALESCE(g.cover_image_path, '') as cover_image_path, 
			g.owner_id, 
			g.created_at
		FROM groups g
		INNER JOIN group_members gm ON g.id = gm.group_id
		WHERE gm.user_id = ?
		ORDER BY g.created_at DESC
	`, userID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var groups []models.Group
	for rows.Next() {
		var group models.Group
		err := rows.Scan(
			&group.ID,
			&group.Name,
			&group.Description,
			&group.CoverImagePath,
			&group.OwnerID,
			&group.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}

	return groups, rows.Err()
}

// RemoveGroupMember removes a user from a group
func RemoveGroupMember(groupID int64, userID int) error {
	_, err := DB.Exec(`
		DELETE FROM group_members 
		WHERE group_id = ? AND user_id = ?
	`, groupID, userID)

	return err
}

// GetGroupMembersCount returns the number of members in a group
func GetGroupMembersCount(groupID int64) (int, error) {
	var count int
	err := DB.QueryRow(`
		SELECT COUNT(*) FROM group_members WHERE group_id = ?
	`, groupID).Scan(&count)
	return count, err
}

func IsUserGroupMember(groupID int, userID int) (bool, error) {
	var exists bool
	err := DB.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?)
	`, groupID, userID).Scan(&exists)
	return exists, err
}

// GroupMemberDetail contains member information with user details
type GroupMemberDetail struct {
	UserID    int    `json:"user_id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Avatar    string `json:"avatar"`
	JoinedAt  string `json:"joined_at"`
}

// GetGroupMembersWithDetails retrieves all members with their user details
func GetGroupMembersWithDetails(groupID int64) ([]GroupMemberDetail, error) {
	rows, err := DB.Query(`
		SELECT 
			u.id,
			u.first_name,
			u.last_name,
			COALESCE(u.avatar, '') as avatar,
			gm.joined_at
		FROM group_members gm
		INNER JOIN users u ON gm.user_id = u.id
		WHERE gm.group_id = ?
		ORDER BY gm.joined_at ASC
	`, groupID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []GroupMemberDetail
	for rows.Next() {
		var member GroupMemberDetail
		err := rows.Scan(
			&member.UserID,
			&member.FirstName,
			&member.LastName,
			&member.Avatar,
			&member.JoinedAt,
		)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}

	return members, rows.Err()
}
