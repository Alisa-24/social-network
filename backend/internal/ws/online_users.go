package ws

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"encoding/json"
	"fmt"
	"sort"
	"sync"

	"github.com/gorilla/websocket"
)

type SafeConn struct {
	Conn *websocket.Conn
	Mu   sync.Mutex
}

func (s *SafeConn) WriteJSON(v interface{}) error {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	return s.Conn.WriteJSON(v)
}

func (s *SafeConn) WriteMessage(messageType int, data []byte) error {
	s.Mu.Lock()
	defer s.Mu.Unlock()
	return s.Conn.WriteMessage(messageType, data)
}

var (
	OnlineUsers = make(map[int]*SafeConn)
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

	for userID, sConn := range OnlineUsers {
		err := sConn.WriteMessage(websocket.TextMessage, data)
		if err != nil {
			fmt.Printf("Failed to broadcast to user %d: %v\n", userID, err)
			sConn.Conn.Close()
			delete(OnlineUsers, userID)
		}
	}
}

// SendOnlineUsersToClient fetches and sends the current online users list to a specific client
func SendOnlineUsersToClient(sConn *SafeConn, currentUserID int) {
	mu.Lock()
	onlineUserIDs := make([]int, 0, len(OnlineUsers))
	for id := range OnlineUsers {
		onlineUserIDs = append(onlineUserIDs, id)
	}
	mu.Unlock()

	// If no online users, send empty list
	if len(onlineUserIDs) == 0 {
		message := map[string]interface{}{
			"type":  "online_users",
			"users": []models.OnlineUserData{},
		}
		_ = sConn.WriteJSON(message)
		return
	}

	// Fetch only online users from DB
	allUsers, err := queries.GetAllUsers()
	if err != nil {
		fmt.Printf("Error fetching users for online list: %v\n", err)
		return
	}

	// Create a map of online user IDs for quick lookup
	onlineMap := make(map[int]bool)
	for _, id := range onlineUserIDs {
		onlineMap[id] = true
	}

	// Build list with only online users
	var userList []models.OnlineUserData
	for _, u := range allUsers {
		if onlineMap[u.ID] {
			userList = append(userList, models.OnlineUserData{
				UserID:    u.ID,
				FirstName: u.FirstName,
				LastName:  u.LastName,
				Nickname:  u.Nickname,
				Avatar:    u.Avatar,
				Online:    true,
			})
		}
	}

	sort.Slice(userList, func(i, j int) bool {
		return userList[i].Nickname < userList[j].Nickname
	})

	message := map[string]interface{}{
		"type":  "online_users",
		"users": userList,
	}

	_ = sConn.WriteJSON(message)
}

// BroadcastOnlineUsers notifies all connected clients of the current online users list
func BroadcastOnlineUsers() {
	mu.Lock()
	onlineUserIDs := make([]int, 0, len(OnlineUsers))
	for id := range OnlineUsers {
		onlineUserIDs = append(onlineUserIDs, id)
	}

	// Copy connections to avoid holding lock during I/O
	type connInfo struct {
		id    int
		sConn *SafeConn
	}
	conns := make([]connInfo, 0, len(OnlineUsers))
	for id, sc := range OnlineUsers {
		conns = append(conns, connInfo{id, sc})
	}
	mu.Unlock()

	// Fetch all online users from DB once
	allUsers, err := queries.GetAllUsers()
	if err != nil {
		fmt.Printf("Error fetching users for broadcast: %v\n", err)
		return
	}

	// Create a map of online user IDs
	onlineMap := make(map[int]bool)
	for _, id := range onlineUserIDs {
		onlineMap[id] = true
	}

	// Build the user list once
	var userList []models.OnlineUserData
	for _, u := range allUsers {
		if onlineMap[u.ID] {
			userList = append(userList, models.OnlineUserData{
				UserID:    u.ID,
				FirstName: u.FirstName,
				LastName:  u.LastName,
				Nickname:  u.Nickname,
				Avatar:    u.Avatar,
				Online:    true,
			})
		}
	}

	sort.Slice(userList, func(i, j int) bool {
		return userList[i].Nickname < userList[j].Nickname
	})

	message := map[string]interface{}{
		"type":  "online_users",
		"users": userList,
	}

	// Send the same message to all connected clients
	for _, info := range conns {
		_ = info.sConn.WriteJSON(message)
	}
}

// HandleGetOnlineUsers specifically handles a client's request to get the current online users
func HandleGetOnlineUsers(sConn *SafeConn, currentUserID int) {
	SendOnlineUsersToClient(sConn, currentUserID)
}
