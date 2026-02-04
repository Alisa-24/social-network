import { API_URL } from "@/lib/config";

// API base URL - uses the same config as the rest of the app
const API_BASE_URL = API_URL;

export interface LikePostResponse {
  success: boolean;
  message?: string;
  likes?: number;
  is_liked?: boolean;
}

export interface CommentResponse {
  success: boolean;
  message?: string;
  comment?: any;
}

/**
 * Toggle like on a post
 * @param postId - The ID of the post to like/unlike
 * @returns Response with updated like status
 */
export const togglePostLike = async (postId: number): Promise<LikePostResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for sending cookies/session
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error toggling post like:', error);
    throw error;
  }
};

/**
 * Get comments for a post
 * @param postId - The ID of the post
 * @returns Response with comments
 */
export const getPostComments = async (postId: number) => {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

/**
 * Add a comment to a post
 * @param postId - The ID of the post
 * @param content - The comment content
 * @returns Response with comment data
 */
export const addComment = async (postId: number, content: string): Promise<CommentResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Delete a post
 * @param postId - The ID of the post to delete
 * @returns Response
 */
export const deletePost = async (postId: number) => {
  try {
    const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};