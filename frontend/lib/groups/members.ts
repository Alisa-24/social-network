import { GROUPS_API_URL } from "./config";
import { 
  InviteUsersRequest, 
  JoinRequestRequest, 
  GroupInvitation, 
  GroupJoinRequest 
} from "./interface";

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

export interface PotentialInvitee {
  id: number;
  first_name: string;
  last_name: string;
  avatar: string;
}

export async function fetchGroupMembers(groupId: number): Promise<GroupMembersResponse> {
  try {
    const response = await fetch(`${GROUPS_API_URL}/${groupId}/members`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
        // Return null or throw depending on consistency. api.ts returned null or object.
        // Keeping consistenty with passed api.ts logic
        return { success: false, message: `HTTP error! status: ${response.status}` };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching group members:', error);
    return { success: false, message: "Failed to fetch members" };
  }
}

export async function kickGroupMember(
  groupId: number,
  memberId: number
): Promise<KickMemberResponse> {
  try {
    const response = await fetch(`${GROUPS_API_URL}/${groupId}/members/${memberId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error kicking member:', error);
    return { success: false, message: "Failed to kick member" };
  }
}

export async function inviteUsers(request: InviteUsersRequest): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${GROUPS_API_URL}/${request.groupId}/invite`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userIds: request.userIds }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error inviting users:", error);
    return {
      success: false,
      message: "Failed to send invitations",
    };
  }
}

export async function requestToJoin(request: JoinRequestRequest): Promise<{ success: boolean; message?: string }> {
  try {
    const formData = new FormData();
    formData.append("groupID", request.groupId.toString());

    const response = await fetch(`${GROUPS_API_URL}/join`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error requesting to join group:", error);
    return {
      success: false,
      message: "Failed to send join request",
    };
  }
}

export async function fetchJoinRequests(groupId: number): Promise<any> {
  try {
    const response = await fetch(`${GROUPS_API_URL}/join-requests?groupID=${groupId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching join requests:", error);
    return null;
  }
}

export async function handleJoinRequest(
  requestId: number, 
  action: "approve" | "reject"
): Promise<{ success: boolean; message?: string }> {
  try {
    const formData = new FormData();
    formData.append("requestID", requestId.toString());
    formData.append("action", action);

    const response = await fetch(`${GROUPS_API_URL}/handle-request`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error handling join request:", error);
    return {
      success: false,
      message: "Failed to handle join request",
    };
  }
}

export async function fetchPotentialInvitees(
  groupId: number
): Promise<{ success: boolean; users?: PotentialInvitee[]; message?: string }> {
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return { success: false, message: "Invalid group ID" };
  }
  try {
    const response = await fetch(`${GROUPS_API_URL}/${groupId}/invitees`, {
      credentials: "include",
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, message: (data as { message?: string }).message ?? "Failed to fetch invitees" };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching potential invitees:", error);
    return {
      success: false,
      message: "Failed to fetch users to invite",
    };
  }
}

export async function inviteUserToGroup(
  groupId: number,
  inviteeId: number
): Promise<{ success: boolean; message?: string }> {
  if (!Number.isInteger(groupId) || groupId <= 0 || !Number.isInteger(inviteeId) || inviteeId <= 0) {
    return { success: false, message: "Invalid group ID or user ID" };
  }
  try {
    const body = new URLSearchParams();
    body.set("group_id", String(groupId));
    body.set("invitee_id", String(inviteeId));

    const response = await fetch(`${GROUPS_API_URL}/invite`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error inviting user:", error);
    return {
      success: false,
      message: "Failed to invite user",
    };
  }
}

export async function fetchGroupInvitations(): Promise<any> {
  try {
    const response = await fetch(`${GROUPS_API_URL}/invitations`, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return null;
  }
}

export async function handleGroupInvitation(
  invitationId: number,
  action: "accept" | "decline"
): Promise<{ success: boolean; message?: string }> {
  if (!Number.isInteger(invitationId) || invitationId <= 0) {
    return { success: false, message: "Invalid invitation ID" };
  }
  if (action !== "accept" && action !== "decline") {
    return { success: false, message: "Invalid action" };
  }
  try {
    const body = new URLSearchParams();
    body.set("invitation_id", String(invitationId));
    body.set("action", action);

    const response = await fetch(`${GROUPS_API_URL}/handle-invitation`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error handling invitation:", error);
    return {
      success: false,
      message: "Failed to handle invitation",
    };
  }
}