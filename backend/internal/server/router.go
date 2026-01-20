package server

import (
	"backend/internal/auth"
	"net/http"
)

func SetupRoutes(mux *http.ServeMux) {

	// Public
	mux.HandleFunc("/api/auth/register", auth.RegisterHandler)
	mux.HandleFunc("/api/auth/login", auth.LoginHandler)

	// Protected
	mux.Handle(
		"/api/auth/me",
		AuthMiddleware(http.HandlerFunc(auth.MeHandler)),
	)

	mux.Handle(
		"/api/auth/logout",
		AuthMiddleware(http.HandlerFunc(auth.LogoutHandler)),
	)

	// Files
	mux.Handle(
		"/uploads/",
		http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))),
	)
}
