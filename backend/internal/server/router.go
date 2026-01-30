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

	// ===== AUTH =====
	mux.HandleFunc("/api/auth/register", auth.RegisterHandler)
	mux.HandleFunc("/api/auth/login", auth.LoginHandler)
	mux.Handle("/api/auth/me", Auth(auth.MeHandler))
	mux.Handle("/api/auth/logout", Auth(auth.LogoutHandler))

	// ===== GROUP ACTIONS =====
	authHandle(mux, "/api/groups/invite", groups.InviteUser)
	authHandle(mux, "/api/groups/events", groups.CreateAnEvent)
	authHandle(mux, "/api/groups/invitations", groups.GetInvitations)
	authHandle(mux, "/api/groups/handle-invitation", groups.HandleInvitation)
	authHandle(mux, "/api/groups/join", groups.JoinGroup)
	authHandle(mux, "/api/groups/join-requests", groups.GetJoinRequests)
	authHandle(mux, "/api/groups/handle-request", groups.HandleJoinRequest)
	authHandle(mux, "/api/groups/leave", groups.LeaveGroup)
	authHandle(mux, "/api/groups/delete", groups.DeleteGroup)

	// ===== GROUP POSTS =====
	mux.Handle("/api/groups/posts", Auth(http.HandlerFunc(methodSwitch(
		http.MethodGet, groups.GetGroupPosts,
		http.MethodPost, groups.CreateGroupPost,
	))))

	// ===== GROUP LIST / CREATE =====
	mux.Handle("/api/groups", Auth(http.HandlerFunc(methodSwitch(
		http.MethodGet, groups.GetGroups,
		http.MethodPost, groups.CreateGroup,
	))))

	// ===== GROUP WILDCARD (LAST) =====
	mux.Handle("/api/groups/", Auth(http.HandlerFunc(groupWildcard)))

	// ===== EVENT RESPONSES =====
	// Using a specific path to avoid wildcard conflict if possible, or handle it inside wildcard.
	// But /groups/events/respond is not covered by /groups/events (which is a specific handler).
	// Let's rely on exact match or appropriate prefix.
	// Note: /api/groups/events is registered. /api/groups/events/respond should also work if mux supports it (ServeMux pattern matching).
	authHandle(mux, "/api/groups/events/respond", groups.RespondToEvent)
	authHandle(mux, "/api/groups/events/responses", groups.GetEventResponsesHandler)

	// ===== POSTS =====
	mux.Handle("/posts/", Auth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/like") && r.Method == http.MethodPost {
			groups.PostLike(w, r)
			return
		}
		if r.Method == http.MethodDelete {
			groups.DeletePost(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})))

	// ===== FILES =====
	mux.Handle("/uploads/",
		http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))),
	)
}
