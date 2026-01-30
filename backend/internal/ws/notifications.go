package ws

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gorilla/websocket"
)

// BroadcastToGroup sends a notification to all members of a group
func BroadcastToGroup(groupID int64, messageType string, data interface{}) {
	// Run in a goroutine to not block the caller
	go func() {
		members, err := queries.GetGroupMembersWithDetails(groupID)
		if err != nil {
			fmt.Printf("Error fetching members for notification: %v\n", err)
			return
		}

		notification := models.NotificationMessage{
			Type:      messageType,
			Data:      data,
			Timestamp: time.Now(),
		}

		fmt.Printf("Broadcasting %s to group %d (%d members)\n", messageType, groupID, len(members))

		for _, member := range members {
			SendNotificationToUser(member.UserID, notification)
		}
	}()
}

// SendNotificationToUser sends a notification to a specific user via WebSocket
func SendNotificationToUser(userID int, notification models.NotificationMessage) {
	mu.Lock()
	conn, ok := OnlineUsers[userID]
	mu.Unlock()

	if !ok {
		fmt.Printf("User %d is not online, cannot send notification\n", userID)
		return
	}

	data, err := json.Marshal(notification)
	if err != nil {
		fmt.Printf("Error marshaling notification: %v\n", err)
		return
	}

	err = conn.WriteMessage(websocket.TextMessage, data)
	if err != nil {
		// Connection might be closed, remove from online users
		mu.Lock()
		delete(OnlineUsers, userID)
		mu.Unlock()
		fmt.Printf("Failed to send notification to user %d: %v\n", userID, err)
	} else {
		fmt.Printf("Successfully sent notification to user %d\n", userID)
	}
}
