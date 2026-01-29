package queries

import (
	"backend/internal/models"
	"fmt"
)

// CreateGroup inserts a new group into the database and returns the group ID
func CreateGroup(name, description, coverImagePath string, ownerID int) (int64, error) {
	result, err := DB.Exec(`
		INSERT INTO groups (name, description, cover_image_path, owner_id) 
		VALUES (?, ?, ?, ?)
	`, name, description, coverImagePath, ownerID)

	if err != nil {
		return 0, err
	}

	return result.LastInsertId()
}

// AddGroupMember adds a user to a group
func AddGroupMember(groupID int64, userID int) error {
	_, err := DB.Exec(`
		INSERT INTO group_members (group_id, user_id) 
		VALUES (?, ?)
	`, groupID, userID)

	return err
}

// GetGroupByID retrieves a group by its ID
func GetGroupByID(groupID int64) (models.Group, error) {
	var group models.Group
	err := DB.QueryRow(`
		SELECT 
			id, 
			name, 
			description, 
			COALESCE(cover_image_path, '') as cover_image_path, 
			owner_id, 
			created_at
		FROM groups WHERE id = ?
	`, groupID).Scan(
		&group.ID,
		&group.Name,
		&group.Description,
		&group.CoverImagePath,
		&group.OwnerID,
		&group.CreatedAt,
	)

	return group, err
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

// DeleteGroup deletes a group (CASCADE will handle members)
func DeleteGroup(groupID int64) error {
	_, err := DB.Exec(`DELETE FROM groups WHERE id = ?`, groupID)
	return err
}

// GetAllGroups retrieves all groups ordered by creation date
func GetAllGroups() ([]models.Group, error) {
	rows, err := DB.Query(`
		SELECT 
			id, 
			name, 
			description, 
			COALESCE(cover_image_path, '') as cover_image_path, 
			owner_id, 
			created_at
		FROM groups
		ORDER BY created_at DESC
	`)

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

// GetGroupMembersCount returns the number of members in a group
func GetGroupMembersCount(groupID int64) (int, error) {
	var count int
	err := DB.QueryRow(`
		SELECT COUNT(*) FROM group_members WHERE group_id = ?
	`, groupID).Scan(&count)
	return count, err
}

// GetGroupPosts retrieves all posts for a specific group
func GetGroupPosts(groupID int64) ([]models.Post, error) {
	rows, err := DB.Query(`
		SELECT 
			id, 
			user_id, 
			content, 
			COALESCE(image_path, '') as image_path,
			COALESCE(privacy, '') as privacy,
			created_at
		FROM posts
		WHERE group_id = ?
		ORDER BY created_at DESC
	`, groupID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.Post
	for rows.Next() {
		var post models.Post
		err := rows.Scan(
			&post.ID,
			&post.UserID,
			&post.Content,
			&post.ImagePath,
			&post.Privacy,
			&post.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}

	return posts, rows.Err()
}

// GetGroupEvents retrieves all events for a specific group
func GetGroupEvents(groupID int64) ([]models.Event, error) {
	rows, err := DB.Query(`
		SELECT 
			id, 
			group_id,
			title, 
			COALESCE(description, '') as description,
			event_date || ' ' || event_time as start_time,
			'' as end_time,
			created_at
		FROM group_events
		WHERE group_id = ?
		ORDER BY event_date, event_time
	`, groupID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		var event models.Event
		err := rows.Scan(
			&event.ID,
			&event.GroupID,
			&event.Title,
			&event.Description,
			&event.StartTime,
			&event.EndTime,
			&event.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}

	return events, rows.Err()
}

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

// CreateGroupPost creates a new post in a group
// All group posts are public to group members only
func CreateGroupPost(groupID int64, userID int, content string, imagePath *string) error {
	var imagePathValue interface{}
	if imagePath != nil {
		imagePathValue = *imagePath
	}

	_, err := DB.Exec(`
		INSERT INTO posts (user_id, group_id, content, image_path, privacy) 
		VALUES (?, ?, ?, ?, 'public')
	`, userID, groupID, content, imagePathValue)

	return err
}

func IsUserGroupMember(groupID int, userID int) (bool, error) {
	var exists bool
	err := DB.QueryRow(`
		SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?)
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
