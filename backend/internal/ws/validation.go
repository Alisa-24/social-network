package ws

import (
	"errors"
	"fmt"
	"strings"
	"unicode"

	"github.com/gorilla/websocket"
)

const (
	maxChatMessageLength = 1000
)

func getStringField(msg map[string]interface{}, key string) (string, error) {
	v, ok := msg[key]
	if !ok {
		return "", fmt.Errorf("missing %s", key)
	}

	s, ok := v.(string)
	if !ok {
		return "", fmt.Errorf("%s must be a string", key)
	}

	return s, nil
}

func getPositiveIntField(msg map[string]interface{}, key string) (int, error) {
	v, ok := msg[key]
	if !ok {
		return 0, fmt.Errorf("missing %s", key)
	}

	floatVal, ok := v.(float64)
	if !ok {
		return 0, fmt.Errorf("%s must be a number", key)
	}

	intVal := int(floatVal)
	if float64(intVal) != floatVal || intVal <= 0 {
		return 0, fmt.Errorf("%s must be a positive integer", key)
	}

	return intVal, nil
}

func sanitizeChatContent(raw string) string {
	normalized := strings.ToValidUTF8(raw, "")
	trimmed := strings.TrimSpace(normalized)

	var b strings.Builder
	b.Grow(len(trimmed))
	for _, r := range trimmed {
		if unicode.IsControl(r) && r != '\n' && r != '\t' {
			continue
		}
		b.WriteRune(r)
	}

	return strings.TrimSpace(b.String())
}

func validateAndSanitizeMessageContent(content string) (string, error) {
	clean := sanitizeChatContent(content)
	if clean == "" {
		return "", errors.New("message cannot be empty")
	}

	if len([]rune(clean)) > maxChatMessageLength {
		return "", fmt.Errorf("message exceeds max length of %d characters", maxChatMessageLength)
	}

	return clean, nil
}

func sendWSError(sConn *SafeConn, code, message string) {
	if sConn == nil {
		return
	}

	_ = sConn.WriteJSON(map[string]interface{}{
		"type": "error",
		"error": map[string]interface{}{
			"code":    code,
			"message": message,
		},
	})
}

func closeWithPolicyViolation(sConn *SafeConn, message string) {
	if sConn == nil {
		return
	}

	_ = sConn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.ClosePolicyViolation, message))
	_ = sConn.Conn.Close()
}
