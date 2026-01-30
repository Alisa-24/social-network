package queries

import (
	"backend/internal/models"
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
