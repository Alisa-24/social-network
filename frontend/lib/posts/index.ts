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
  replies_count: number;
  parent_id?: number | null;
}

export async function getPost(postId: number): Promise<FeedPost> {
  const res = await fetch(`${API_URL}/api/posts/${postId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Post not found");
  const data = await res.json();
  return data.post;
}

export async function getUserPosts(username: string, offset = 0, limit = 10): Promise<{ posts: FeedPost[]; has_more: boolean }> {
  const res = await fetch(`${API_URL}/api/users/${username}/posts?offset=${offset}&limit=${limit}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch user posts");
  const data = await res.json();
  return { posts: data.posts ?? [], has_more: data.has_more ?? false };
}

export async function getFeedPosts(offset = 0, limit = 5): Promise<{ posts: FeedPost[]; has_more: boolean }> {
  const res = await fetch(`${API_URL}/api/posts?offset=${offset}&limit=${limit}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch posts");
  const data = await res.json();
  return { posts: data.posts ?? [], has_more: data.has_more ?? false };
}

export interface Follower {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
}

export async function getMyFollowers(): Promise<Follower[]> {
  const res = await fetch(`${API_URL}/api/follow/followers`, { credentials: "include" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.followers ?? [];
}

export async function createPost(
  content: string,
  privacy: string,
  media: File,
  selectedUserIds?: number[]
): Promise<{ post_id: number }> {
  const form = new FormData();
  form.append("content", content);
  form.append("privacy", privacy);
  form.append("image", media);
  if (privacy === "selected" && selectedUserIds && selectedUserIds.length > 0) {
    form.append("selected_users", JSON.stringify(selectedUserIds));
  }

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

export async function deleteComment(
  postId: number,
  commentId: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete comment");
}

export async function updateComment(
  postId: number,
  commentId: number,
  content: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/comments/${commentId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message ?? "Failed to update comment");
  }
}

export async function getReplies(
  postId: number,
  commentId: number
): Promise<PostComment[]> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/comments/${commentId}/replies`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch replies");
  const data = await res.json();
  return data.replies ?? [];
}

export async function addReply(
  postId: number,
  commentId: number,
  content: string
): Promise<{ reply_id: number }> {
  const res = await fetch(`${API_URL}/api/posts/${postId}/comments/${commentId}/replies`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message ?? "Failed to add reply");
  }
  return res.json();
}
