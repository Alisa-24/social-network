package utils

import (
	"encoding/json"
	"net/http"

	"backend/internal/models"
	"github.com/google/uuid"

)

func RespondJSON(w http.ResponseWriter, statusCode int, response models.AuthResponse) {
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

func GenerateSessionID() string {
	return uuid.New().String()
}