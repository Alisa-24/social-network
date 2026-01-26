package server

import (
	"backend/internal/auth"
	"backend/internal/groups"
	"backend/internal/ws"
	"net/http"
)

func SetupRoutes(mux *http.ServeMux) {

	// WebSocket
	mux.HandleFunc("/ws", ws.WSHandler)

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

	// Groups
	mux.Handle(
		"/api/groups",
		AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost {
				groups.CreateGroup(w, r)
			} else if r.Method == http.MethodGet {
				groups.GetGroups(w, r)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		})),
	)

	// Files
	mux.Handle(
		"/uploads/",
		http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))),
	)
}
