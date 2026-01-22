package ws

import (
	"backend/internal/db/queries"
	"encoding/json"
)

type OnlineUserData struct {
	UserID    int    `json:"userId"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Nickname  string `json:"nickname,omitempty"`
	Avatar    string `json:"avatar,omitempty"`
}

type OnlineUsersMessage struct {
	Type  string           `json:"type"`
	Users []OnlineUserData `json:"users"`
}

func BroadcastOnlineUsers() {
	mu.Lock()
	defer mu.Unlock()

	var onlineUsersList []OnlineUserData

	for userID := range OnlineUsers {
		user, err := queries.GetUserByID(userID)
		if err != nil {
			continue
		}

		onlineUsersList = append(onlineUsersList, OnlineUserData{
			UserID:    userID,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Nickname:  user.Nickname,
			Avatar:    user.Avatar,
		})
	}

	message := OnlineUsersMessage{
		Type:  "online_users",
		Users: onlineUsersList,
	}

	data, err := json.Marshal(message)
	if err != nil {
		return
	}

	for _, conn := range OnlineUsers {
		err := conn.WriteMessage(1, data)
		if err != nil {
			continue
		}
	}
}
