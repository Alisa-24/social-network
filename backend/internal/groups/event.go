package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"backend/internal/ws"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

func CreateAnEvent(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Get session cookie to identify the user
	cookie, err := r.Cookie("session_id")
	if err != nil {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Not authenticated",
		})
		return
	}

	// Get session from database
	session, err := queries.GetSessionByID(cookie.Value)
	if err != nil {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Invalid session",
		})
		return
	}

	// Parse multipart form for file upload
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10 MB max
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Request too large",
		})
		return
	}

	userID := session.UserID
	groupIDStr := r.FormValue("group_id")
	description := r.FormValue("description")
	title := r.FormValue("title")
	eventDate := r.FormValue("event_date")
	eventTime := r.FormValue("event_time")

	groupID, err := strconv.Atoi(groupIDStr)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid group_id",
		})
		return
	}

	isMember, err := queries.IsUserGroupMember(groupID, userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Error checking membership",
		})
		return
	}
	if !isMember {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "You must be a member to create events",
		})
		return
	}

	if title == "" || len(title) > 20 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Event title is required and must be 20 characters or less",
		})
		return
	}
	if description == "" || len(description) > 150 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Event description is required and must be 150 characters or less",
		})
		return
	}
	_, resp := ValidateEventDateTime(eventDate, eventTime)
	if resp != nil {
		utils.RespondJSON(w, http.StatusBadRequest, *resp)
		return
	}

	var coverImagePath string
	file, handler, err := r.FormFile("coverImage")
	if err == nil {
		defer file.Close()

		// Save cover image using utility function
		path, err := utils.SaveUploadedFile(file, handler, "groups")
		if err != nil {
			utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
				Success: false,
				Message: err.Error(),
			})
			return
		}
		coverImagePath = path
	}
	// Convert groupID to int64 and call CreateGroupEvent with DB, groupID, userID, title, description, date, time, cover image path
	groupID64 := int64(groupID)
	userID64 := int64(userID)
	eventID, err := queries.CreateGroupEvent(groupID64, userID64, title, description, eventDate, eventTime, coverImagePath)
	if err != nil {
		fmt.Println("Error creating event:", err)
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to create event",
		})
		return
	}

	// Prepare event data for WebSocket notification
	// We construct the event object to send back immediately
	newEvent := models.Event{
		ID:          eventID,
		GroupID:     groupID64,
		Title:       title,
		Description: description,
		StartTime:   eventDate + " " + eventTime,
		EndTime:     "", // Assumed empty for now as per schema
		ImagePath:   coverImagePath,
		CreatedAt:   time.Now().Format("2006-01-02 15:04:05"),
	}

	// Notify group members
	ws.BroadcastToGroup(groupID64, "new_group_event", map[string]interface{}{
		"groupId": groupID64,
		"event":   newEvent,
	})

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Event created successfully with ID " + strconv.FormatInt(eventID, 10),
	})
}

func ValidateEventDateTime(date, timeStr string) (time.Time, *models.GenericResponse) {
	if date == "" {
		return time.Time{}, &models.GenericResponse{
			Success: false,
			Message: "Event date is required",
		}
	}
	if timeStr == "" {
		return time.Time{}, &models.GenericResponse{
			Success: false,
			Message: "Event time is required",
		}
	}

	dt, err := time.Parse("2006-01-02 15:04", date+" "+timeStr)
	if err != nil {
		return time.Time{}, &models.GenericResponse{
			Success: false,
			Message: "Invalid date or time format",
		}
	}

	if dt.Before(time.Now()) {
		return time.Time{}, &models.GenericResponse{
			Success: false,
			Message: "Event must be in the future",
		}
	}

	return dt, nil
}

func RespondToEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	// Helper struct for request body
	type ResponseRequest struct {
		EventID  int64  `json:"event_id"`
		Response string `json:"response"`
	}

	var req ResponseRequest
	if err := utils.ParseJSON(r, &req); err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid request body",
		})
		return
	}

	// Validate response
	if req.Response != "going" && req.Response != "not-going" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Response must be 'going' or 'not-going'",
		})
		return
	}

	userID := r.Context().Value("userID").(int)
	userID64 := int64(userID)

	// Update response in DB
	err := queries.AddEventResponse(req.EventID, userID64, req.Response)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to record response",
		})
		return
	}

	// Get updated counts
	going, notGoing, err := queries.GetEventResponseCounts(req.EventID)
	if err != nil {
		fmt.Printf("Error getting counts: %v\n", err)
	}

	// Get group ID to broadcast to (we need to fetch event details or assume passed, but event structure has groupID)
	// We don't have event struct here, let's fetch it or just broadcast to the group if we knew it.
	// But `RespondToEvent` only receives `event_id`. We need to query the event to know the group_id.
	// For now, let's assume we can get it from the event (not implemented in queries yet effectively).
	// Let's implement a quick query to get event details or just group_id.
	// Or we can rely on `queries.GetGroupEvents` but that returns a list.
	// Since we need to broadcast to the group, we MUST know the group_id.

	// Quick fix: Add GetEventByID in queries or use existing means.
	// I'll skip the broadcast for a second if I can't get groupID easily, but checking `groupEvents.go`...
	// `GetGroupEvents` gets events by groupID.
	// I'll create a helper or just query it here raw if needed, but better to be safe.
	// I'll do a direct DB query for group_id here for speed, or add a proper query.
	// Actually, let's add `GetEventByID` to `queries/groupEvents.go` in the next step if strictly needed,
	// but for now I will try to use `queries.DB.QueryRow` here temporarily or just add the query function.
	// Wait, I am in `event.go`. I should use `queries` package.
	// I will assume I can create `queries.GetEventByID` swiftly.

	// ... Actually, I'll modify `groupEvents.go` next. For now, let's use a placeholder for groupID.
	// OR I can use the `GetGroupEvents` and filter... no that's inefficient.

	// Let's defer the broadcast momentarily and add the query function first?
	// No, I'll write the code to use `queries.GetGroupIDByEventID` and then implement it.

	groupID, err := queries.GetGroupIDByEventID(req.EventID)
	if err == nil {
		// Broadcast update
		ws.BroadcastToGroup(groupID, "event_response_update", map[string]interface{}{
			"eventId":       req.EventID,
			"groupId":       groupID,
			"userId":        userID,
			"response":      req.Response,
			"goingCount":    going,
			"notGoingCount": notGoing,
		})
	}

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Response recorded",
	})
}

func GetEventResponsesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	eventIDStr := r.URL.Query().Get("event_id")
	if eventIDStr == "" {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Missing event_id",
		})
		return
	}

	eventID, err := strconv.Atoi(eventIDStr)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid event_id",
		})
		return
	}

	voters, err := queries.GetEventVoters(int64(eventID))
	if err != nil {
		fmt.Printf("Error fetching voters: %v\n", err)
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to fetch voters",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"voters":  voters,
	})
}
