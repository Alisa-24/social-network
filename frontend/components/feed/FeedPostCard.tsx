"use client";

import { useState } from "react";
import { Heart, MessageCircle, Trash2, Pencil, Globe, Users, Lock, X, Check } from "lucide-react";
import { API_URL } from "@/lib/config";
import {
  toggleLike,
  deletePost,
  updatePost,
  getComments,
  addComment,
  type FeedPost,
  type PostComment,
} from "@/lib/posts";

interface Props {
  post: FeedPost;
  currentUserId: number;
  onDeleted: (id: number) => void;
  onUpdated: (id: number, content: string, privacy: string) => void;
}

const PRIVACY_ICONS: Record<string, React.ReactNode> = {
  public: <Globe className="w-3 h-3" />,
  followers: <Users className="w-3 h-3" />,
  selected: <Lock className="w-3 h-3" />,
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FeedPostCard({ post, currentUserId, onDeleted, onUpdated }: Props) {
  const isOwner = post.user_id === currentUserId;

  // Like state
  const [likes, setLikes] = useState(post.likes);
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likeLoading, setLikeLoading] = useState(false);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editPrivacy, setEditPrivacy] = useState(post.privacy);
  const [editLoading, setEditLoading] = useState(false);

  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    // Optimistic update
    setIsLiked((prev) => !prev);
    setLikes((prev) => (isLiked ? prev - 1 : prev + 1));
    try {
      const res = await toggleLike(post.id);
      setIsLiked(res.liked);
      setLikes(res.likes);
    } catch {
      // Revert on failure
      setIsLiked((prev) => !prev);
      setLikes((prev) => (isLiked ? prev + 1 : prev - 1));
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    setDeleting(true);
    try {
      await deletePost(post.id);
      onDeleted(post.id);
    } catch {
      setDeleting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editContent.trim()) return;
    setEditLoading(true);
    try {
      await updatePost(post.id, editContent.trim(), editPrivacy);
      onUpdated(post.id, editContent.trim(), editPrivacy);
      setEditing(false);
    } catch {
      // keep editing open on failure
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleComments = async () => {
    if (!showComments && !commentsLoaded) {
      try {
        const data = await getComments(post.id);
        setComments(data);
        setCommentsLoaded(true);
      } catch {}
    }
    setShowComments((prev) => !prev);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || commentLoading) return;
    setCommentLoading(true);
    try {
      await addComment(post.id, newComment.trim());
      // Reload comments
      const data = await getComments(post.id);
      setComments(data);
      setCommentsCount((prev) => prev + 1);
      setNewComment("");
    } catch {} finally {
      setCommentLoading(false);
    }
  };

  const author = post.author;
  const authorName = author
    ? `${author.firstName} ${author.lastName}`
    : "Unknown";
  const authorAvatar = author?.avatar;

  return (
    <div className="border border-border rounded-lg bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="shrink-0">
          {authorAvatar ? (
            <img
              src={`${API_URL}${authorAvatar}`}
              alt={authorName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center border border-border text-foreground/60 font-semibold text-sm">
              {authorName[0]}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm text-foreground">{authorName}</span>
            {author?.username && (
              <span className="text-xs text-foreground/40">@{author.username}</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-foreground/40 mt-0.5">
            {PRIVACY_ICONS[post.privacy]}
            <span>{formatDate(post.created_at)}</span>
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && !editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-md hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-md hover:bg-red-500/10 text-foreground/40 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content / Edit mode */}
      <div className="px-4 pb-3">
        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full resize-none bg-foreground/5 rounded-lg px-3 py-2 text-sm text-foreground border border-border focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <select
                value={editPrivacy}
                onChange={(e) => setEditPrivacy(e.target.value)}
                className="text-xs bg-foreground/5 border border-border rounded px-2 py-1 text-foreground focus:outline-none"
              >
                <option value="public">Everyone</option>
                <option value="followers">Followers</option>
                <option value="selected">Only me</option>
              </select>
              <div className="flex-1" />
              <button
                onClick={() => setEditing(false)}
                className="p-1 rounded hover:bg-foreground/5 text-foreground/40"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading || !editContent.trim()}
                className="p-1 rounded hover:bg-green-500/10 text-green-600 disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
        )}
      </div>

      {/* Image */}
      {post.image_path && !editing && (
        <div className="px-4 pb-3">
          <img
            src={`${API_URL}${post.image_path}`}
            alt="post"
            loading="lazy"
            className="w-full max-h-96 object-cover rounded-lg border border-border"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2 border-t border-border">
        <button
          onClick={handleLike}
          disabled={likeLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            isLiked
              ? "text-red-500 bg-red-500/10"
              : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
          <span>{likes}</span>
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-foreground/60 hover:bg-foreground/5 hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{commentsCount}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-border px-4 py-3 space-y-3">
          {comments.length === 0 && (
            <p className="text-xs text-foreground/40 text-center py-2">No comments yet</p>
          )}

          {comments.map((c) => {
            const cAuthor = c.author;
            const cName = cAuthor ? `${cAuthor.firstName} ${cAuthor.lastName}` : "User";
            return (
              <div key={c.id} className="flex gap-2">
                <div className="shrink-0">
                  {cAuthor?.avatar ? (
                    <img
                      src={`${API_URL}${cAuthor.avatar}`}
                      alt={cName}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-semibold text-foreground/60 border border-border">
                      {cName[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-foreground/5 rounded-lg px-3 py-2">
                  <span className="text-xs font-semibold text-foreground">{cName} </span>
                  <span className="text-xs text-foreground/40">· {formatDate(c.created_at)}</span>
                  <p className="text-sm text-foreground mt-0.5">{c.content}</p>
                </div>
              </div>
            );
          })}

          {/* Add comment */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              maxLength={300}
              className="flex-1 bg-foreground/5 border border-transparent focus:border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || commentLoading}
              className="px-3 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40 hover:opacity-80 transition-opacity"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
