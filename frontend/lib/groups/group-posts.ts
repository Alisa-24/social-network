/**
 * Group posts API: fetch posts in a group, create post, like post.
 */

import { GROUPS_API_URL } from "./config";
import type { GroupPostsResponse } from "./interface";

export async function fetchGroupPosts(
  groupId: number
): Promise<GroupPostsResponse | null> {
  try {
    const response = await fetch(
      `${GROUPS_API_URL}/posts?groupID=${groupId}`,
      { credentials: "include" }
    );

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

    const response = await fetch(`${GROUPS_API_URL}/posts`, {
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

export async function likeGroupPost(
  groupId: number,
  postId: number
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(
      `${GROUPS_API_URL}/${groupId}/posts/${postId}/like`,
      { method: "POST", credentials: "include" }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error liking post:", error);
    return { success: false };
  }
}
