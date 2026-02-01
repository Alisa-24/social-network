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
		FROM users WHERE LOWER(email) = LOWER(?)`, email).Scan(
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
		"SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER(?))",
		email,
	).Scan(&exists)
	return exists, err
}

func NicknameExists(nickname string) (bool, error) {
	var exists bool
	err := DB.QueryRow(
		"SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(nickname) = LOWER(?))",
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

func GetAllUsers() ([]models.User, error) {
	rows, err := DB.Query(`
		SELECT 
			id, 
			email, 
			first_name, 
			last_name, 
			COALESCE(nickname, '') as nickname, 
			COALESCE(avatar, '') as avatar, 
			created_at
		FROM users`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		var nickname sql.NullString
		var avatar sql.NullString

		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.FirstName,
			&user.LastName,
			&nickname,
			&avatar,
			&user.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if nickname.Valid {
			user.Nickname = nickname.String
		}
		if avatar.Valid {
			user.Avatar = avatar.String
		}

		users = append(users, user)
	}
	return users, nil
}
