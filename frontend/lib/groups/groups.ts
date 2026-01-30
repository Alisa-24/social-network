/**
 * Groups API: list groups, create group, get group detail, leave group, delete group.
 */

import { GROUPS_API_URL } from "./config";
import type {
  GroupsResponse,
  CreateGroupResponse,
  GroupDetailResponse,
} from "./interface";

export async function fetchGroups(): Promise<GroupsResponse | null> {
  try {
    const response = await fetch(GROUPS_API_URL, {
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

export async function createGroup(
  formData: FormData
): Promise<CreateGroupResponse> {
  try {
    const response = await fetch(GROUPS_API_URL, {
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

export async function fetchGroupDetail(
  groupId: number
): Promise<GroupDetailResponse | null> {
  try {
    const response = await fetch(`${GROUPS_API_URL}/${groupId}`, {
      credentials: "include",
    });

    if (response.status === 403) {
      return {
        success: false,
        error: "You must be a member to view this group",
      } as GroupDetailResponse & { error: string };
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

export async function leaveGroup(
  groupId: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const formData = new FormData();
    formData.append("groupID", groupId.toString());

    const response = await fetch(`${GROUPS_API_URL}/leave`, {
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

export async function deleteGroup(
  groupId: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${GROUPS_API_URL}/delete?groupID=${groupId}`, {
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
