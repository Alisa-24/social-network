package models

import (
	"time"
)

type User struct {
	ID          int
	Email       string
	Password    string
	FirstName   string
	LastName    string
	DateOfBirth string
	Nickname    string
	Avatar      string
	AboutMe     string
	IsPublic    bool
	CreatedAt   time.Time
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DateOfBirth string `json:"date_of_birth"`
	Nickname    string `json:"nickname,omitempty"`
	AboutMe     string `json:"about_me,omitempty"`
}

type CreateUserParams struct {
	Email        string
	PasswordHash string
	FirstName    string
	LastName     string
	DateOfBirth  string
	Nickname     string
	Avatar       string
	AboutMe      string
}

type GenericResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	User    *UserPublic `json:"user,omitempty"`
}

type UserPublic struct {
	UserId      int       `json:"userId,omitempty"`
	Email       string    `json:"email"`
	FirstName   string    `json:"firstName"`
	LastName    string    `json:"lastName"`
	DateOfBirth string    `json:"dateOfBirth"`
	Nickname    string    `json:"nickname,omitempty"`
	Avatar      string    `json:"avatar,omitempty"`
	AboutMe     string    `json:"aboutMe,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Session struct {
	ID                 string
	UserID             int
	ExpiresAt          time.Time
	BrowserFingerprint string
}

type OnlineUser struct {
	UserID   int    `json:"user_id"`
	Nickname string `json:"nickname"`
	Online   bool   `json:"online"`
}

type CreateGroupRequest struct {
	Name           string `json:"name"`
	Description    string `json:"description,omitempty"`
	CoverImagePath string `json:"cover_image_path,omitempty"`
	OwnerID        int    `json:"owner_id"`
}

type Group struct {
	ID                int64     `json:"id"`
	Name              string    `json:"name"`
	Description       string    `json:"description"`
	CoverImagePath    string    `json:"cover_image_path"`
	OwnerID           int       `json:"owner_id"`
	CreatedAt         time.Time `json:"created_at"`
	HasPendingRequest bool      `json:"has_pending_request,omitempty"`
}

type GroupsResponse struct {
	Success    bool    `json:"success"`
	UserGroups []Group `json:"userGroups"`
	AllGroups  []Group `json:"allGroups"`
}

type Post struct {
	ID        int64  `json:"id"`
	UserID    int    `json:"user_id"`
	Content   string `json:"content"`
	ImagePath string `json:"image_path,omitempty"`
	Privacy   string `json:"privacy,omitempty"`
	CreatedAt string `json:"created_at"`
}

type Event struct {
	ID            int64  `json:"id"`
	GroupID       int64  `json:"group_id"`
	Title         string `json:"title"`
	Description   string `json:"description,omitempty"`
	ImagePath     string `json:"image_path,omitempty"`
	StartTime     string `json:"start_time"`
	EndTime       string `json:"end_time"`
	CreatedAt     string `json:"created_at"`
	GoingCount    int    `json:"going_count"`
	NotGoingCount int    `json:"not_going_count"`
	UserResponse  string `json:"user_response,omitempty"` // "going", "not-going", or empty
}

type GroupInfo struct {
	ID             int64       `json:"id"`
	Name           string      `json:"name"`
	Description    string      `json:"description,omitempty"`
	CoverImagePath string      `json:"cover_image_path,omitempty"`
	OwnerID        int         `json:"owner_id"`
	CreatedAt      string      `json:"created_at"`
	MembersCount   int         `json:"members_count"`
	IsMember       bool        `json:"is_member"`
	IsOwner        bool        `json:"is_owner"`
	Owner          *UserPublic `json:"owner,omitempty"`
	Posts          []Post      `json:"posts"`
	Events         []Event     `json:"events"`
}

type GroupJoinRequest struct {
	ID        int64       `json:"id"`
	GroupID   int64       `json:"group_id"`
	UserID    int         `json:"user_id"`
	Status    string      `json:"status"`
	CreatedAt time.Time   `json:"created_at"`
	User      *UserPublic `json:"user,omitempty"`
	Group     *Group      `json:"group,omitempty"`
}

type GroupInvitation struct {
	ID          int       `json:"id"`
	GroupID     int64     `json:"group_id"`
	GroupName   string    `json:"group_name"`
	InviterID   int       `json:"inviter_id"`
	InviterName string    `json:"inviter_name"`
	CreatedAt   time.Time `json:"created_at"`
}

type NotificationMessage struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	Timestamp time.Time   `json:"timestamp"`
}

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

type EventRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Date        string `json:"date"`
}

// GroupEvent represents an event created in a group
type GroupEvent struct {
	ID          int64     `json:"id"`
	GroupID     int64     `json:"groupId"`
	CreatorID   int64     `json:"creatorId"`
	Title       string    `json:"title"`
	Description string    `json:"description,omitempty"`
	EventTime   time.Time `json:"eventTime"` // combined date + time
	CoverImage  string    `json:"coverImage,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

// EventResponse represents a user's response to an event
type EventResponse struct {
	EventID   int64     `json:"eventId"`
	UserID    int64     `json:"userId"`
	Response  string    `json:"response"` // "going" or "not-going"
	CreatedAt time.Time `json:"createdAt"`
}

// Optional: Counts for frontend UI
type EventResponseCounts struct {
	EventID  int64 `json:"eventId"`
	Going    int   `json:"going"`
	NotGoing int   `json:"notGoing"`
}
