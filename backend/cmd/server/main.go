package main

import (
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"backend/internal/server"
	"backend/internal/db"
)

func main() {
	// Initialize database
	if err := db.InitDB("./social-network.db"); err != nil {
		panic(fmt.Sprintf("Failed to initialize database: %v", err))
	}
	defer db.Close()

	// Run migrations
	if err := db.RunMigrations("./internal/db/migrations/sqlite"); err != nil {
		panic(fmt.Sprintf("Failed to run migrations: %v", err))
	}

	// Setup HTTP server
	mux := http.NewServeMux()
	server.SetupRoutes(mux)

	handler := server.Cors(mux)

	fmt.Println("✓ Server starting on :8080")

	go func() {
		if err := http.ListenAndServe(":8080", handler); err != nil {
			fmt.Printf("Server error: %v\n", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan

	fmt.Println("\nShutting down server...")
}
