import { GroupsResponse, CreateGroupResponse } from "./interface";

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
