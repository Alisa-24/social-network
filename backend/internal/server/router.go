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

	// ===== AUTH =====
	mux.HandleFunc("POST /api/auth/register", auth.RegisterHandler)
	mux.HandleFunc("POST /api/auth/login", auth.LoginHandler)
	authHandle(mux, "GET /api/auth/me", auth.MeHandler)
	authHandle(mux, "POST /api/auth/logout", auth.LogoutHandler)

	// ===== GROUPS =====
	// List & Create
	authHandle(mux, "GET /api/groups", groups.GetGroups)
	authHandle(mux, "POST /api/groups", groups.CreateGroup)

	// Group Member Actions
	authHandle(mux, "POST /api/groups/invite", groups.InviteUser)
	authHandle(mux, "POST /api/groups/join", groups.JoinGroup)
	authHandle(mux, "POST /api/groups/leave", groups.LeaveGroup)
	authHandle(mux, "DELETE /api/groups/delete", groups.DeleteGroup)

	// Invitations & Requests
	authHandle(mux, "GET /api/groups/invitations", groups.GetInvitations)
	authHandle(mux, "POST /api/groups/handle-invitation", groups.HandleInvitation)
	authHandle(mux, "GET /api/groups/join-requests", groups.GetJoinRequests)
	authHandle(mux, "POST /api/groups/handle-request", groups.HandleJoinRequest)

	// Group Content (Posts & Messages)
	authHandle(mux, "GET /api/groups/posts", groups.GetGroupPosts)
	authHandle(mux, "POST /api/groups/posts", groups.CreateGroupPost)
	authHandle(mux, "GET /api/groups/{id}/messages", groups.GetGroupChatMessages)

	// Group Metadata & Members
	authHandle(mux, "GET /api/groups/{id}", groups.GetGroupInfo)
	authHandle(mux, "GET /api/groups/{id}/members", groups.GetMembers)
	authHandle(mux, "DELETE /api/groups/{id}/members/{userID}", groups.KickMember)
	authHandle(mux, "GET /api/groups/{id}/invitees", groups.GetPotentialInvitees)

	// Events
	authHandle(mux, "POST /api/groups/events", groups.CreateAnEvent)
	authHandle(mux, "POST /api/groups/events/respond", groups.RespondToEvent)
	authHandle(mux, "GET /api/groups/events/responses", groups.GetEventResponsesHandler)

	// ===== POSTS =====
	authHandle(mux, "POST /posts/{id}/like", groups.PostLike)
	authHandle(mux, "DELETE /posts/{id}", groups.DeletePost)

	// ===== FILES =====
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))
}
