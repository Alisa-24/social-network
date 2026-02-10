package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"net/http"
	"strings"
)

func GroupHandler(w http.ResponseWriter, r *http.Request) {
	method := r.Method
	switch method {
	case http.MethodPost:
		CreateGroup(w, r)
	case http.MethodGet:
		GetGroups(w, r)
	default:
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
	}
}

func CreateGroup(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get session cookie to identify the user
	cookie, err := r.Cookie("session_id")
	if err != nil {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Not authenticated",
		})
		return
	}

	// Get session from database
	session, err := queries.GetSessionByID(cookie.Value)
	if err != nil {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Invalid session",
		})
		return
	}

	// Parse multipart form for file upload
	if err := r.ParseMultipartForm(10 << 20); err != nil { // 10 MB max
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Request too large",
		})
		return
	}

	// Extract form values
	name := strings.TrimSpace(r.FormValue("name"))
	description := strings.TrimSpace(r.FormValue("description"))

	// Validate request
	if name == "" || len(name) > 20 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Group name is required and must be 20 characters or less",
		})
		return
	}

	if description == "" || len(description) > 200 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Description is required and must be 200 characters or less",
		})
		return
	}

	// Handle cover image file upload (optional)
	var coverImagePath string
	file, handler, err := r.FormFile("coverImage")
	if err == nil {
		defer file.Close()

		// Save cover image using utility function
		path, err := utils.SaveUploadedFile(file, handler, "groups")
		if err != nil {
			utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
				Success: false,
				Message: err.Error(),
			})
			return
		}
		coverImagePath = path
	}

	// Create the group in the database
	groupID, err := queries.CreateGroup(name, description, coverImagePath, session.UserID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to create group",
		})
		return
	}

	// Automatically add the creator as a member
	err = queries.AddGroupMember(groupID, session.UserID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to add creator as member",
		})
		return
	}

	utils.RespondJSON(w, http.StatusCreated, map[string]interface{}{
		"success": true,
		"message": "Group created successfully",
		"groupId": groupID,
	})
}

func GetGroups(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get session cookie to identify the user
	cookie, err := r.Cookie("session_id")
	if err != nil {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Not authenticated",
		})
		return
	}

	// Get session from database
	session, err := queries.GetSessionByID(cookie.Value)
	if err != nil {
		utils.RespondJSON(w, http.StatusUnauthorized, models.GenericResponse{
			Success: false,
			Message: "Invalid session",
		})
		return
	}

	// Get user's groups
	userGroups, err := queries.GetUserGroups(session.UserID)
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to fetch user groups",
		})
		return
	}

	// Get all groups
	allGroups, err := queries.GetAllGroups()
	if err != nil {
		utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
			Success: false,
			Message: "Failed to fetch groups",
		})
		return
	}

	// Check for pending requests and pending invitations for each group
	for i := range allGroups {
		hasPendingRequest, err := queries.HasPendingJoinRequest(allGroups[i].ID, session.UserID)
		if err == nil {
			allGroups[i].HasPendingRequest = hasPendingRequest
		}

		hasPendingInvitation, err := queries.HasPendingInvitation(allGroups[i].ID, session.UserID)
		if err == nil {
			allGroups[i].HasPendingInvitation = hasPendingInvitation
		}
	}

	// Return both user's groups and all groups
	utils.RespondJSON(w, http.StatusOK, models.GroupsResponse{
		Success:    true,
		UserGroups: userGroups,
		AllGroups:  allGroups,
	})
}
