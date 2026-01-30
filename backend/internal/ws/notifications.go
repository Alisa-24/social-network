package ws

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"fmt"
	"time"
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
