-- Track private chat pairs to prevent duplicates
-- Ensures only one chat exists per user pair using UNIQUE constraint

CREATE TABLE IF NOT EXISTS private_chat_pairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    min_user_id INTEGER NOT NULL,
    max_user_id INTEGER NOT NULL,
    conversation_id INTEGER NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(min_user_id, max_user_id),
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (min_user_id) REFERENCES users(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (max_user_id) REFERENCES users(id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    
    CHECK (min_user_id < max_user_id)
);

CREATE INDEX IF NOT EXISTS idx_private_chat_pairs_users 
    ON private_chat_pairs(min_user_id, max_user_id);
