package queries

import (
	"backend/internal/models"
	"database/sql"
)

var DB *sql.DB

func GetUserByEmail(email string) (models.User, error) {
	var user models.User
	err := DB.QueryRow(`
		SELECT 
			id, 
			email, 
			password_hash, 
			first_name, 
			last_name, 
			date_of_birth, 
			COALESCE(nickname, '') as nickname, 
			COALESCE(avatar, '') as avatar, 
			COALESCE(about_me, '') as about_me, 
			is_public, 
			created_at
		FROM users WHERE email = ?`, email).Scan(
		&user.ID,
		&user.Email,
		&user.Password,
		&user.FirstName,
		&user.LastName,
		&user.DateOfBirth,
		&user.Nickname,
		&user.Avatar,
		&user.AboutMe,
		&user.IsPublic,
		&user.CreatedAt,
	)
	return user, err
}

func EmailExists(email string) (bool, error) {
	var exists bool
	err := DB.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM users WHERE email = ?)",
		email,
	).Scan(&exists)
	return exists, err
}

func NicknameExists(nickname string) (bool, error) {
	var exists bool
	err := DB.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM users WHERE nickname = ?)",
		nickname,
	).Scan(&exists)
	return exists, err
}

func CreateUser(p models.CreateUserParams) error {
	_, err := DB.Exec(`
		INSERT INTO users (
			email, password_hash, first_name, last_name,
			date_of_birth, nickname, avatar, about_me
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`,
		p.Email,
		p.PasswordHash,
		p.FirstName,
		p.LastName,
		p.DateOfBirth,
		p.Nickname,
		p.Avatar,
		p.AboutMe,
	)
	return err
}

func GetUserByID(id int) (models.User, error) {
	var user models.User
	err := DB.QueryRow(`
		SELECT 
			id, 
			email, 
			password_hash, 
			first_name, 
			last_name, 
			date_of_birth, 
			COALESCE(nickname, '') as nickname, 
			COALESCE(avatar, '') as avatar, 
			COALESCE(about_me, '') as about_me, 
			is_public, 
			created_at
		FROM users WHERE id = ?`, id).Scan(
		&user.ID,
		&user.Email,
		&user.Password,
		&user.FirstName,
		&user.LastName,
		&user.DateOfBirth,
		&user.Nickname,
		&user.Avatar,
		&user.AboutMe,
		&user.IsPublic,
		&user.CreatedAt,
	)
	return user, err
}
