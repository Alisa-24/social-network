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

// BroadcastRawToGroup sends a pre-shaped WebSocket payload to online group members.
func BroadcastRawToGroup(groupID int64, message interface{}) {
	go func() {
		members, err := queries.GetGroupMembersWithDetails(groupID)
		if err != nil {
			fmt.Printf("Error fetching group members for broadcast: %v\n", err)
			return
		}

		payload, err := json.Marshal(message)
		if err != nil {
			fmt.Printf("Error marshaling group broadcast payload: %v\n", err)
			return
		}

		for _, member := range members {
			mu.Lock()
			sConn, ok := OnlineUsers[member.UserID]
			mu.Unlock()
			if !ok {
				continue
			}

			if err := sConn.WriteMessage(websocket.TextMessage, payload); err != nil {
				fmt.Printf("Failed group broadcast to user %d: %v\n", member.UserID, err)
				mu.Lock()
				delete(OnlineUsers, member.UserID)
				mu.Unlock()
			}
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

// BroadcastFollowRequest notifies a user of a follow request
func BroadcastFollowRequest(recipientID int, senderID int, senderName string, senderAvatar *string) {
	go func() {
		// Get sender's username
		sender, err := queries.GetUserByID(senderID)
		senderUsername := ""
		if err == nil {
			senderUsername = sender.Username
		}

		notification := map[string]interface{}{
			"type":            "follow_request",
			"request_id":      senderID, // The request ID is the sender's user ID
			"sender_id":       senderID,
			"sender_name":     senderName,
			"sender_username": senderUsername,
			"sender_avatar":   senderAvatar,
			"timestamp":       time.Now(),
		}

		mu.Lock()
		if sConn, ok := OnlineUsers[recipientID]; ok {
			mu.Unlock()
			payload, _ := json.Marshal(notification)
			sConn.WriteMessage(websocket.TextMessage, payload)
		} else {
			mu.Unlock()
		}
	}()
}

// BroadcastMessageNotification notifies user of a new message (also stores in DB)
func BroadcastMessageNotification(recipientID int, senderID int, senderName string, content string, conversationID int) {
	go func() {
		// Store in database
		data := fmt.Sprintf(`{"sender_id":%d,"sender_name":"%s","content":"%s","conversation_id":%d}`, senderID, senderName, content, conversationID)
		_, _ = queries.CreateNotification(recipientID, &senderID, "new_message", data)

		notification := map[string]interface{}{
			"type":            "new_message",
			"sender_id":       senderID,
			"sender_name":     senderName,
			"content":         content,
			"conversation_id": conversationID,
			"timestamp":       time.Now(),
		}

		mu.Lock()
		if sConn, ok := OnlineUsers[recipientID]; ok {
			mu.Unlock()
			payload, _ := json.Marshal(notification)
			sConn.WriteMessage(websocket.TextMessage, payload)
		} else {
			mu.Unlock()
		}
	}()
}

// ============================================================================
// Real-Time Notification Event System
// These functions emit lifecycle events (create/update/delete) for notifications
// ============================================================================

// EmitNotificationCreated sends a real-time event when a notification is created
// This allows clients to see new notifications instantly without polling
func EmitNotificationCreated(notificationID int64, userID int, actorID int, activityType string,
	message string, subtitle string, payload map[string]interface{}, status string) {
	go func() {
		event := models.NotificationEventMessage{
			Type: "notification_event",
			Event: models.NotificationEvent{
				EventType:      "notification:create",
				NotificationID: notificationID,
				UserID:         userID,
				ActorID:        actorID,
				ActivityType:   activityType,
				Message:        message,
				Subtitle:       subtitle,
				Payload:        payload,
				Status:         status,
				CreatedAt:      time.Now(),
			},
		}

		data, err := json.Marshal(event)
		if err != nil {
			fmt.Printf("Error marshaling notification event: %v\n", err)
			return
		}

		mu.Lock()
		conn, ok := OnlineUsers[userID]
		mu.Unlock()

		if !ok {
			fmt.Printf("[Real-Time] User %d offline; notification %d queued in DB\n", userID, notificationID)
			return
		}

		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			fmt.Printf("[Real-Time] Failed to emit notification:create to user %d: %v\n", userID, err)
			mu.Lock()
			delete(OnlineUsers, userID)
			mu.Unlock()
		} else {
			fmt.Printf("[Real-Time] Notification %d emitted to user %d (type: %s)\n", notificationID, userID, activityType)
		}
	}()
}

// EmitNotificationUpdated sends a real-time event when a notification is updated
// Use this when a pending request changes status (e.g., accepted, rejected)
func EmitNotificationUpdated(notificationID int64, userID int, actorID int, activityType string,
	message string, status string, payload map[string]interface{}) {
	go func() {
		event := models.NotificationEventMessage{
			Type: "notification_event",
			Event: models.NotificationEvent{
				EventType:      "notification:update",
				NotificationID: notificationID,
				UserID:         userID,
				ActorID:        actorID,
				ActivityType:   activityType,
				Message:        message,
				Status:         status,
				Payload:        payload,
				CreatedAt:      time.Now(),
			},
		}

		data, err := json.Marshal(event)
		if err != nil {
			fmt.Printf("Error marshaling update event: %v\n", err)
			return
		}

		mu.Lock()
		conn, ok := OnlineUsers[userID]
		mu.Unlock()

		if !ok {
			fmt.Printf("[Real-Time] User %d offline; cannot send update for notification %d\n", userID, notificationID)
			return
		}

		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			fmt.Printf("[Real-Time] Failed to emit notification:update to user %d: %v\n", userID, err)
			mu.Lock()
			delete(OnlineUsers, userID)
			mu.Unlock()
		} else {
			fmt.Printf("[Real-Time] Update for notification %d sent to user %d (status: %s)\n", notificationID, userID, status)
		}
	}()
}

// EmitNotificationDeleted sends a real-time event when a notification is deleted/dismissed
func EmitNotificationDeleted(notificationID int64, userID int) {
	go func() {
		event := models.NotificationEventMessage{
			Type: "notification_event",
			Event: models.NotificationEvent{
				EventType:      "notification:delete",
				NotificationID: notificationID,
				UserID:         userID,
				CreatedAt:      time.Now(),
			},
		}

		data, err := json.Marshal(event)
		if err != nil {
			fmt.Printf("Error marshaling delete event: %v\n", err)
			return
		}

		mu.Lock()
		conn, ok := OnlineUsers[userID]
		mu.Unlock()

		if !ok {
			fmt.Printf("[Real-Time] User %d offline; notification %d delete not sent\n", userID, notificationID)
			return
		}

		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			fmt.Printf("[Real-Time] Failed to emit notification:delete to user %d: %v\n", userID, err)
			mu.Lock()
			delete(OnlineUsers, userID)
			mu.Unlock()
		} else {
			fmt.Printf("[Real-Time] Delete event for notification %d sent to user %d\n", notificationID, userID)
		}
	}()
}
