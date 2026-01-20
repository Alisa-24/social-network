package server

import (
	"backend/internal/db/queries"
	"backend/internal/utils"
	"net/http"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// 1. Get session token (example: cookie)
		cookie, err := r.Cookie("session_id")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		session, err := queries.GetSessionByID(cookie.Value)
		if err != nil {
			http.Error(w, "Invalid session", http.StatusUnauthorized)
			return
		}

		// 2. Compute fingerprint from request headers
		currentFP := utils.FingerprintFromRequest(r)

		// 3. Compare
		if session.BrowserFingerprint != currentFP {
			_ = queries.DeleteSession(session.ID)
			http.Error(w, "Session invalidated", http.StatusUnauthorized)
			return
		}

		// 4. Continue to handler
		next.ServeHTTP(w, r)
	})
}
