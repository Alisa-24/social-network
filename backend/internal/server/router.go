package server

import (
	"backend/internal/auth"
	"backend/internal/groups"
	"backend/internal/ws"
	"net/http"
	"strings"
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

	// Groups - Note: Specific paths MUST come before wildcard paths!

	// Join Group Request
	mux.Handle(
		"/api/groups/join",
		AuthMiddleware(http.HandlerFunc(groups.JoinGroup)),
	)

	// Get Join Requests (for group owners)
	mux.Handle(
		"/api/groups/join-requests",
		AuthMiddleware(http.HandlerFunc(groups.GetJoinRequests)),
	)

	// Handle Join Request (approve/reject)
	mux.Handle(
		"/api/groups/handle-request",
		AuthMiddleware(http.HandlerFunc(groups.HandleJoinRequest)),
	)

	// Leave Group
	mux.Handle(
		"/api/groups/leave",
		AuthMiddleware(http.HandlerFunc(groups.LeaveGroup)),
	)

	// Delete Group
	mux.Handle(
		"/api/groups/delete",
		AuthMiddleware(http.HandlerFunc(groups.DeleteGroup)),
	)

	// Group Posts
	mux.Handle(
		"/api/groups/posts",
		AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost {
				groups.CreateGroupPost(w, r)
			} else if r.Method == http.MethodGet {
				groups.GetGroupPosts(w, r)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		})),
	)

	// Groups list/create
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

	// Group Info (wildcard - must be LAST)
	mux.Handle(
		"/api/groups/",
		AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				groups.GetGroupInfo(w, r)
			} else {
				http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			}
		})),
	)

	// Post Like and Delete
	mux.Handle(
		"/posts/",
		AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Handle /posts/{id}/like and /posts/{id}
			if strings.HasSuffix(r.URL.Path, "/like") && r.Method == http.MethodPost {
				groups.PostLike(w, r)
			} else if r.Method == http.MethodDelete {
				groups.DeletePost(w, r)
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
