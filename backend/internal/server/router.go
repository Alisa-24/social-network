package server

import (
	"backend/internal/auth"
	"backend/internal/follow"
	"backend/internal/groups"
	"backend/internal/otp"
	"backend/internal/posts"
	"backend/internal/profile"
	"backend/internal/users"
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

	// ===== PROFILE =====
	authHandle(mux, "PATCH /api/profile/privacy", profile.TogglePrivacyHandler)
	authHandle(mux, "PUT /api/profile", profile.ProfileHandler)
	authHandle(mux, "DELETE /api/profile", profile.ProfileHandler)

	// ===== USERS =====
	// Exact routes must come before the wildcard {username} route
	authHandle(mux, "GET /api/users/search", users.SearchUsersHandler)
	authHandle(mux, "GET /api/users/following", users.GetFollowingHandler)
	authHandle(mux, "GET /api/users/{username}", users.GetPublicProfileHandler)
	authHandle(mux, "GET /api/users/{username}/followers", follow.GetFollowersHandler)
	authHandle(mux, "GET /api/users/{username}/following", follow.GetFollowingListHandler)
	authHandle(mux, "GET /api/users/{username}/posts", posts.GetUserPostsHandler)
	authHandle(mux, "GET /api/users/{username}/stats", users.GetUserStatsHandler)

	// ===== FOLLOW =====
	authHandle(mux, "POST /api/follow/{username}", follow.FollowHandler)
	authHandle(mux, "DELETE /api/follow/{username}", follow.UnfollowHandler)
	authHandle(mux, "GET /api/follow/requests", follow.GetFollowRequestsHandler)
	authHandle(mux, "POST /api/follow/requests/handle", follow.HandleFollowRequestHandler)

	// ===== GROUPS =====
	// List & Create
	authHandle(mux, "POST /api/groups", groups.CreateGroup)
	authHandle(mux, "GET /api/groups", groups.GetGroups)

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
	authHandle(mux, "DELETE /api/groups/events/{id}", groups.DeleteAnEvent)

	// ===== OTP VERIFICATION =====
	authHandle(mux, "POST /api/otp/send", otp.SendOTPHandler)
	authHandle(mux, "POST /api/otp/verify", otp.VerifyOTPHandler)

	// ===== POSTS =====
	authHandle(mux, "GET /api/posts", posts.GetFeedPosts)
	authHandle(mux, "POST /api/posts", posts.CreatePost)
	authHandle(mux, "GET /api/posts/{id}", posts.GetPost)
	authHandle(mux, "PUT /api/posts/{id}", posts.UpdatePost)
	authHandle(mux, "GET /api/posts/{id}/comments", posts.GetComments)
	authHandle(mux, "POST /api/posts/{id}/comments", posts.AddComment)
	authHandle(mux, "DELETE /api/posts/{id}/comments/{commentId}", posts.DeleteComment)
	authHandle(mux, "PUT /api/posts/{id}/comments/{commentId}", posts.UpdateComment)
	authHandle(mux, "GET /api/posts/{id}/comments/{commentId}/replies", posts.GetReplies)
	authHandle(mux, "POST /api/posts/{id}/comments/{commentId}/replies", posts.AddReply)
	authHandle(mux, "POST /posts/{id}/like", groups.PostLike)
	authHandle(mux, "DELETE /posts/{id}", groups.DeletePost)

	// ===== FILES =====
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir("uploads"))))
}
