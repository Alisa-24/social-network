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

type AuthResponse struct {
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
