export interface PrivateConversation {
  id: number;
  type: string;
  group_id: null;
  created_at: string;
  other_user?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    avatar: string;
    nickname: string;
  };
}

export interface PrivateChatMessage {
  id: number;
  conversation_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user: {
    userId: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar: string;
    nickname: string;
  };
}

export interface ChatConversation {
  id: number;
  type: "group" | "private";
  name: string;
  description?: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
}
