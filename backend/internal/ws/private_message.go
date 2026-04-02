package ws

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"fmt"
	"time"
)

// HandlePrivateMessage processes a private chat message from a WebSocket client
// Validates that sender is a participant and the other participant receives the message
func HandlePrivateMessage(sConn *SafeConn, session *models.Session, msg map[string]interface{}) {
	conversationID, err := getPositiveIntField(msg, "conversation_id")
	if err != nil {
		fmt.Printf("Invalid private_message payload: %v\n", err)
		sendWSError(sConn, "invalid_payload", "conversation_id is required and must be a positive integer")
		return
	}

	rawContent, err := getStringField(msg, "content")
	if err != nil {
		fmt.Printf("Invalid private_message payload: %v\n", err)
		sendWSError(sConn, "invalid_payload", "content is required and must be a string")
		return
	}

	content, err := validateAndSanitizeMessageContent(rawContent)
	if err != nil {
		sendWSError(sConn, "invalid_content", err.Error())
		return
	}

	if !allowUserAction(session.UserID, "private_message", privateMessageMinInterval) {
		sendWSError(sConn, "rate_limited", "You are sending messages too quickly")
		return
	}

	// Check if user is a participant in this conversation
	isParticipant, err := queries.IsPrivateChatParticipant(conversationID, session.UserID)
	if err != nil {
		fmt.Printf("Failed participant check for conversation %d user %d: %v\n", conversationID, session.UserID, err)
		sendWSError(sConn, "internal_error", "Failed to validate conversation membership")
		return
	}

	if !isParticipant {
		sendWSError(sConn, "forbidden", "You are not a participant in this conversation")
		return
	}

	// Save to database
	msgID, err := queries.CreatePrivateChatMessage(conversationID, session.UserID, content)
	if err != nil {
		fmt.Printf("Failed to save private message: %v\n", err)
		sendWSError(sConn, "storage_error", "Failed to store message")
		return
	}

	// Get user details for broadcast
	user, err := queries.GetUserByID(session.UserID)
	if err != nil {
		fmt.Printf("Failed to get user details: %v\n", err)
		return
	}

	response := map[string]interface{}{
		"type":            "new_private_message",
		"id":              msgID,
		"conversation_id": conversationID,
		"user_id":         session.UserID,
		"content":         content,
		"created_at":      time.Now(),
		"user": map[string]interface{}{
			"userId":    user.ID,
			"username":  user.Username,
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"avatar":    user.Avatar,
			"nickname":  user.Nickname,
		},
	}

	// Broadcast only to conversation participants
	BroadcastToConversationParticipants(conversationID, response)
}
