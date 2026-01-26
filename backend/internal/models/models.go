package models

import "time"

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
	ID             int64
	Name           string
	Description    string
	CoverImagePath string
	OwnerID        int
	CreatedAt      time.Time
}

type GroupsResponse struct {
	Success    bool    `json:"success"`
	UserGroups []Group `json:"userGroups"`
	AllGroups  []Group `json:"allGroups"`
}
