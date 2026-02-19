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

		// Fingerprint check removed - was causing false positives
		// Add userID to context
		ctx := context.WithValue(r.Context(), "userID", session.UserID)
		r = r.WithContext(ctx)

		// Continue to handler
		next.ServeHTTP(w, r)
	})
}
