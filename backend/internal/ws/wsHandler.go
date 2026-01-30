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
	cookie, err := r.Cookie("session_id")
	if err != nil {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Not authenticated",
		})
		return
	}

	// Get session from database
	session, err := queries.GetSessionByID(cookie.Value)
	if err != nil {
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

	// Upgrade HTTP connection to WebSocket
	wsConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to upgrade to WebSocket",
		})
		return
	}

	fmt.Printf("WebSocket connected for user %d\n", session.UserID)

	mu.Lock()
	OnlineUsers[session.UserID] = wsConn
	mu.Unlock()

	// Send online users to the newly connected client after a small delay
	go func() {
		time.Sleep(500 * time.Millisecond)
		SendOnlineUsersToClient(wsConn)
	}()

	// Broadcast to all other users that someone new is online
	BroadcastOnlineUsers()

	defer func() {
		mu.Lock()
		delete(OnlineUsers, session.UserID)
		mu.Unlock()
		wsConn.Close()
		fmt.Printf("WebSocket disconnected for user %d\n", session.UserID)
		// Update online users for all clients
		BroadcastOnlineUsers()
	}()

	// Message loop
	for {
		_, data, err := wsConn.ReadMessage()
		if err != nil {
			fmt.Printf("Error reading message from user %d: %v\n", session.UserID, err)
			break
		}

		var msg map[string]interface{}
		if err := json.Unmarshal(data, &msg); err != nil {
			fmt.Printf("Error unmarshaling message: %v\n", err)
			continue
		}

		msgType, ok := msg["type"].(string)
		if !ok {
			fmt.Println("Message type is not a string")
			continue
		}

		fmt.Printf("Received message from user %d: type=%s\n", session.UserID, msgType)

		switch msgType {
		case "get_online_users":
			HandleGetOnlineUsers(wsConn)

		case "group_message":
			HandleGroupMessage(&session, msg)

		default:
			// Unknown message type
			fmt.Printf("Unknown message type from user %d: %s\n", session.UserID, msgType)
		}
	}
}
