package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
)

func FingerprintFromRequest(r *http.Request) string {
	userAgent := r.Header.Get("User-Agent")

	hash := sha256.Sum256([]byte(userAgent))
	return hex.EncodeToString(hash[:])
}
