import { API_URL } from "@/lib/config";
import { PrivateConversation, PrivateChatMessage, ChatConversation } from "./interface";
import { UserSearchResult } from "@/lib/users/search";

const CHAT_API_URL = `${API_URL}/api/chats`;

export async function fetchPrivateConversations(): Promise<PrivateConversation[]> {
  try {
    const response = await fetch(`${CHAT_API_URL}/private`, {
      credentials: "include",
    });
    const data = await response.json();
    // Response is an array of conversations
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Error fetching private conversations:", error);
    return [];
  }
}

export async function fetchPrivateMessages(
  conversationId: number,
  limit: number = 5,
  offset: number = 0
): Promise<PrivateChatMessage[]> {
  try {
    const response = await fetch(
      `${CHAT_API_URL}/private/${conversationId}/messages?limit=${limit}&offset=${offset}`,
      {
        credentials: "include",
      }
    );
    const data = await response.json();
    return Array.isArray(data) ? data : (data?.messages ?? []);
  } catch (error) {
    console.error("Error fetching private messages:", error);
    return [];
  }
}

export async function getOrCreatePrivateChat(userId: number): Promise<number> {
  try {
    const response = await fetch(`${CHAT_API_URL}/private/start/${userId}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data.conversation_id;
  } catch (error) {
    console.error("Error creating private chat:", error);
    throw error;
  }
}

export async function fetchContacts(): Promise<UserSearchResult[]> {
  try {
    const response = await fetch(`${API_URL}/api/users/contacts`, {
      credentials: "include",
    });
    const data = await response.json();
    return data.success ? (data.users ?? []) : [];
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }
}
