package ws

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"fmt"
	"time"
)

// HandleGroupMessage processes a group chat message from a WebSocket client
func HandleGroupMessage(session *models.Session, msg map[string]interface{}) {
	groupID, ok := msg["group_id"].(float64)
	if !ok {
		fmt.Println("Invalid or missing group_id")
		return
	}
	content, ok := msg["content"].(string)
	if !ok {
		fmt.Println("Invalid or missing content")
		return
	}

	// Validate message content
	if content == "" {
		return
	}

	// Save to database
	msgID, err := queries.CreateGroupChatMessage(int(groupID), session.UserID, content)
	if err != nil {
		fmt.Printf("Failed to save group message: %v\n", err)
		return
	}

	// Get user details for broadcast
	user, err := queries.GetUserByID(session.UserID)
	if err != nil {
		fmt.Printf("Failed to get user details: %v\n", err)
		return
	}

	response := map[string]interface{}{
		"type": "new_group_message",
		"data": map[string]interface{}{
			"id":         msgID,
			"group_id":   int(groupID),
			"user_id":    session.UserID,
			"content":    content,
			"created_at": time.Now(),
			"user": map[string]interface{}{
				"ID":        user.ID,
				"FirstName": user.FirstName,
				"LastName":  user.LastName,
				"Avatar":    user.Avatar,
				"Nickname":  user.Nickname,
			},
		},
	}

	BroadcastToAll(response)
}
