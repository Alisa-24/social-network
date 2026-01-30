import { 
  GroupsResponse, 
  CreateGroupResponse, 
  GroupDetailResponse,
  GroupPostsResponse,
  GroupEventsResponse,
  CreateEventRequest,
  InviteUsersRequest,
  JoinRequestRequest,
  EventVoter
} from "./interface";

const API_URL = "http://localhost:8080/api/groups";

export async function fetchGroups(): Promise<GroupsResponse | null> {
  try {
    const response = await fetch(API_URL, {
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: data.success,
        userGroups: data.userGroups || [],
        allGroups: data.allGroups || [],
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching groups:", error);
    return null;
  }
}

export async function createGroup(formData: FormData): Promise<CreateGroupResponse> {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating group:", error);
    return {
      success: false,
      message: "Failed to create group",
    };
  }
}

export async function fetchGroupDetail(groupId: number): Promise<GroupDetailResponse | null> {
  try {
    const response = await fetch(`${API_URL}/${groupId}`, {
      credentials: "include",
    });

    if (response.status === 403) {
      return { success: false, error: "You must be a member to view this group" } as any;
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data : null;
  } catch (error) {
    console.error("Error fetching group detail:", error);
    return null;
  }
}

export async function fetchGroupPosts(groupId: number): Promise<GroupPostsResponse | null> {
  try {
    const response = await fetch(`${API_URL}/posts?groupID=${groupId}`, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.success ? data : null;
  } catch (error) {
    console.error("Error fetching group posts:", error);
    return null;
  }
}

export async function createGroupPost(
  groupId: number, 
  content: string, 
  imageFile?: File
): Promise<{ success: boolean; message?: string }> {
  try {
    const formData = new FormData();
    formData.append("content", content);
    formData.append("groupID", groupId.toString());
    
    if (imageFile) {
      formData.append("image", imageFile);
    }

    const response = await fetch(`${API_URL}/posts`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating group post:", error);
    return {
      success: false,
      message: "Failed to create post",
    };
  }
}

export async function likeGroupPost(groupId: number, postId: number): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_URL}/${groupId}/posts/${postId}/like`, {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error liking post:", error);
    return { success: false };
  }
}

export async function fetchGroupEvents(groupId: number): Promise<GroupEventsResponse | null> {
  try {
    const response = await fetch(`${API_URL}/${groupId}/events`, {
      credentials: "include",
    });

    const data = await response.json();
    return data.success ? data : null;
  } catch (error) {
    console.error("Error fetching group events:", error);
    return null;
  }
}

export async function createGroupEvent(request: CreateEventRequest): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/${request.groupId}/events`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: request.title,
        description: request.description,
        date: request.date,
        time: request.time,
        imagePath: request.imagePath,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating group event:", error);
    return {
      success: false,
      message: "Failed to create event",
    };
  }
}

export async function respondToEvent(
  eventId: number, 
  response: "going" | "not-going"
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_URL}/events/respond`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event_id: eventId, response }),
    });

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error responding to event:", error);
    return { success: false };
  }
}

export async function inviteUsers(request: InviteUsersRequest): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/${request.groupId}/invite`, {
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

    const response = await fetch(`${API_URL}/join`, {
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
    const response = await fetch(`${API_URL}/join-requests?groupID=${groupId}`, {
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

    const response = await fetch(`${API_URL}/handle-request`, {
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

export async function leaveGroup(groupId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const formData = new FormData();
    formData.append("groupID", groupId.toString());

    const response = await fetch(`${API_URL}/leave`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error leaving group:", error);
    return {
      success: false,
      message: "Failed to leave group",
    };
  }
}

export async function deleteGroup(groupId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/delete?groupID=${groupId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error deleting group:", error);
    return {
      success: false,
      message: "Failed to delete group",
    };
  }
}

export interface PotentialInvitee {
  id: number;
  first_name: string;
  last_name: string;
  avatar: string;
}

export async function fetchPotentialInvitees(
  groupId: number
): Promise<{ success: boolean; users?: PotentialInvitee[]; message?: string }> {
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return { success: false, message: "Invalid group ID" };
  }
  try {
    const response = await fetch(`${API_URL}/${groupId}/invitees`, {
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

    const response = await fetch(`${API_URL}/invite`, {
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
    const response = await fetch(`${API_URL}/invitations`, {
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

    const response = await fetch(`${API_URL}/handle-invitation`, {
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

export async function fetchGroupMembers(groupId: number): Promise<any> {
  try {
    const response = await fetch(`${API_URL}/${groupId}/members`, {
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching members:", error);
    return null;
  }
}

export async function kickGroupMember(
  groupId: number,
  memberId: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/${groupId}/members/${memberId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error kicking member:", error);
    return {
      success: false,
      message: "Failed to kick member",
    };
  }
}

export async function fetchEventVoters(
  eventId: number
): Promise<{ success: boolean; voters?: EventVoter[] }> {
  try {
    const response = await fetch(
      `${API_URL}/events/responses?event_id=${eventId}`,
      {
        credentials: "include",
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching event voters:", error);
    return { success: false };
  }
}
