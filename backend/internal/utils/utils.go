package utils

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
)

func RespondJSON(w http.ResponseWriter, statusCode int, response interface{}) {
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

func ParseJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

func GenerateSessionID() string {
	return uuid.New().String()
}

func GetUserIDFromContext(r *http.Request) (int, bool) {
	userID, ok := r.Context().Value("userID").(int)
	return userID, ok
}

type RequestValidator func(groupID int64, userID int) (bool, error)

func ValidateUserForJoinRequest(r *http.Request, groupID int64, isMemberCheck RequestValidator, hasPendingRequestCheck RequestValidator) error {
	// Check if user is authenticated
	userID, ok := GetUserIDFromContext(r)
	if !ok || userID == 0 {
		return errors.New("user not authenticated")
	}

	// Check if user is already a member
	isMember, err := isMemberCheck(groupID, userID)
	if err != nil {
		return errors.New("failed to check membership status")
	}
	if isMember {
		return errors.New("user is already a member of this group")
	}

	// Check if user already has a pending request
	hasPending, err := hasPendingRequestCheck(groupID, userID)
	if err != nil {
		return errors.New("failed to check pending requests")
	}
	if hasPending {
		return errors.New("user already has a pending join request for this group")
	}

	return nil
}

func ValidateUserCanPostOrCreateEvent(r *http.Request, groupID int64, isMemberCheck RequestValidator) error {
	// Check if user is authenticated
	userID, ok := GetUserIDFromContext(r)
	if !ok || userID == 0 {
		return errors.New("user not authenticated")
	}

	// Check if user is a member of the group
	isMember, err := isMemberCheck(groupID, userID)
	if err != nil {
		return errors.New("failed to check membership status")
	}
	if !isMember {
		return errors.New("only group members can post or create events")
	}

	return nil
}

// SaveUploadedFile saves an uploaded file to the specified directory
// Returns the path in the format /uploads/{directory}/{filename}
func SaveUploadedFile(file multipart.File, header *multipart.FileHeader, directory string) (string, error) {
	// Validate file type
	contentType := header.Header.Get("Content-Type")
	allowedTypes := map[string]bool{
		"image/jpeg": true,
		"image/jpg":  true,
		"image/png":  true,
		"image/webp": true,
		"image/gif":  true,
	}

	if !allowedTypes[contentType] {
		return "", errors.New("file must be JPEG, PNG, WebP, or GIF")
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("%d_%s%s", time.Now().Unix(), GenerateSessionID(), ext)

	// Ensure directory exists
	uploadPath := filepath.Join("uploads", directory)
	if err := os.MkdirAll(uploadPath, 0755); err != nil {
		return "", errors.New("failed to create upload directory")
	}

	// Save file to disk
	dst, err := os.Create(filepath.Join(uploadPath, filename))
	if err != nil {
		return "", errors.New("failed to create file")
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		return "", errors.New("failed to save file")
	}

	return "/uploads/" + directory + "/" + filename, nil
}
