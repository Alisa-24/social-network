import { API_URL } from "@/lib/config";

export interface UserSearchResult {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  avatar?: string;
  aboutMe?: string;
  isPublic: boolean;
}

export interface SearchUsersResponse {
  success: boolean;
  users: UserSearchResult[];
}

async function fetchUsers(q: string): Promise<UserSearchResult[]> {
  try {
    const res = await fetch(
      `${API_URL}/api/users/search?q=${encodeURIComponent(q)}`,
      { credentials: "include" },
    );
    const data: SearchUsersResponse = await res.json();
    return data.success ? (data.users ?? []) : [];
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

/** Fetches 5 random suggested users shown before any search. */
export async function fetchSuggestedUsers(): Promise<UserSearchResult[]> {
  return fetchUsers("");
}

/** Searches users by name / username / nickname. */
export async function searchUsers(term: string): Promise<UserSearchResult[]> {
  return fetchUsers(term.trim());
}
