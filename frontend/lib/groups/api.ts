import { 
  GroupsResponse, 
  CreateGroupResponse, 
  GroupDetailResponse,
  GroupPostsResponse,
  GroupEventsResponse,
  CreateEventRequest,
  InviteUsersRequest,
  JoinRequestRequest
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
  groupId: number, 
  eventId: number, 
  response: "going" | "not-going"
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${API_URL}/${groupId}/events/${eventId}/respond`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ response }),
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
    const response = await fetch(`${API_URL}/${request.groupId}/request`, {
      method: "POST",
      credentials: "include",
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

export async function leaveGroup(groupId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/${groupId}/leave`, {
      method: "POST",
      credentials: "include",
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
