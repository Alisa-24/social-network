package main

import (
	"fmt"
	"os"

	"backend/internal/db"
)

func main() {
	fmt.Println("Initializing database connection for migrations...")

	// Initialize database
	if err := db.InitDB("./social-network.db"); err != nil {
		fmt.Printf("Failed to initialize database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	fmt.Println("Running migrations...")
	// Run migrations
	if err := db.RunMigrations("./internal/db/migrations/sqlite"); err != nil {
		fmt.Printf("Failed to run migrations: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Migrations completed successfully!")
}
