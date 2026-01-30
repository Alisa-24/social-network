import { API_URL } from "../config";

export interface GroupMember {
  ID: number;
  FirstName: string;
  LastName: string;
  Avatar: string;
  Role: "owner" | "member";
  JoinedAt: string;
}

export interface GroupMembersResponse {
  success: boolean;
  members?: GroupMember[];
  message?: string;
}

export interface KickMemberResponse {
  success: boolean;
  message?: string;
}


export const fetchGroupMembers = async (groupId: number): Promise<GroupMembersResponse> => {
  try {
    const response = await fetch(`${API_URL}/api/groups/${groupId}/members`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching group members:', error);
    throw error;
  }
};


export const kickGroupMember = async (
  groupId: number,
  userId: number
): Promise<KickMemberResponse> => {
  try {
    const response = await fetch(`${API_URL}/api/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error kicking member:', error);
    throw error;
  }
};