package server

import (
	"backend/internal/groups"
	"net/http"
	"strings"
)

func Auth(h http.HandlerFunc) http.Handler {
	return AuthMiddleware(h)
}

func authHandle(mux *http.ServeMux, path string, h http.HandlerFunc) {
	mux.Handle(path, Auth(h))
}

func methodSwitch(method1 string, h1 http.HandlerFunc, method2 string, h2 http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case method1:
			h1(w, r)
		case method2:
			h2(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}
}

func groupWildcard(w http.ResponseWriter, r *http.Request) {

	if strings.HasSuffix(r.URL.Path, "/members") && r.Method == http.MethodGet {
		groups.GetMembers(w, r)
		return
	}

	if strings.Contains(r.URL.Path, "/members/") && r.Method == http.MethodDelete {
		groups.KickMember(w, r)
		return
	}

	if strings.HasSuffix(r.URL.Path, "/invitees") && r.Method == http.MethodGet {
		groups.GetPotentialInvitees(w, r)
		return
	}

	if r.Method == http.MethodGet {
		groups.GetGroupInfo(w, r)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}
