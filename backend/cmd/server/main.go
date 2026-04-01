package main

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"backend/internal/db"
	"backend/internal/server"
)

// loadEnv reads a .env file and sets environment variables.
func loadEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			os.Setenv(strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1]))
		}
	}
}

func main() {
	// Load environment variables
	loadEnv(".env")

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
