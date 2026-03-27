import { API_URL } from "@/lib/config";

export interface PostAuthor {
  userId: number;
  username: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  avatar?: string;
}

export interface FeedPost {
  id: number;
  user_id: number;
  content: string;
  image_path?: string;
  privacy: "public" | "followers" | "selected";
  created_at: string;
  author: PostAuthor;
  likes: number;
  is_liked: boolean;
  comments_count: number;
}

export interface PostComment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  author?: PostAuthor;
}

export async function getFeedPosts(): Promise<FeedPost[]> {
  const res = await fetch(`${API_URL}/api/posts`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch posts");
  const data = await res.json();
  return data.posts ?? [];
}

export async function createPost(
  content: string,
  privacy: string,
  image?: File
): Promise<{ post_id: number }> {
  const form = new FormData();
  form.append("content", content);
  form.append("privacy", privacy);
  if (image) form.append("image", image);

  const res = await fetch(`${API_URL}/api/posts`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message ?? "Failed to create post");
  }
  return res.json();
}

export async function updatePost(
  postId: number,
  content: string,
  privacy: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/posts/${postId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, privacy }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message ?? "Failed to update post");
  }
}

export async function deletePost(postId: number): Promise<void> {
  const res = await fetch(`${API_URL}/posts/${postId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete post");
}

export async function toggleLike(
  postId: number
): Promise<{ is_liked: boolean; likes: number }> {
  const res = await fetch(`${API_URL}/posts/${postId}/like`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to toggle like");
  return res.json();
}

export async function getComments(postId: number): Promise<PostComment[]> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch comments");
  const data = await res.json();
  return data.comments ?? [];
}

export async function addComment(
  postId: number,
  content: string
): Promise<{ comment_id: number }> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message ?? "Failed to add comment");
  }
  return res.json();
}
