package queries

// GetGroupIDByEventID retrieves the group ID for a specific event
func GetGroupIDByEventID(eventID int64) (int64, error) {
	var groupID int64
	err := DB.QueryRow(`SELECT group_id FROM group_events WHERE id = ?`, eventID).Scan(&groupID)
	return groupID, err
}
