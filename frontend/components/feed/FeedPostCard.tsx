"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Heart, MessageCircle, Share2, Trash2, Pencil,
  Globe, Users, Lock, X, MoreHorizontal, ChevronDown, AlertTriangle,
} from "lucide-react";
import { API_URL } from "@/lib/config";
import {
  toggleLike, deletePost, updatePost, getComments, addComment,
  type FeedPost, type PostComment,
} from "@/lib/posts";

interface Props {
  post: FeedPost;
  currentUserId: number;
  onDeleted: (id: number) => void;
  onUpdated: (id: number, content: string, privacy: string) => void;
}

const PRIVACY_OPTIONS = [
  { value: "public",    label: "Public",        icon: Globe  },
  { value: "followers", label: "Private",       icon: Users  },
  { value: "selected",  label: "Close Friends", icon: Lock   },
];

const PRIVACY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  public:    { label: "Public",        icon: <Globe  className="w-3 h-3" /> },
  followers: { label: "Private",       icon: <Users  className="w-3 h-3" /> },
  selected:  { label: "Close Friends", icon: <Lock   className="w-3 h-3" /> },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function FeedPostCard({ post, currentUserId, onDeleted, onUpdated }: Props) {
  const isOwner = post.user_id === currentUserId;

  const [likes, setLikes] = useState(post.likes);
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likeLoading, setLikeLoading] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editPrivacy, setEditPrivacy] = useState<"public" | "followers" | "selected">(post.privacy);
  const [editPrivacyOpen, setEditPrivacyOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  // For portal-based dropdown positioning
  const privacyBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close privacy portal dropdown on outside click
  useEffect(() => {
    if (!editPrivacyOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (privacyBtnRef.current && !privacyBtnRef.current.contains(target)) {
        setEditPrivacyOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editPrivacyOpen]);

  const openPrivacyDropdown = () => {
    if (privacyBtnRef.current) {
      const r = privacyBtnRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    setEditPrivacyOpen((o) => !o);
  };

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const prevLiked = isLiked;
    const prevCount = likes;
    setIsLiked(!prevLiked);
    setLikes(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      const res = await toggleLike(post.id);
      setIsLiked(res.is_liked);
      setLikes(res.likes);
    } catch {
      setIsLiked(prevLiked);
      setLikes(prevCount);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await deletePost(post.id);
      onDeleted(post.id);
    } catch {
      setDeleting(false);
      setShowDeleteModal(false);
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
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(post.content);
    setEditPrivacy(post.privacy);
    setEditing(false);
  };

  const handleToggleComments = async () => {
    if (!showComments && !commentsLoaded) {
      try {
        setComments(await getComments(post.id));
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
      setComments(await getComments(post.id));
      setCommentsCount((prev) => prev + 1);
      setNewComment("");
    } catch {
    } finally {
      setCommentLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ text: post.content, url });
    else await navigator.clipboard.writeText(url);
  };

  const author = post.author;
  const authorName = author ? `${author.firstName} ${author.lastName}` : "Unknown";
  const privacy = PRIVACY_LABELS[post.privacy] ?? PRIVACY_LABELS.public;
  const currentEditPrivacy = PRIVACY_OPTIONS.find((o) => o.value === editPrivacy)!;
  const EditPrivacyIcon = currentEditPrivacy.icon;

  return (
    <>
      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">

        {/* ── Header ── */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              {author?.avatar ? (
                <img src={`${API_URL}${author.avatar}`} alt={authorName}
                  className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center border border-border font-semibold text-sm text-foreground/60">
                  {authorName[0]}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">{authorName}</p>
              <div className="flex items-center gap-1 text-[10px] text-foreground/40 font-semibold uppercase tracking-wider mt-0.5">
                <span>{timeAgo(post.created_at)}</span>
                <span>·</span>
                {privacy.icon}
                <span>{privacy.label}</span>
              </div>
            </div>
          </div>

          {isOwner && !editing && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="p-1.5 rounded-full hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 w-40 bg-background border border-border rounded-xl shadow-2xl z-20 overflow-hidden py-1">
                  <button
                    onClick={() => { setEditing(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-4 h-4" /> Edit post
                  </button>
                  <div className="mx-3 border-t border-border" />
                  <button
                    onClick={() => { setShowDeleteModal(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Edit mode ── */}
        {editing ? (
          <div className="px-4 pb-4 space-y-3">
            <div className="relative">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={500}
                rows={4}
                autoFocus
                className="w-full resize-none bg-foreground/5 border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
              <span className="absolute bottom-2.5 right-3 text-[10px] text-foreground/30">
                {editContent.length}/500
              </span>
            </div>

            {/* Privacy button — dropdown rendered via portal to escape overflow:hidden */}
            <button
              ref={privacyBtnRef}
              type="button"
              onClick={openPrivacyDropdown}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-foreground/5 border border-border text-sm text-foreground/70 hover:bg-foreground/10 transition-colors"
            >
              <EditPrivacyIcon className="w-4 h-4" />
              <span>{currentEditPrivacy.label}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-1 text-foreground/40" />
            </button>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-lg text-sm text-foreground/60 hover:bg-foreground/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editLoading || !editContent.trim()}
                className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {editLoading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        ) : (
          post.content && (
            <div className="px-4 pb-4">
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
                {post.content}
              </p>
            </div>
          )
        )}

        {/* ── Post image ── */}
        {post.image_path && !editing && (
          <div className="aspect-video bg-foreground/5">
            <img src={`${API_URL}${post.image_path}`} alt="post" loading="lazy"
              className="w-full h-full object-cover" />
          </div>
        )}

        {/* ── Action bar ── */}
        {!editing && (
          <div className="p-3 border-t border-border flex items-center gap-4">
            <button
              onClick={handleLike}
              disabled={likeLoading}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                isLiked ? "text-red-500" : "text-foreground/50 hover:text-red-500"
              }`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
              <span>{likes}</span>
            </button>
            <button
              onClick={handleToggleComments}
              className="flex items-center gap-1.5 text-sm text-foreground/50 hover:text-primary transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{commentsCount}</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-sm text-foreground/50 hover:text-primary transition-colors ml-auto"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── Comments ── */}
        {showComments && !editing && (
          <div className="border-t border-border px-4 py-3 space-y-3">
            {comments.length === 0 && (
              <p className="text-xs text-foreground/30 text-center py-2">No comments yet</p>
            )}
            {comments.map((c) => {
              const cAuthor = c.author;
              const cName = cAuthor ? `${cAuthor.firstName} ${cAuthor.lastName}` : "User";
              return (
                <div key={c.id} className="flex gap-2">
                  <div className="shrink-0">
                    {cAuthor?.avatar ? (
                      <img src={`${API_URL}${cAuthor.avatar}`} alt={cName}
                        className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-semibold text-foreground/60 border border-border">
                        {cName[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 bg-foreground/5 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-foreground">{cName}</span>
                      <span className="text-[10px] text-foreground/30">· {timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground/80 break-words">{c.content}</p>
                  </div>
                </div>
              );
            })}
            <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                maxLength={300}
                className="flex-1 bg-foreground/5 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-foreground/30 focus:outline-none border border-transparent focus:border-border"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || commentLoading}
                className="px-4 py-2 rounded-full bg-primary text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Privacy dropdown portal (escapes overflow:hidden) ── */}
      {editPrivacyOpen && typeof window !== "undefined" && createPortal(
        <div
          style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, minWidth: 176, zIndex: 9999 }}
          className="bg-background border border-border rounded-xl shadow-2xl overflow-hidden py-1"
        >
          {PRIVACY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setEditPrivacy(opt.value as typeof editPrivacy); setEditPrivacyOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-foreground/5 ${
                  editPrivacy === opt.value ? "text-primary font-medium" : "text-foreground/70"
                }`}
              >
                <Icon className="w-4 h-4" />
                {opt.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}

      {/* ── Delete confirmation modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteModal(false)}
          />
          <div className="relative w-full max-w-sm bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">Delete post</p>
                  <p className="text-xs text-foreground/40 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => !deleting && setShowDeleteModal(false)}
                className="p-1.5 rounded-full hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {post.content && (
              <div className="mx-5 mb-5 p-3 bg-foreground/5 border border-border rounded-xl">
                <p className="text-sm text-foreground/70 line-clamp-3">{post.content}</p>
              </div>
            )}
            <div className="flex gap-2 px-5 pb-5">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground/70 hover:bg-foreground/5 disabled:opacity-40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? "Deleting..." : <><Trash2 className="w-4 h-4" /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
