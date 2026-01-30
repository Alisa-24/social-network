import { GROUPS_API_URL } from "./config";
import { GroupChatMessage } from "./interface";

export async function fetchGroupMessages(
  groupId: number,
  limit: number = 20,
  offset: number = 0
): Promise<{ success: boolean; messages: GroupChatMessage[] }> {
  try {
    const response = await fetch(
      `${GROUPS_API_URL}/${groupId}/messages?limit=${limit}&offset=${offset}`,
      {
        credentials: "include",
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching group messages:", error);
    return { success: false, messages: [] };
  }
}
