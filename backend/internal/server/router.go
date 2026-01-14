package server

import (
	"backend/internal/auth"
	"net/http"
)

func SetupRoutes(mux *http.ServeMux) {
	// Auth routes
	mux.HandleFunc("/api/auth/register", auth.RegisterHandler)
	mux.HandleFunc("/api/auth/login", auth.LoginHandler)
	mux.HandleFunc("/api/auth/logout", auth.LogoutHandler)
	mux.HandleFunc("/api/auth/me", auth.MeHandler)

	// Serve uploaded files
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))
}
