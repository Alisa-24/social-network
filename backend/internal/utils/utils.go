package utils

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
)

func RespondJSON(w http.ResponseWriter, statusCode int, response interface{}) {
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(response)
}

func GenerateSessionID() string {
	return uuid.New().String()
}
