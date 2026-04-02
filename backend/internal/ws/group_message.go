package ws

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"fmt"
	"time"
)

// HandleGroupMessage processes a group chat message from a WebSocket client
func HandleGroupMessage(sConn *SafeConn, session *models.Session, msg map[string]interface{}) {
	groupID, err := getPositiveIntField(msg, "group_id")
	if err != nil {
		fmt.Printf("Invalid group_message payload: %v\n", err)
		sendWSError(sConn, "invalid_payload", "group_id is required and must be a positive integer")
		return
	}

	rawContent, err := getStringField(msg, "content")
	if err != nil {
		fmt.Printf("Invalid group_message payload: %v\n", err)
		sendWSError(sConn, "invalid_payload", "content is required and must be a string")
		return
	}

	content, err := validateAndSanitizeMessageContent(rawContent)
	if err != nil {
		sendWSError(sConn, "invalid_content", err.Error())
		return
	}

	if !allowUserAction(session.UserID, "group_message", groupMessageMinInterval) {
		sendWSError(sConn, "rate_limited", "You are sending messages too quickly")
		return
	}

	// Check if user is a member of the group
	isMember, err := queries.IsUserGroupMember(groupID, session.UserID)
	if err != nil {
		fmt.Printf("Failed membership check for group %d user %d: %v\n", groupID, session.UserID, err)
		sendWSError(sConn, "internal_error", "Failed to validate group membership")
		return
	}

	if !isMember {
		sendWSError(sConn, "forbidden", "You are not a member of this group")
		return
	}

	// Save to database
	msgID, err := queries.CreateGroupChatMessage(groupID, session.UserID, content)
	if err != nil {
		fmt.Printf("Failed to save group message: %v\n", err)
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
		"type":       "new_group_message",
		"id":         msgID,
		"group_id":   groupID,
		"user_id":    session.UserID,
		"content":    content,
		"created_at": time.Now(),
		"user": map[string]interface{}{
			"userId":    user.ID,
			"username":  user.Username,
			"firstName": user.FirstName,
			"lastName":  user.LastName,
			"avatar":    user.Avatar,
			"nickname":  user.Nickname,
		},
	}

	BroadcastRawToGroup(int64(groupID), response)
}
