"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Heart, MessageSquare, Share2, Trash2, Pencil,
  Globe, Users, Lock, X, MoreHorizontal, AlertTriangle,
} from "lucide-react";
import { API_URL } from "@/lib/config";
import { toggleLike, deletePost, updatePost, type FeedPost } from "@/lib/posts";

interface Props {
  post: FeedPost;
  currentUserId: number;
  commentsOpen: boolean;
  onDeleted: (id: number) => void;
  onUpdated: (id: number, content: string, privacy: string) => void;
  onToggleComments: () => void;
  onNavBlock?: (blocked: boolean) => void;
}

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

export default function FeedPostFull({
  post, currentUserId, commentsOpen, onDeleted, onUpdated, onToggleComments, onNavBlock,
}: Props) {
  const isOwner = Number(post.user_id) === Number(currentUserId);

  const [likes, setLikes] = useState(post.likes);
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likeLoading, setLikeLoading] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) video.pause(); },
      { threshold: 0.3 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [post.image_path]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const prevLiked = isLiked; const prevCount = likes;
    setIsLiked(!prevLiked); setLikes(prevLiked ? prevCount - 1 : prevCount + 1);
    try {
      const res = await toggleLike(post.id);
      setIsLiked(res.is_liked); setLikes(res.likes);
    } catch { setIsLiked(prevLiked); setLikes(prevCount); }
    finally { setLikeLoading(false); }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try { await deletePost(post.id); onNavBlock?.(false); onDeleted(post.id); }
    catch { setDeleting(false); setShowDeleteModal(false); onNavBlock?.(false); }
  };

  const handleEditSave = async () => {
    if (!editContent.trim()) return;
    setEditLoading(true);
    try {
      await updatePost(post.id, editContent.trim(), post.privacy);
      onUpdated(post.id, editContent.trim(), post.privacy);
      setEditing(false); onNavBlock?.(false);
    } catch { } finally { setEditLoading(false); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/posts/${post.author?.username ?? post.user_id}/${post.id}`;
    if (navigator.share) await navigator.share({ text: post.content, url });
    else await navigator.clipboard.writeText(url);
  };

  const author = post.author;
  const authorName = author ? `${author.firstName} ${author.lastName}` : "Unknown";
  const privacy = PRIVACY_LABELS[post.privacy] ?? PRIVACY_LABELS.public;

  return (
    <>
      {/* ── Full post card ─────────────────────────────────── */}
      <div className="w-full flex flex-col bg-surface border border-border rounded-2xl overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="shrink-0 p-5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            {author?.avatar ? (
              <img src={`${API_URL}${author.avatar}`} alt={authorName}
                className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-foreground/10 flex items-center justify-center border border-border font-semibold text-foreground/60">
                {authorName[0]}
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">{authorName}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-foreground/40 font-semibold uppercase tracking-wider mt-0.5">
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
                className="p-2 rounded-full hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 w-44 bg-background border border-border rounded-xl shadow-2xl z-20 overflow-hidden py-1">
                  <button
                    onClick={() => { setEditing(true); setMenuOpen(false); onNavBlock?.(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:bg-foreground/5 transition-colors"
                  >
                    <Pencil className="w-4 h-4" /> Edit post
                  </button>
                  <div className="mx-3 border-t border-border" />
                  <button
                    onClick={() => { setShowDeleteModal(true); setMenuOpen(false); onNavBlock?.(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Body — auto-height, scrollable if content overflows */}
        <div className="overflow-y-auto">

          {/* Edit mode */}
          {editing ? (
            <div className="p-5 space-y-3">
              <div className="relative">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={5}
                  autoFocus
                  className="w-full resize-none bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                />
                <span className={`absolute bottom-3 right-3 text-[10px] ${editContent.length > 500 ? "text-red-500" : "text-foreground/30"}`}>
                  {editContent.length}/500
                </span>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => { setEditContent(post.content); setEditing(false); onNavBlock?.(false); }}
                  className="px-4 py-2 rounded-lg text-sm text-foreground/60 hover:bg-foreground/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editLoading || !editContent.trim() || editContent.length > 500}
                  className="px-5 py-2 rounded-lg bg-primary text-black text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {editLoading ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Text content */}
              {post.content && (
                <div className="px-5 py-4">
                  <p className="text-base text-foreground/85 leading-relaxed whitespace-pre-wrap break-words">
                    {post.content}
                  </p>
                </div>
              )}

              {/* Media */}
              {post.image_path && (
                /\.(mp4|webm|mov)$/i.test(post.image_path) ? (
                  <div className="bg-foreground/5">
                    <video
                      ref={videoRef}
                      src={`${API_URL}${post.image_path}`}
                      controls
                      className="w-full max-h-[74vh]"
                    />
                  </div>
                ) : (
                  <div
                    className="cursor-zoom-in bg-foreground/5"
                    onClick={() => setLightbox(true)}
                  >
                    <img
                      src={`${API_URL}${post.image_path}`}
                      alt="post"
                      className="w-full object-contain max-h-[74vh]"
                    />
                  </div>
                )
              )}
            </>
          )}
        </div>

        {/* Action bar — pinned to bottom */}
        {!editing && (
          <div className="shrink-0 border-t border-border px-5 py-4 flex items-center gap-5">
            <button
              onClick={handleLike}
              disabled={likeLoading}
              className="flex items-center gap-2 text-muted hover:text-primary transition-colors group disabled:opacity-50"
            >
              <Heart className={`w-6 h-6 transition-all ${isLiked ? "fill-primary text-primary scale-110" : "group-hover:scale-110"}`} />
              <span className="text-sm font-bold">{likes > 0 ? likes : ""}</span>
            </button>

            <button
              onClick={onToggleComments}
              className={`flex items-center gap-2 transition-colors group ${commentsOpen ? "text-primary" : "text-muted hover:text-primary"}`}
            >
              <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">{post.comments_count > 0 ? post.comments_count : "0"}</span>
            </button>

            <button
              onClick={handleShare}
              className="ml-auto text-muted hover:text-primary transition-colors"
            >
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* ── Delete modal (portal to escape transformed ancestor) ── */}
      {showDeleteModal && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!deleting) { setShowDeleteModal(false); onNavBlock?.(false); } }} />
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
              <button onClick={() => { if (!deleting) { setShowDeleteModal(false); onNavBlock?.(false); } }}
                className="p-1.5 rounded-full hover:bg-foreground/5 text-foreground/40 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {post.content && (
              <div className="mx-5 mb-5 p-3 bg-foreground/5 border border-border rounded-xl">
                <p className="text-sm text-foreground/70 line-clamp-3">{post.content}</p>
              </div>
            )}
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => { setShowDeleteModal(false); onNavBlock?.(false); }} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground/70 hover:bg-foreground/5 disabled:opacity-40 transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {deleting ? "Deleting..." : <><Trash2 className="w-4 h-4" /> Delete</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Image lightbox ── */}
      {lightbox && post.image_path && !/\.(mp4|webm|mov)$/i.test(post.image_path) && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightbox(false)}>
          <img src={`${API_URL}${post.image_path}`} alt="full"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()} />
        </div>,
        document.body
      )}
    </>
  );
}
