import { API_URL } from "@/lib/config";

export interface PublicProfile {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  avatar?: string;
  aboutMe?: string;
  isPublic: boolean;
  isLocked: boolean;
  createdAt: string;
  followStatus: "none" | "pending" | "accepted";
  followersCount: number;
  followingCount: number;
}

export interface PublicProfileResponse extends PublicProfile {
  success: boolean;
}

/** Fetch a user's public profile by username. */
export async function fetchUserProfile(
  username: string,
): Promise<PublicProfileResponse | null> {
  try {
    const res = await fetch(
      `${API_URL}/api/users/${encodeURIComponent(username)}`,
      { credentials: "include" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data : null;
  } catch {
    return null;
  }
}
