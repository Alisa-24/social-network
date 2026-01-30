package ws

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/gorilla/websocket"
)

var (
	OnlineUsers = make(map[int]*websocket.Conn)
	mu          sync.Mutex
)

// BroadcastToAll sends a message to all connected clients
func BroadcastToAll(message interface{}) {
	data, err := json.Marshal(message)
	if err != nil {
		fmt.Printf("Error marshaling broadcast message: %v\n", err)
		return
	}

	mu.Lock()
	defer mu.Unlock()

	for userID, conn := range OnlineUsers {
		err := conn.WriteMessage(websocket.TextMessage, data)
		if err != nil {
			fmt.Printf("Failed to broadcast to user %d: %v\n", userID, err)
			conn.Close()
			delete(OnlineUsers, userID)
		}
	}
}

// SendOnlineUsersToClient fetches and sends the current online users list to a specific client
func SendOnlineUsersToClient(wsConn *websocket.Conn) {
	mu.Lock()
	var userIDs []int
	for userID := range OnlineUsers {
		userIDs = append(userIDs, userID)
	}
	mu.Unlock()

	var onlineUsersList []models.OnlineUserData
	for _, id := range userIDs {
		user, err := queries.GetUserByID(id)
		if err == nil {
			onlineUsersList = append(onlineUsersList, models.OnlineUserData{
				UserID:    user.ID,
				FirstName: user.FirstName,
				LastName:  user.LastName,
				Nickname:  user.Nickname,
				Avatar:    user.Avatar,
			})
		}
	}

	message := models.OnlineUsersMessage{
		Type:  "online_users",
		Users: onlineUsersList,
	}

	data, err := json.Marshal(message)
	if err != nil {
		fmt.Printf("Error marshaling online users: %v\n", err)
		return
	}

	_ = wsConn.WriteMessage(websocket.TextMessage, data)
}

// BroadcastOnlineUsers notifies all connected clients of the current online users list
func BroadcastOnlineUsers() {
	mu.Lock()
	var userIDs []int
	for userID := range OnlineUsers {
		userIDs = append(userIDs, userID)
	}
	mu.Unlock()

	var onlineUsersList []models.OnlineUserData
	for _, id := range userIDs {
		user, err := queries.GetUserByID(id)
		if err == nil {
			onlineUsersList = append(onlineUsersList, models.OnlineUserData{
				UserID:    user.ID,
				FirstName: user.FirstName,
				LastName:  user.LastName,
				Nickname:  user.Nickname,
				Avatar:    user.Avatar,
			})
		}
	}

	message := models.OnlineUsersMessage{
		Type:  "online_users",
		Users: onlineUsersList,
	}

	BroadcastToAll(message)
}

// HandleGetOnlineUsers specifically handles a client's request to get the current online users
func HandleGetOnlineUsers(wsConn *websocket.Conn) {
	SendOnlineUsersToClient(wsConn)
}
