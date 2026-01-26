package groups

import (
	"backend/internal/db/queries"
	"backend/internal/models"
	"backend/internal/utils"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

func CreateGroup(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

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

	if description == "" || len(description) > 100 {
		utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
			Success: false,
			Message: "Description is required and must be 100 characters or less",
		})
		return
	}

	// Handle cover image file upload (optional)
	var coverImagePath string
	file, handler, err := r.FormFile("coverImage")
	if err == nil {
		defer file.Close()

		// Validate file type
		contentType := handler.Header.Get("Content-Type")
		allowedTypes := map[string]bool{
			"image/jpeg": true,
			"image/jpg":  true,
			"image/png":  true,
			"image/webp": true,
			"image/gif":  true,
		}

		if !allowedTypes[contentType] {
			utils.RespondJSON(w, http.StatusBadRequest, models.GenericResponse{
				Success: false,
				Message: "Cover image must be JPEG, PNG, WebP, or GIF",
			})
			return
		}

		// Generate unique filename
		ext := filepath.Ext(handler.Filename)
		filename := fmt.Sprintf("%d_%s%s", time.Now().Unix(), utils.GenerateSessionID(), ext)
		coverImagePath = "/uploads/groups/" + filename

		// Ensure uploads/groups directory exists
		if err := os.MkdirAll("uploads/groups", 0755); err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to create uploads directory",
			})
			return
		}

		// Save file to disk
		dst, err := os.Create(filepath.Join("uploads", "groups", filename))
		if err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to save cover image",
			})
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			utils.RespondJSON(w, http.StatusInternalServerError, models.GenericResponse{
				Success: false,
				Message: "Failed to save cover image",
			})
			return
		}
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

	utils.RespondJSON(w, http.StatusCreated, models.GenericResponse{
		Success: true,
		Message: "Group created successfully",
	})
}

func GetGroups(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodGet {
		utils.RespondJSON(w, http.StatusMethodNotAllowed, models.GenericResponse{
			Success: false,
			Message: "Method not allowed",
		})
		return
	}

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

	// Return both user's groups and all groups
	utils.RespondJSON(w, http.StatusOK, models.GroupsResponse{
		Success:    true,
		UserGroups: userGroups,
		AllGroups:  allGroups,
	})
}
