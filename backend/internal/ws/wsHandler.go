package ws

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func WSHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Attempting WebSocket connection...")

	cookie, err := r.Cookie("session_id")
	if err != nil {
		fmt.Println("WebSocket error: No session_id cookie found")
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Not authenticated",
		})
		return
	}

	fmt.Printf("WebSocket: Found cookie %s\n", cookie.Value)

	// Get session from database
	session, err := queries.GetSessionByID(cookie.Value)
	if err != nil {
		fmt.Printf("WebSocket error: Failed to find session for cookie %s: %v\n", cookie.Value, err)
		if err == sql.ErrNoRows {
			utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
				Success: false,
				Message: "Invalid session",
			})
			return
		}
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to verify session",
		})
		return
	}

	fmt.Printf("WebSocket: Session verified for user %d\n", session.UserID)
	if time.Now().After(session.ExpiresAt) {
		fmt.Printf("WebSocket error: Session expired for user %d\n", session.UserID)
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Session expired",
		})
		return
	}

	// Upgrade HTTP connection to WebSocket
	wsConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Printf("WebSocket error: Upgrade failed: %v\n", err)
		return
	}
	wsConn.SetReadLimit(16 * 1024)
	_ = wsConn.SetReadDeadline(time.Time{})

	sConn := &SafeConn{Conn: wsConn}

	fmt.Printf("WebSocket connected successfully for user %d\n", session.UserID)

	mu.Lock()
	// Close old connection if exists for this user to ensure only one active socket per user
	if oldConn, exists := OnlineUsers[session.UserID]; exists {
		fmt.Printf("Closing old connection for user %d\n", session.UserID)
		oldConn.Conn.Close()
	}
	OnlineUsers[session.UserID] = sConn
	mu.Unlock()

	// Initial broadcast of online users
	BroadcastOnlineUsers()

	defer func() {
		mu.Lock()
		// Only remove if it's the SAME connection to avoid removing a newer tab's connection
		if current, ok := OnlineUsers[session.UserID]; ok && current == sConn {
			delete(OnlineUsers, session.UserID)
		}
		mu.Unlock()
		clearUserRateLimits(session.UserID)
		sConn.Conn.Close()
		fmt.Printf("WebSocket disconnected for user %d\n", session.UserID)
		// Update online users for all clients
		BroadcastOnlineUsers()
	}()

	// Message loop
	for {
		_, data, err := sConn.Conn.ReadMessage()
		if err != nil {
			// Expected error on client disconnect
			break
		}

		var msg map[string]interface{}
		if err := json.Unmarshal(data, &msg); err != nil {
			fmt.Printf("Error unmarshaling message: %v\n", err)
			sendWSError(sConn, "invalid_json", "Malformed JSON payload")
			continue
		}

		msgType, err := getStringField(msg, "type")
		if err != nil {
			fmt.Printf("Invalid message type: %v\n", err)
			sendWSError(sConn, "invalid_message", "Missing or invalid message type")
			continue
		}

		fmt.Printf("Received message from user %d: type=%s\n", session.UserID, msgType)

		switch msgType {
		case "get_online_users":
			HandleGetOnlineUsers(sConn, session.UserID)

		case "group_message":
			HandleGroupMessage(sConn, &session, msg)

		case "private_message":
			HandlePrivateMessage(sConn, &session, msg)

		case "typing":
			HandleTyping(sConn, &session, msg)

		case "stop_typing":
			HandleStopTyping(sConn, &session, msg)

		default:
			fmt.Printf("Unknown message type from user %d: %s\n", session.UserID, msgType)
			sendWSError(sConn, "unsupported_type", "Unsupported message type")
		}
	}
}
