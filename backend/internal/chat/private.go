package chat

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strconv"
)

// GetPrivateConversations handles GET /api/chats/private
// Returns all private conversations for the current user with other participant info
func GetPrivateConversations(w http.ResponseWriter, r *http.Request) {
	userID, ok := utils.GetUserIDFromContext(r)
	if !ok || userID == 0 {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	conversations, err := queries.GetPrivateConversations(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to fetch conversations",
		})
		return
	}

	if conversations == nil {
		conversations = []models.Conversation{}
	}

	// Enrich conversations with other user info
	enrichedConversations := make([]map[string]interface{}, len(conversations))
	for i, conv := range conversations {
		otherUser, err := queries.GetOtherPrivateChatUser(conv.ID, userID)
		if err != nil {
			// If we can't get the other user, still include the conversation
			enrichedConversations[i] = map[string]interface{}{
				"id":         conv.ID,
				"type":       conv.Type,
				"group_id":   conv.GroupID,
				"created_at": conv.CreatedAt,
				"other_user": nil,
			}
			continue
		}

		enrichedConversations[i] = map[string]interface{}{
			"id":         conv.ID,
			"type":       conv.Type,
			"group_id":   conv.GroupID,
			"created_at": conv.CreatedAt,
			"other_user": map[string]interface{}{
				"id":         otherUser.ID,
				"username":   otherUser.Username,
				"first_name": otherUser.FirstName,
				"last_name":  otherUser.LastName,
				"avatar":     otherUser.Avatar,
				"nickname":   otherUser.Nickname,
			},
		}
	}

	utils.RespondJSON(w, http.StatusOK, enrichedConversations)
}

// GetOrCreatePrivateChat handles POST /api/chats/private/start/{userID}
// Gets or creates a private conversation with another user
// Users must mutually follow each other
func GetOrCreatePrivateChat(w http.ResponseWriter, r *http.Request) {
	userID, ok := utils.GetUserIDFromContext(r)
	if !ok || userID == 0 {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	// Extract other user's ID from path: /api/chats/private/start/{userID}
	parts := utils.GetPathParts(r.URL.Path)
	if len(parts) < 5 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid path",
		})
		return
	}

	otherUserIDStr := parts[4]
	otherUserID, err := strconv.Atoi(otherUserIDStr)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid user ID",
		})
		return
	}

	// Prevent self-chat
	if userID == otherUserID {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Cannot start a chat with yourself",
		})
		return
	}

	// Get or create private chat
	conversationID, err := queries.GetOrCreatePrivateChat(userID, otherUserID)
	if err != nil {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "Cannot start chat - users must mutually follow each other",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":         true,
		"conversation_id": conversationID,
	})
}

// GetPrivateChatMessages handles GET /api/chats/private/{conversationID}/messages
// Returns messages from a private conversation with pagination
func GetPrivateChatMessages(w http.ResponseWriter, r *http.Request) {
	userID, ok := utils.GetUserIDFromContext(r)
	if !ok || userID == 0 {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	// Extract conversation ID from path: /api/chats/private/{conversationID}/messages
	parts := utils.GetPathParts(r.URL.Path)
	if len(parts) < 4 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid path",
		})
		return
	}

	conversationIDStr := parts[3]
	conversationID, err := strconv.Atoi(conversationIDStr)
	if err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid conversation ID",
		})
		return
	}

	// Verify user is a participant
	isParticipant, err := queries.IsPrivateChatParticipant(conversationID, userID)
	if err != nil || !isParticipant {
		utils.RespondJSON(w, http.StatusForbidden, models.GenericResponse{
			Success: false,
			Message: "Unauthorized to access this conversation",
		})
		return
	}

	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 50
	offset := 0

	if limitStr != "" {
		l, err := strconv.Atoi(limitStr)
		if err == nil && l > 0 {
			limit = l
		}
	}

	if offsetStr != "" {
		o, err := strconv.Atoi(offsetStr)
		if err == nil && o >= 0 {
			offset = o
		}
	}

	messages, err := queries.GetPrivateChatMessages(conversationID, limit, offset)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to fetch messages",
		})
		return
	}

	if messages == nil {
		messages = []models.PrivateChatMessage{}
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":  true,
		"messages": messages,
	})
}
