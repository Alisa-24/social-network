package queries

import (
	"backend/internal/models"
	"database/sql"
	"fmt"
	"strings"
	"time"
)

// CanMessage checks if two users can message each other.
// Returns true if at least one user follows the other with accepted status,
// OR if the recipient (user2) has a public profile.
func CanMessage(user1ID, user2ID int) (bool, error) {
	// Ensure no self-chat
	if user1ID == user2ID {
		return false, nil
	}

	var canMsg bool
	err := DB.QueryRow(`
		SELECT (
			EXISTS(
				SELECT 1 FROM followers
				WHERE (follower_id = ? AND following_id = ? AND status = 'accepted')
				   OR (follower_id = ? AND following_id = ? AND status = 'accepted')
			)
			OR
			EXISTS(
				SELECT 1 FROM users WHERE id = ? AND is_public = 1
			)
		)
	`, user1ID, user2ID, user2ID, user1ID, user2ID).Scan(&canMsg)
	if err != nil {
		return false, err
	}

	return canMsg, nil
}

// GetFollowContacts returns all users that the given user follows OR who follow them (accepted).
// Used to populate the chat contacts list.
func GetFollowContacts(userID int) ([]models.UserSearchResult, error) {
	query := `
		SELECT DISTINCT u.id, u.username, u.first_name, u.last_name,
		       COALESCE(u.nickname, '') as nickname,
		       COALESCE(u.avatar, '') as avatar,
		       COALESCE(u.about_me, '') as about_me,
		       u.is_public
		FROM users u
		WHERE u.id != ? AND u.id IN (
			SELECT following_id FROM followers WHERE follower_id = ? AND status = 'accepted'
			UNION
			SELECT follower_id FROM followers WHERE following_id = ? AND status = 'accepted'
		)
		ORDER BY u.first_name, u.last_name
	`
	rows, err := DB.Query(query, userID, userID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []models.UserSearchResult
	for rows.Next() {
		var c models.UserSearchResult
		err := rows.Scan(
			&c.UserID, &c.Username, &c.FirstName, &c.LastName,
			&c.Nickname, &c.Avatar, &c.AboutMe, &c.IsPublic,
		)
		if err != nil {
			return nil, err
		}
		contacts = append(contacts, c)
	}
	return contacts, rows.Err()
}

// GetOrCreatePrivateChat gets or creates a private conversation between two users
// Uses database transaction to prevent race condition creating duplicate chats
// Users must be able to message each other (mutual follow)
// Always maintains consistent ordering: smaller ID first
func GetOrCreatePrivateChat(user1ID, user2ID int) (int, error) {
	// Ensure no self-chat
	if user1ID == user2ID {
		return 0, fmt.Errorf("cannot create chat with self")
	}

	// Check if users can message each other
	canMessage, err := CanMessage(user1ID, user2ID)
	if err != nil {
		return 0, err
	}
	if !canMessage {
		return 0, fmt.Errorf("users cannot message each other - they must mutually follow")
	}

	// Normalize order: smaller ID first
	minID := user1ID
	maxID := user2ID
	if minID > maxID {
		minID, maxID = maxID, minID
	}

	// Use transaction to prevent race condition
	tx, err := DB.Begin()
	if err != nil {
		return 0, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	// Check if pair already exists
	var existingConvID int
	err = tx.QueryRow(`
		SELECT conversation_id FROM private_chat_pairs
		WHERE min_user_id = ? AND max_user_id = ?
	`, minID, maxID).Scan(&existingConvID)

	if err == nil {
		// Chat already exists - return it
		tx.Commit()
		return existingConvID, nil
	} else if err != sql.ErrNoRows {
		return 0, fmt.Errorf("failed to check existing chat: %w", err)
	}

	// Create new conversation
	result, err := tx.Exec(`
		INSERT INTO conversations (type, created_at)
		VALUES ('private', ?)
	`, time.Now())
	if err != nil {
		return 0, fmt.Errorf("failed to create conversation: %w", err)
	}

	conversationID64, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("failed to get conversation ID: %w", err)
	}
	conversationID := int(conversationID64)

	// Add both users as participants
	_, err = tx.Exec(`
		INSERT INTO participants (conversation_id, user_id, joined_at)
		VALUES (?, ?, ?), (?, ?, ?)
	`, conversationID, minID, time.Now(), conversationID, maxID, time.Now())
	if err != nil {
		return 0, fmt.Errorf("failed to add participants: %w", err)
	}

	// Record in private_chat_pairs table (enforces uniqueness via database constraint)
	_, err = tx.Exec(`
		INSERT INTO private_chat_pairs (min_user_id, max_user_id, conversation_id, created_at)
		VALUES (?, ?, ?, ?)
	`, minID, maxID, conversationID, time.Now())
	if err != nil {
		// If UNIQUE constraint fails, another request created it - query and return that
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			var conflictConvID int
			err2 := tx.QueryRow(`
				SELECT conversation_id FROM private_chat_pairs
				WHERE min_user_id = ? AND max_user_id = ?
			`, minID, maxID).Scan(&conflictConvID)

			tx.Commit()
			if err2 == nil {
				return conflictConvID, nil
			}
		}
		return 0, fmt.Errorf("failed to record chat pair: %w", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return conversationID, nil
}

// CreatePrivateChatMessage creates a new message in a private chat
// Validates that sender is part of the conversation
func CreatePrivateChatMessage(conversationID, userID int, content string) (int, error) {
	// Validate message content
	if content == "" {
		return 0, fmt.Errorf("message content cannot be empty")
	}

	// Verify user is a participant in this conversation
	var isParticipant bool
	err := DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM participants
			WHERE conversation_id = ? AND user_id = ?
		)
	`, conversationID, userID).Scan(&isParticipant)
	if err != nil {
		return 0, err
	}
	if !isParticipant {
		return 0, fmt.Errorf("user is not a participant in this conversation")
	}

	// Verify conversation is private
	var convType string
	err = DB.QueryRow(`
		SELECT type FROM conversations WHERE id = ?
	`, conversationID).Scan(&convType)
	if err != nil {
		return 0, err
	}
	if convType != "private" {
		return 0, fmt.Errorf("conversation is not a private chat")
	}

	// Insert message
	query := `INSERT INTO private_chat_messages (conversation_id, user_id, content, created_at) VALUES (?, ?, ?, ?)`
	result, err := DB.Exec(query, conversationID, userID, content, time.Now())
	if err != nil {
		return 0, err
	}

	msgID, err := result.LastInsertId()
	return int(msgID), err
}

// GetPrivateChatMessages retrieves messages for a private chat with pagination
func GetPrivateChatMessages(conversationID, limit, offset int) ([]models.PrivateChatMessage, error) {
	query := `
		SELECT m.id, m.conversation_id, m.user_id, m.content, m.created_at,
		       u.id, u.username, u.first_name, u.last_name, u.avatar, u.nickname
		FROM private_chat_messages m
		JOIN users u ON m.user_id = u.id
		WHERE m.conversation_id = ?
		ORDER BY m.created_at DESC
		LIMIT ? OFFSET ?
	`

	rows, err := DB.Query(query, conversationID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.PrivateChatMessage
	for rows.Next() {
		var msg models.PrivateChatMessage
		var user models.User
		var avatar sql.NullString
		var nickname sql.NullString

		err := rows.Scan(
			&msg.ID, &msg.ConversationID, &msg.UserID, &msg.Content, &msg.CreatedAt,
			&user.ID, &user.Username, &user.FirstName, &user.LastName, &avatar, &nickname,
		)
		if err != nil {
			return nil, err
		}

		if avatar.Valid {
			user.Avatar = avatar.String
		}
		if nickname.Valid {
			user.Nickname = nickname.String
		}

		msg.User = user
		messages = append(messages, msg)
	}

	return messages, nil
}

// IsPrivateChatParticipant checks if a user is a participant in a specific private chat
func IsPrivateChatParticipant(conversationID, userID int) (bool, error) {
	var isParticipant bool
	err := DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM participants
			WHERE conversation_id = ? AND user_id = ?
		)
	`, conversationID, userID).Scan(&isParticipant)
	return isParticipant, err
}

// GetPrivateConversations retrieves all private conversations for a user
func GetPrivateConversations(userID int) ([]models.Conversation, error) {
	query := `
		SELECT c.id, c.type, c.group_id, c.created_at
		FROM conversations c
		JOIN participants p ON c.id = p.conversation_id
		WHERE c.type = 'private' AND p.user_id = ?
		ORDER BY c.created_at DESC
	`

	rows, err := DB.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var conversations []models.Conversation
	for rows.Next() {
		var conv models.Conversation
		err := rows.Scan(&conv.ID, &conv.Type, &conv.GroupID, &conv.CreatedAt)
		if err != nil {
			return nil, err
		}
		conversations = append(conversations, conv)
	}

	return conversations, nil
}

// GetConversationParticipants returns all user IDs in a conversation
func GetConversationParticipants(conversationID int) ([]int, error) {
	query := `
		SELECT user_id FROM participants
		WHERE conversation_id = ?
	`
	rows, err := DB.Query(query, conversationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var userIDs []int
	for rows.Next() {
		var userID int
		if err := rows.Scan(&userID); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, userID)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return userIDs, nil
}

// GetOtherPrivateChatUser gets the other user's details in a private conversation
func GetOtherPrivateChatUser(conversationID int, currentUserID int) (*models.User, error) {
	query := `
		SELECT u.id, u.username, u.first_name, u.last_name, u.avatar, u.nickname
		FROM users u
		JOIN participants p ON u.id = p.user_id
		WHERE p.conversation_id = ? AND p.user_id != ?
	`
	var user models.User
	var avatar sql.NullString
	var nickname sql.NullString

	err := DB.QueryRow(query, conversationID, currentUserID).Scan(
		&user.ID, &user.Username, &user.FirstName, &user.LastName, &avatar, &nickname,
	)
	if err != nil {
		return nil, err
	}

	if avatar.Valid {
		user.Avatar = avatar.String
	}
	if nickname.Valid {
		user.Nickname = nickname.String
	}

	return &user, nil
}
