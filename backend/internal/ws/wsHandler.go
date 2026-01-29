package ws

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var (
	OnlineUsers = make(map[int]*websocket.Conn)
	mu          sync.Mutex
)

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
	mu.Lock()
	OnlineUsers[session.UserID] = wsConn
	mu.Unlock()

	BroadcastOnlineUsers()
	defer func() {
		mu.Lock()
		delete(OnlineUsers, session.UserID)
		mu.Unlock()
		wsConn.Close()
		//update online users for all clients
		BroadcastOnlineUsers()
	}()

	for {
		_, data, err := wsConn.ReadMessage()
		if err != nil {
			break
		}

		var msg map[string]interface{}
		json.Unmarshal(data, &msg)

		switch msg["type"] {
		default:
			// Unknown message type
			fmt.Println("Unknown message type:", msg["type"])
		}

	}
}

// SendNotificationToUser sends a notification to a specific user via WebSocket
func SendNotificationToUser(userID int, notification models.NotificationMessage) {
	mu.Lock()
	conn, ok := OnlineUsers[userID]
	mu.Unlock()

	if !ok {
		return
	}

	data, err := json.Marshal(notification)
	if err != nil {
		return
	}

	err = conn.WriteMessage(websocket.TextMessage, data)
	if err != nil {
		// Connection might be closed, remove from online users
		mu.Lock()
		delete(OnlineUsers, userID)
		mu.Unlock()
	} else {
		fmt.Printf("Successfully sent notification to user %d\n", userID)
	}
}
