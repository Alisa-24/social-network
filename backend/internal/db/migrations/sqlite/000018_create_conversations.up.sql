-- Create conversations table to unify group and private chats
-- type: 'group' or 'private'
-- For private chats, the group_id column will be NULL
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('group', 'private')),
    group_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_group_id ON conversations(group_id);
