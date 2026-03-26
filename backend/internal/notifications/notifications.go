package notifications

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strconv"
)

func ListNotifications(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	notifications, err := queries.GetNotifications(userID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to fetch notifications",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"success":       true,
		"notifications": notifications,
	})
}

func MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	if err := r.ParseForm(); err != nil {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid form data",
		})
		return
	}

	notificationID, err := strconv.Atoi(r.FormValue("notification_id"))
	if err != nil || notificationID <= 0 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Invalid notification ID",
		})
		return
	}

	if err := queries.MarkNotificationRead(userID, notificationID); err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to mark notification as read",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "Notification marked as read",
	})
}

func MarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

	userID, ok := utils.GetUserIDFromContext(r)
	if !ok {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Unauthorized",
		})
		return
	}

	if err := queries.MarkAllNotificationsRead(userID); err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to mark all notifications as read",
		})
		return
	}

	utils.RespondJSON(w, http.StatusOK, models.GenericResponse{
		Success: true,
		Message: "All notifications marked as read",
	})
}
