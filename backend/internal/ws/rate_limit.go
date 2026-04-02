package ws

import (
	"sync"
	"time"
)

const (
	groupMessageMinInterval   = 800 * time.Millisecond
	privateMessageMinInterval = 800 * time.Millisecond
	typingEventMinInterval    = 700 * time.Millisecond
)

var (
	rateMu          sync.Mutex
	userActionTimes = make(map[int]map[string]time.Time)
)

func allowUserAction(userID int, action string, minInterval time.Duration) bool {
	now := time.Now()

	rateMu.Lock()
	defer rateMu.Unlock()

	actions, ok := userActionTimes[userID]
	if !ok {
		actions = make(map[string]time.Time)
		userActionTimes[userID] = actions
	}

	lastAt, exists := actions[action]
	if exists && now.Sub(lastAt) < minInterval {
		return false
	}

	actions[action] = now
	return true
}

func clearUserRateLimits(userID int) {
	rateMu.Lock()
	defer rateMu.Unlock()
	delete(userActionTimes, userID)
}
