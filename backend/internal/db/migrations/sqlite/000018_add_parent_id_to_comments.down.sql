CREATE TABLE comments_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO comments_new SELECT id, post_id, user_id, content, created_at FROM comments;
DROP TABLE comments;
ALTER TABLE comments_new RENAME TO comments;
