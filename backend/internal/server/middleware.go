package server

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"context"
	"net/http"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// 1. Get session token (example: cookie)
		cookie, err := r.Cookie("session_id")
		if err != nil {
			utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
				Success: false,
				Message: "Unauthorized",
			})
			return
		}

		session, err := queries.GetSessionByID(cookie.Value)
		if err != nil {
			utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
				Success: false,
				Message: "Invalid session",
			})
			return
		}

		// 2. Compute fingerprint from request headers
		currentFP := utils.FingerprintFromRequest(r)

		// 3. Compare
		if session.BrowserFingerprint != currentFP {
			_ = queries.DeleteSession(session.ID)
			utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
				Success: false,
				Message: "Session invalidated",
			})
			return
		}

		// 4. Add userID to context
		ctx := context.WithValue(r.Context(), "userID", session.UserID)
		r = r.WithContext(ctx)

		// 5. Continue to handler
		next.ServeHTTP(w, r)
	})
}
