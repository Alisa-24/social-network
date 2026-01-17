CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,           -- the user receiving the notification
    actor_id INTEGER,                   -- who triggered the notification (nullable for system notifications)
    type TEXT NOT NULL,                 -- e.g., 'follow_request', 'post_like', 'post_comment'
    read INTEGER DEFAULT 0,             -- 0 = unread, 1 = read
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(actor_id) REFERENCES users(id) ON DELETE SET NULL
);
