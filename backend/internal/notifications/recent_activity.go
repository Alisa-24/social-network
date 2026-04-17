package notifications

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/ws"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type RecentActivityText struct {
	Message  string
	Subtitle string
}

func activityUsername(username string) string {
	trimmed := strings.TrimSpace(username)
	if trimmed == "" {
		return "@user"
	}
	if strings.HasPrefix(trimmed, "@") {
		return trimmed
	}
	return "@" + trimmed
}

func activityGroupName(groupName string) string {
	trimmed := strings.TrimSpace(groupName)
	if trimmed == "" {
		trimmed = "a group"
	}
	return fmt.Sprintf("'%s'", trimmed)
}

func FollowRequestSent(targetUsername string) RecentActivityText {
	return RecentActivityText{
		Message:  fmt.Sprintf("You requested to follow %s", activityUsername(targetUsername)),
		Subtitle: "Follow Request",
	}
}

func FollowRequestReceived(senderUsername string) RecentActivityText {
	return RecentActivityText{
		Message:  fmt.Sprintf("%s requested to follow you", activityUsername(senderUsername)),
		Subtitle: "Follow Request",
	}
}

func FollowAcceptedForSender(targetUsername string) RecentActivityText {
	return RecentActivityText{
		Message:  fmt.Sprintf("You are now following %s", activityUsername(targetUsername)),
		Subtitle: "Follow Update",
	}
}

func FollowAcceptedForReceiver(senderUsername string) RecentActivityText {
	return RecentActivityText{
		Message:  fmt.Sprintf("%s is now following you", activityUsername(senderUsername)),
		Subtitle: "Follow Update",
	}
}

func GroupJoinRequestSent(groupName string) RecentActivityText {
	return RecentActivityText{
		Message:  fmt.Sprintf("You requested to join %s", activityGroupName(groupName)),
		Subtitle: "Join Request",
	}
}

func GroupJoinRequestReceived(requesterUsername, groupName string) RecentActivityText {
	return RecentActivityText{
		Message:  fmt.Sprintf("%s requested to join %s", activityUsername(requesterUsername), activityGroupName(groupName)),
		Subtitle: "Join Request",
	}
}

func GroupJoinApproved(groupName string) RecentActivityText {
	return RecentActivityText{
		Message:  fmt.Sprintf("You joined %s", activityGroupName(groupName)),
		Subtitle: "Join Request",
	}
}

func GroupInvitationSent(inviteeUsername, groupName string) RecentActivityText {
	return RecentActivityText{
		Message:  fmt.Sprintf("You invited %s to %s", activityUsername(inviteeUsername), activityGroupName(groupName)),
		Subtitle: "Group Invite",
	}
}

func GroupInvitationReceived(inviterUsername, groupName string) RecentActivityText {
	return RecentActivityText{
		Message:  fmt.Sprintf("%s invited you to %s", activityUsername(inviterUsername), activityGroupName(groupName)),
		Subtitle: "Group Invite",
	}
}

func GroupInvitationAcceptedForInviter(inviteeUsername, groupName string) RecentActivityText {
	return RecentActivityText{
		Message:  fmt.Sprintf("%s joined %s", activityUsername(inviteeUsername), activityGroupName(groupName)),
		Subtitle: "Group Invite",
	}
}

func GroupInvitationAcceptedForInvitee(groupName string) RecentActivityText {
	return RecentActivityText{
		Message:  fmt.Sprintf("You joined %s", activityGroupName(groupName)),
		Subtitle: "Group Invite",
	}
}

func ActivityPayload(text RecentActivityText, extra map[string]interface{}) map[string]interface{} {
	payload := map[string]interface{}{
		"message":  text.Message,
		"subtitle": text.Subtitle,
	}

	for key, value := range extra {
		payload[key] = value
	}

	return payload
}

func StoreRecentActivity(userID int, actorID *int, activityType string, text RecentActivityText, extra map[string]interface{}) (int64, error) {
	payload := ActivityPayload(text, extra)
	dataBytes, err := json.Marshal(payload)
	if err != nil {
		return 0, err
	}

	return queries.CreateNotification(userID, actorID, activityType, string(dataBytes))
}

func NotifyRecentActivity(userID int, actorID *int, activityType string, text RecentActivityText, extra map[string]interface{}) error {
	// Store in database and get the notification ID
	notificationID, err := StoreRecentActivity(userID, actorID, activityType, text, extra)
	if err != nil {
		return err
	}

	actorIDVal := 0
	if actorID != nil {
		actorIDVal = *actorID
	}

	// Also send live WebSocket notification to user
	ws.SendNotificationToUser(userID, models.NotificationMessage{
		Type:      activityType,
		Data:      ActivityPayload(text, extra),
		Timestamp: time.Now(),
	})

	// Emit real-time event for instant UI update
	status := "pending"
	if extra != nil {
		if s, ok := extra["status"].(string); ok {
			status = s
		}
	}

	ws.EmitNotificationCreated(notificationID, userID, actorIDVal, activityType, text.Message, text.Subtitle, ActivityPayload(text, extra), status)

	return nil
}
