package queries

import (
	"backend/internal/models"
)

// CreateGroupEvent inserts a new event into the database and returns its ID
func CreateGroupEvent(groupID, creatorID int64, title, description, eventDate, eventTime, imagePath string) (int64, error) {
	res, err := DB.Exec(`
		INSERT INTO group_events (group_id, creator_id, title, description, event_date, event_time, image_path)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, groupID, creatorID, title, description, eventDate, eventTime, imagePath)
	if err != nil {
		return 0, err
	}

	eventID, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}

	return eventID, nil
}

func GetGroupEvents(groupID int64, userID int) ([]models.Event, error) {
	rows, err := DB.Query(`
		SELECT 
			ge.id, 
			ge.group_id,
			ge.title, 
			COALESCE(ge.description, '') AS description,
			ge.event_date || ' ' || ge.event_time AS start_time,
			'' AS end_time,
			ge.image_path,
			ge.created_at,
			(SELECT COUNT(*) FROM group_event_responses WHERE event_id = ge.id AND response = 'going') AS going_count,
			(SELECT COUNT(*) FROM group_event_responses WHERE event_id = ge.id AND response = 'not-going') AS not_going_count,
			COALESCE((SELECT response FROM group_event_responses WHERE event_id = ge.id AND user_id = ?), '') AS user_response
		FROM group_events ge
		WHERE ge.group_id = ?
		ORDER BY ge.event_date, ge.event_time
	`, userID, groupID)
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
			&event.ImagePath,
			&event.CreatedAt,
			&event.GoingCount,
			&event.NotGoingCount,
			&event.UserResponse,
		)
		if err != nil {
			return nil, err
		}
		events = append(events, event)
	}

	return events, rows.Err()
}

// AddEventResponse adds or updates a user's response for an event
func AddEventResponse(eventID, userID int64, response string) error {
	_, err := DB.Exec(`
		INSERT INTO group_event_responses (event_id, user_id, response)
		VALUES (?, ?, ?)
		ON CONFLICT(event_id, user_id) DO UPDATE SET response = excluded.response
	`, eventID, userID, response)
	return err
}

// GetEventResponseCounts returns how many users are "going" and "not-going" for an event
func GetEventResponseCounts(eventID int64) (going int, notGoing int, err error) {
	err = DB.QueryRow(`
		SELECT 
			COUNT(CASE WHEN response = 'going' THEN 1 END),
			COUNT(CASE WHEN response = 'not-going' THEN 1 END)
		FROM group_event_responses
		WHERE event_id = ?
	`, eventID).Scan(&going, &notGoing)
	return
}

// Optional: Get who responded for an event
func GetEventResponses(eventID int64) ([]models.EventResponse, error) {
	rows, err := DB.Query(`
		SELECT user_id, response, created_at
		FROM group_event_responses
		WHERE event_id = ?
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var responses []models.EventResponse
	for rows.Next() {
		var r models.EventResponse
		if err := rows.Scan(&r.UserID, &r.Response, &r.CreatedAt); err != nil {
			return nil, err
		}
		responses = append(responses, r)
	}

	return responses, nil
}

type EventVoter struct {
	UserID    int    `json:"userId"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Avatar    string `json:"avatar"`
	Response  string `json:"response"`
}

func GetEventVoters(eventID int64) ([]EventVoter, error) {
	rows, err := DB.Query(`
		SELECT u.id, u.first_name, u.last_name, COALESCE(u.avatar, ''), ger.response
		FROM group_event_responses ger
		JOIN users u ON ger.user_id = u.id
		WHERE ger.event_id = ?
	`, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var voters []EventVoter
	for rows.Next() {
		var v EventVoter
		if err := rows.Scan(&v.UserID, &v.FirstName, &v.LastName, &v.Avatar, &v.Response); err != nil {
			return nil, err
		}
		voters = append(voters, v)
	}
	return voters, nil
}
