package main

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"
)

type SeedUser struct {
	Email       string
	Password    string
	FirstName   string
	LastName    string
	DateOfBirth string
	Nickname    string
	AboutMe     string
}

func main() {
	db, err := sql.Open("sqlite3", "./social-network.db")
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}
	defer db.Close()

	users := []SeedUser{
		{
			Email:       "john.doe@example.com",
			Password:    "password123",
			FirstName:   "John",
			LastName:    "Doe",
			DateOfBirth: "1990-05-15",
			Nickname:    "johndoe",
			AboutMe:     "Software developer passionate about technology and innovation.",
		},
		{
			Email:       "jane.smith@example.com",
			Password:    "password123",
			FirstName:   "Jane",
			LastName:    "Smith",
			DateOfBirth: "1992-08-22",
			Nickname:    "janesmith",
			AboutMe:     "Designer and creative thinker. Love coffee and minimalism.",
		},
		{
			Email:       "mike.wilson@example.com",
			Password:    "password123",
			FirstName:   "Mike",
			LastName:    "Wilson",
			DateOfBirth: "1988-12-10",
			Nickname:    "mikew",
			AboutMe:     "Fitness enthusiast and outdoor adventurer.",
		},
		{
			Email:       "sarah.johnson@example.com",
			Password:    "password123",
			FirstName:   "Sarah",
			LastName:    "Johnson",
			DateOfBirth: "1995-03-18",
			Nickname:    "sarahj",
			AboutMe:     "Travel blogger exploring the world one city at a time.",
		},
		{
			Email:       "alex.brown@example.com",
			Password:    "password123",
			FirstName:   "Alex",
			LastName:    "Brown",
			DateOfBirth: "1993-07-25",
			Nickname:    "alexb",
			AboutMe:     "Music producer and audio engineer.",
		},
		{
			Email:       "emily.davis@example.com",
			Password:    "password123",
			FirstName:   "Emily",
			LastName:    "Davis",
			DateOfBirth: "1991-11-30",
			Nickname:    "emilyd",
			AboutMe:     "Food enthusiast and amateur chef. Always trying new recipes!",
		},
		{
			Email:       "chris.martinez@example.com",
			Password:    "password123",
			FirstName:   "Chris",
			LastName:    "Martinez",
			DateOfBirth: "1989-04-08",
			Nickname:    "chrism",
			AboutMe:     "Gaming streamer and tech reviewer.",
		},
		{
			Email:       "lisa.taylor@example.com",
			Password:    "password123",
			FirstName:   "Lisa",
			LastName:    "Taylor",
			DateOfBirth: "1994-09-14",
			Nickname:    "lisat",
			AboutMe:     "Photographer capturing life's beautiful moments.",
		},
		{
			Email:       "david.anderson@example.com",
			Password:    "password123",
			FirstName:   "David",
			LastName:    "Anderson",
			DateOfBirth: "1987-06-21",
			Nickname:    "davida",
			AboutMe:     "Entrepreneur and startup mentor.",
		},
		{
			Email:       "olivia.thomas@example.com",
			Password:    "password123",
			FirstName:   "Olivia",
			LastName:    "Thomas",
			DateOfBirth: "1996-01-12",
			Nickname:    "oliviat",
			AboutMe:     "Artist and illustrator. Bringing imagination to life.",
		},
	}

	fmt.Println("Starting database seeding...")
	fmt.Println("=" + string(make([]byte, 50)) + "=")

	createdCount := 0
	skippedCount := 0

	for _, user := range users {
		// Check if user already exists
		var exists bool
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER(?))", user.Email).Scan(&exists)
		if err != nil {
			log.Printf("❌ Error checking existence for %s: %v\n", user.Email, err)
			continue
		}

		if exists {
			fmt.Printf("⏭Skipping %s %s (%s) - already exists\n", user.FirstName, user.LastName, user.Email)
			skippedCount++
			continue
		}

		// Hash password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("❌ Error hashing password for %s: %v\n", user.Email, err)
			continue
		}

		// Insert user
		_, err = db.Exec(`
			INSERT INTO users (email, password_hash, first_name, last_name, date_of_birth, nickname, about_me, is_public, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
		`, user.Email, string(hashedPassword), user.FirstName, user.LastName, user.DateOfBirth, user.Nickname, user.AboutMe, time.Now())

		if err != nil {
			log.Printf("❌ Error creating user %s: %v\n", user.Email, err)
			continue
		}

		fmt.Printf("✅ Created user: %s %s (%s)\n", user.FirstName, user.LastName, user.Email)
		createdCount++
	}

	fmt.Println("=" + string(make([]byte, 50)) + "=")
	fmt.Printf("🎉 Seeding completed!\n")
	fmt.Printf("   ✅ Created: %d users\n", createdCount)
	fmt.Printf("   ⏭️  Skipped: %d users (already exist)\n", skippedCount)
	fmt.Printf("   📊 Total: %d users\n\n", len(users))
	fmt.Println("💡 All users have the password: password123")
	fmt.Println("🔐 You can login with any of the emails listed above")
}
