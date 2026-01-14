package utils

import (
	"encoding/json"
	"net/http"

	"backend/internal/models"
)

func RespondJSON(w http.ResponseWriter, statusCode int, response models.AuthResponse) {
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}
