-- Private chat messages table
-- For messages in private (1-to-1) conversations
CREATE TABLE IF NOT EXISTS private_chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for faster lookups
CREATE INDEX idx_private_chat_messages_conversation_id ON private_chat_messages(conversation_id);
CREATE INDEX idx_private_chat_messages_created_at ON private_chat_messages(created_at);
