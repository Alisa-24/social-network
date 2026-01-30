package ws

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"encoding/json"
	"fmt"

	"github.com/gorilla/websocket"
)

// SendOnlineUsersToClient sends the online users list to a specific client
func SendOnlineUsersToClient(conn *websocket.Conn) {
	mu.Lock()
	defer mu.Unlock()

	var onlineUsersList []models.OnlineUserData

	for userID := range OnlineUsers {
		user, err := queries.GetUserByID(userID)
		if err != nil {
			fmt.Printf("Error getting user %d: %v\n", userID, err)
			continue
		}

		onlineUsersList = append(onlineUsersList, models.OnlineUserData{
			UserID:    userID,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Nickname:  user.Nickname,
			Avatar:    user.Avatar,
		})
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

	fmt.Printf("Sending online users to client: %d users\n", len(onlineUsersList))

	err = conn.WriteMessage(1, data)
	if err != nil {
		fmt.Printf("Error sending online users to client: %v\n", err)
	}
}

// BroadcastOnlineUsers sends the online users list to all connected clients
func BroadcastOnlineUsers() {
	mu.Lock()
	defer mu.Unlock()

	var onlineUsersList []models.OnlineUserData

	for userID := range OnlineUsers {
		user, err := queries.GetUserByID(userID)
		if err != nil {
			fmt.Printf("Error getting user %d: %v\n", userID, err)
			continue
		}

		onlineUsersList = append(onlineUsersList, models.OnlineUserData{
			UserID:    userID,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Nickname:  user.Nickname,
			Avatar:    user.Avatar,
		})
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

	fmt.Printf("Broadcasting online users to %d clients: %d users online\n", len(OnlineUsers), len(onlineUsersList))

	for userID, conn := range OnlineUsers {
		err := conn.WriteMessage(1, data)
		if err != nil {
			fmt.Printf("Error broadcasting to user %d: %v\n", userID, err)
			continue
		}
	}
}
