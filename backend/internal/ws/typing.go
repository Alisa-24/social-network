package ws

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"fmt"
)

// HandleTyping broadcasts a group typing signal to connected clients.
func HandleTyping(sConn *SafeConn, session *models.Session, msg map[string]interface{}) {
	groupID, err := getPositiveIntField(msg, "group_id")
	if err != nil {
		fmt.Printf("Invalid typing payload: %v\n", err)
		sendWSError(sConn, "invalid_payload", "group_id is required and must be a positive integer")
		return
	}

	if !allowUserAction(session.UserID, "typing", typingEventMinInterval) {
		return
	}

	// Only group members can emit typing events for that group.
	isMember, err := queries.IsUserGroupMember(groupID, session.UserID)
	if err != nil || !isMember {
		if err != nil {
			fmt.Printf("Typing membership check failed for group %d user %d: %v\n", groupID, session.UserID, err)
		}
		sendWSError(sConn, "forbidden", "You are not allowed to send typing events for this group")
		return
	}

	userName := "Someone"
	if user, err := queries.GetUserByID(session.UserID); err == nil {
		if user.Username != "" {
			userName = user.Username
		}
	}

	BroadcastRawToGroup(int64(groupID), map[string]interface{}{
		"type":      "user_typing",
		"group_id":  groupID,
		"user_id":   session.UserID,
		"user_name": userName,
	})
}

// HandleStopTyping broadcasts a group stop-typing signal to connected clients.
func HandleStopTyping(sConn *SafeConn, session *models.Session, msg map[string]interface{}) {
	groupID, err := getPositiveIntField(msg, "group_id")
	if err != nil {
		sendWSError(sConn, "invalid_payload", "group_id is required and must be a positive integer")
		return
	}

	isMember, err := queries.IsUserGroupMember(groupID, session.UserID)
	if err != nil || !isMember {
		sendWSError(sConn, "forbidden", "You are not allowed to send typing events for this group")
		return
	}

	BroadcastRawToGroup(int64(groupID), map[string]interface{}{
		"type":     "user_stop_typing",
		"group_id": groupID,
		"user_id":  session.UserID,
	})
}
