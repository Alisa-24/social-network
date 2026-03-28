"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import {
  getPost, getComments, addComment, toggleLike, getReplies, addReply,
  deleteComment, updateComment,
  type FeedPost, type PostComment,
} from "@/lib/posts";
import { getCurrentUser } from "@/lib/auth/auth";
import { API_URL } from "@/lib/config";
import FeedSidebar from "@/components/feed/FeedSidebar";
import { Heart, MessageSquare, Share2, Globe, Users, Lock } from "lucide-react";

const REPLIES_PAGE = 3;

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

// ── per-comment reply state ──────────────────────────────────────────────────
interface ReplyState {
  loaded: boolean;
  all: PostComment[];
  visible: number;
  open: boolean;
  inputOpen: boolean;
  inputValue: string;
  submitting: boolean;
  repliesCount: number;
}

function defaultReplyState(repliesCount: number): ReplyState {
  return {
    loaded: false, all: [], visible: REPLIES_PAGE, open: false,
    inputOpen: false, inputValue: "", submitting: false, repliesCount,
  };
}

// ── small 3-dot menu shown on owned comments / replies ───────────────────────
function ItemMenu({
  onEdit, onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1 rounded-lg text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5 transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-32 bg-background border border-border rounded-xl shadow-xl z-20 overflow-hidden py-1">
          <button
            onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground/70 hover:bg-foreground/5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function PostDetailPage() {
  const { id, username } = useParams<{ id: string; username: string }>();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState(0);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // edit state for top-level comments
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState("");

  const [lightbox, setLightbox] = useState(false);

  // reply state per comment id
  const [replyStates, setReplyStates] = useState<Record<number, ReplyState>>({});

  // edit state for replies: key = replyId
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editingReplyValue, setEditingReplyValue] = useState("");

  const commentInputRef = useRef<HTMLInputElement>(null);

  const updateReply = (commentId: number, patch: Partial<ReplyState>) =>
    setReplyStates((prev) => ({
      ...prev,
      [commentId]: { ...prev[commentId], ...patch },
    }));

  // ── initial load ──
  useEffect(() => {
    getCurrentUser().then((u) => { if (u) setCurrentUserId(u.userId ?? 0); }).catch(() => {});

    getPost(Number(id))
      .then((p) => {
        if (p.author?.username && p.author.username !== username) { setNotFound(true); return; }
        setPost(p);
        setLikes(p.likes);
        setIsLiked(p.is_liked);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    getComments(Number(id))
      .then((cs) => {
        setComments(cs);
        const initial: Record<number, ReplyState> = {};
        cs.forEach((c) => { initial[c.id] = defaultReplyState(c.replies_count); });
        setReplyStates(initial);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!loading && sessionStorage.getItem("focusComment") === "1") {
      sessionStorage.removeItem("focusComment");
      commentInputRef.current?.focus();
    }
  }, [loading]);

  // ── like ──
  const handleLike = async () => {
    if (!post || likeLoading) return;
    setLikeLoading(true);
    const prev = isLiked; const prevCount = likes;
    setIsLiked(!prev); setLikes(prev ? prevCount - 1 : prevCount + 1);
    try {
      const res = await toggleLike(post.id);
      setIsLiked(res.is_liked); setLikes(res.likes);
    } catch { setIsLiked(prev); setLikes(prevCount); }
    finally { setLikeLoading(false); }
  };

  // ── add top-level comment ──
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !newComment.trim() || commentLoading) return;
    setCommentLoading(true);
    try {
      await addComment(post.id, newComment.trim());
      const fresh = await getComments(post.id);
      setComments(fresh);
      setReplyStates((prev) => {
        const next = { ...prev };
        fresh.forEach((c) => { if (!next[c.id]) next[c.id] = defaultReplyState(c.replies_count); });
        return next;
      });
      setNewComment("");
    } catch { } finally { setCommentLoading(false); }
  };

  // ── delete comment ──
  const handleDeleteComment = async (commentId: number) => {
    if (!post) return;
    try {
      await deleteComment(post.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setReplyStates((prev) => { const n = { ...prev }; delete n[commentId]; return n; });
    } catch { }
  };

  // ── save edited comment ──
  const handleSaveEditComment = async (commentId: number) => {
    if (!post || !editingCommentValue.trim() || editingCommentValue.length > 300) return;
    try {
      await updateComment(post.id, commentId, editingCommentValue.trim());
      setComments((prev) =>
        prev.map((c) => c.id === commentId ? { ...c, content: editingCommentValue.trim() } : c)
      );
      setEditingCommentId(null);
    } catch { }
  };

  // ── toggle reply panel ──
  const handleToggleReplies = async (commentId: number) => {
    const state = replyStates[commentId];
    if (!state) return;
    if (!state.open) {
      if (!state.loaded) {
        try {
          const fetched = await getReplies(Number(id), commentId);
          updateReply(commentId, { loaded: true, all: fetched, visible: REPLIES_PAGE, open: true, repliesCount: fetched.length });
        } catch { updateReply(commentId, { open: true }); }
      } else {
        updateReply(commentId, { open: true, visible: REPLIES_PAGE });
      }
    } else {
      updateReply(commentId, { open: false });
    }
  };

  const handleLoadMoreReplies = (commentId: number) => {
    const state = replyStates[commentId];
    if (!state) return;
    updateReply(commentId, { visible: state.visible + REPLIES_PAGE });
  };

  // ── submit reply ──
  const handleAddReply = async (commentId: number) => {
    const state = replyStates[commentId];
    if (!state || !state.inputValue.trim() || state.submitting) return;
    updateReply(commentId, { submitting: true });
    try {
      await addReply(Number(id), commentId, state.inputValue.trim());
      const fetched = await getReplies(Number(id), commentId);
      updateReply(commentId, {
        loaded: true, all: fetched, visible: fetched.length,
        open: true, inputOpen: false, inputValue: "", submitting: false,
        repliesCount: fetched.length,
      });
    } catch { updateReply(commentId, { submitting: false }); }
  };

  // ── delete reply ──
  const handleDeleteReply = async (commentId: number, replyId: number) => {
    if (!post) return;
    try {
      await deleteComment(post.id, replyId);
      setReplyStates((prev) => {
        const state = prev[commentId];
        if (!state) return prev;
        const newAll = state.all.filter((r) => r.id !== replyId);
        return {
          ...prev,
          [commentId]: { ...state, all: newAll, repliesCount: newAll.length },
        };
      });
    } catch { }
  };

  // ── save edited reply ──
  const handleSaveEditReply = async (commentId: number, replyId: number) => {
    if (!post || !editingReplyValue.trim() || editingReplyValue.length > 300) return;
    try {
      await updateComment(post.id, replyId, editingReplyValue.trim());
      setReplyStates((prev) => {
        const state = prev[commentId];
        if (!state) return prev;
        return {
          ...prev,
          [commentId]: {
            ...state,
            all: state.all.map((r) =>
              r.id === replyId ? { ...r, content: editingReplyValue.trim() } : r
            ),
          },
        };
      });
      setEditingReplyId(null);
    } catch { }
  };

  // ── share ──
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ text: post?.content ?? "", url });
    else await navigator.clipboard.writeText(url);
  };

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
        <FeedSidebar currentUserId={currentUserId} />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-foreground/40">
          <p className="text-lg font-semibold">Post not found</p>
          <button onClick={() => router.push("/feed")} className="text-primary text-sm hover:underline">Go back</button>
        </div>
        <FeedSidebar currentUserId={currentUserId} />
      </div>
    );
  }

  const author = post.author;
  const authorName = author ? `${author.firstName} ${author.lastName}` : "Unknown";
  const privacy = PRIVACY_LABELS[post.privacy] ?? PRIVACY_LABELS.public;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-6 px-4 space-y-4">

          {/* Back */}
          <button
            onClick={() => router.push("/feed")}
            className="flex items-center gap-2 text-sm text-foreground/50 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* ── Post card ── */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              <div className="shrink-0">
                {author?.avatar ? (
                  <img src={`${API_URL}${author.avatar}`} alt={authorName} className="w-10 h-10 rounded-full object-cover" />
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

            {post.content && (
              <div className="px-4 pb-4">
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
              </div>
            )}

            {post.image_path && (
              <div className="cursor-zoom-in bg-foreground/5" onClick={() => setLightbox(true)}>
                <img src={`${API_URL}${post.image_path}`} alt="post" className="w-full object-contain max-h-[600px]" />
              </div>
            )}

            <div className="p-3 border-t border-border flex items-center gap-4">
              <button onClick={handleLike} disabled={likeLoading}
                className="flex items-center gap-2 text-muted hover:text-primary transition-colors group disabled:opacity-50">
                <Heart className={`w-5 h-5 transition-all ${isLiked ? "fill-primary text-primary" : "group-hover:scale-110"}`} />
                <span className="text-xs font-bold">{likes > 0 ? likes : ""}</span>
              </button>
              <button onClick={() => commentInputRef.current?.focus()}
                className="flex items-center gap-2 text-muted hover:text-primary transition-colors group">
                <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">{comments.length > 0 ? comments.length : "0"}</span>
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 text-muted hover:text-primary transition-colors ml-auto">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Comment input */}
            <div className="border-t border-border px-4 py-3 space-y-1.5">
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className={`flex-1 bg-background border rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none transition-colors ${
                    newComment.length > 300 ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary/50"
                  }`}
                />
                <button type="submit" disabled={!newComment.trim() || newComment.length > 300 || commentLoading}
                  className="px-5 py-2 rounded-full bg-primary text-black text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity">
                  Post
                </button>
              </form>
              <div className="flex items-center justify-between px-1">
                {newComment.length > 300 ? (
                  <p className="text-xs text-red-500">Content must be at most 300 characters</p>
                ) : newComment.length >= 250 ? (
                  <p className="text-xs text-foreground/40">{300 - newComment.length} characters remaining</p>
                ) : <span />}
                {newComment.length > 0 && (
                  <p className={`text-xs ml-auto ${newComment.length > 300 ? "text-red-500" : "text-foreground/30"}`}>
                    {newComment.length}/300
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Comments ── */}
          {comments.length === 0 ? (
            <p className="text-xs text-foreground/30 text-center py-4">No comments yet. Be the first!</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => {
                const cAuthor = c.author;
                const cName = cAuthor ? `${cAuthor.firstName} ${cAuthor.lastName}` : "User";
                const rs = replyStates[c.id] ?? defaultReplyState(c.replies_count);
                const shownReplies = rs.all.slice(0, rs.visible);
                const remaining = rs.repliesCount - rs.visible;
                const isMyComment = c.user_id === currentUserId;
                const isEditingThis = editingCommentId === c.id;

                return (
                  <div key={c.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                    {/* Comment header */}
                    <div className="p-4 flex items-center gap-3">
                      <div className="shrink-0">
                        {cAuthor?.avatar ? (
                          <img src={`${API_URL}${cAuthor.avatar}`} alt={cName} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-foreground/10 flex items-center justify-center border border-border font-semibold text-sm text-foreground/60">
                            {cName[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{cName}</p>
                        <p className="text-[10px] text-foreground/40 font-semibold uppercase tracking-wider mt-0.5">
                          {timeAgo(c.created_at)}
                        </p>
                      </div>
                      {isMyComment && !isEditingThis && (
                        <ItemMenu
                          onEdit={() => { setEditingCommentId(c.id); setEditingCommentValue(c.content); }}
                          onDelete={() => handleDeleteComment(c.id)}
                        />
                      )}
                    </div>

                    {/* Comment content or edit input */}
                    {isEditingThis ? (
                      <div className="px-4 pb-3 space-y-2">
                        <textarea
                          autoFocus
                          value={editingCommentValue}
                          onChange={(e) => setEditingCommentValue(e.target.value)}
                          rows={2}
                          className={`w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none transition-colors ${
                            editingCommentValue.length > 300 ? "border-red-500" : "border-border focus:border-primary/50"
                          }`}
                        />
                        {editingCommentValue.length > 300 && (
                          <p className="text-xs text-red-500">Content must be at most 300 characters</p>
                        )}
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingCommentId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground/50 hover:bg-foreground/5 transition-colors">
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEditComment(c.id)}
                            disabled={!editingCommentValue.trim() || editingCommentValue.length > 300}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-black disabled:opacity-40 hover:opacity-90 transition-opacity"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 pb-3">
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
                      </div>
                    )}

                    {/* Comment actions */}
                    {!isEditingThis && (
                      <div className="px-4 pb-3 flex items-center gap-4">
                        <button
                          onClick={() => updateReply(c.id, { inputOpen: !rs.inputOpen })}
                          className="text-xs font-semibold text-foreground/40 hover:text-primary transition-colors"
                        >
                          Reply
                        </button>
                        {rs.repliesCount > 0 && (
                          <button
                            onClick={() => handleToggleReplies(c.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
                          >
                            {rs.open ? (
                              <><ChevronUp className="w-3 h-3" /> Hide replies</>
                            ) : (
                              <><ChevronDown className="w-3 h-3" /> View {rs.repliesCount} {rs.repliesCount === 1 ? "reply" : "replies"}</>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Replies panel */}
                    {rs.open && (
                      <div className="border-t border-border ml-4 space-y-0">
                        {shownReplies.map((reply) => {
                          const rAuthor = reply.author;
                          const rName = rAuthor ? `${rAuthor.firstName} ${rAuthor.lastName}` : "User";
                          const isMyReply = reply.user_id === currentUserId;
                          const isEditingReply = editingReplyId === reply.id;

                          return (
                            <div key={reply.id} className="flex gap-3 px-4 py-3 border-b border-border/50 last:border-b-0">
                              <div className="shrink-0 mt-0.5">
                                {rAuthor?.avatar ? (
                                  <img src={`${API_URL}${rAuthor.avatar}`} alt={rName} className="w-7 h-7 rounded-full object-cover" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-foreground/10 flex items-center justify-center border border-border font-semibold text-xs text-foreground/60">
                                    {rName[0]}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-xs text-foreground">{rName}</p>
                                  <p className="text-[10px] text-foreground/40 font-semibold uppercase tracking-wider">
                                    {timeAgo(reply.created_at)}
                                  </p>
                                  {isMyReply && !isEditingReply && (
                                    <div className="ml-auto">
                                      <ItemMenu
                                        onEdit={() => { setEditingReplyId(reply.id); setEditingReplyValue(reply.content); }}
                                        onDelete={() => handleDeleteReply(c.id, reply.id)}
                                      />
                                    </div>
                                  )}
                                </div>

                                {isEditingReply ? (
                                  <div className="mt-1 space-y-2">
                                    <textarea
                                      autoFocus
                                      value={editingReplyValue}
                                      onChange={(e) => setEditingReplyValue(e.target.value)}
                                      rows={2}
                                      className={`w-full bg-background border rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none transition-colors ${
                                        editingReplyValue.length > 300 ? "border-red-500" : "border-border focus:border-primary/50"
                                      }`}
                                    />
                                    {editingReplyValue.length > 300 && (
                                      <p className="text-xs text-red-500">Content must be at most 300 characters</p>
                                    )}
                                    <div className="flex gap-2 justify-end">
                                      <button onClick={() => setEditingReplyId(null)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground/50 hover:bg-foreground/5 transition-colors">
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleSaveEditReply(c.id, reply.id)}
                                        disabled={!editingReplyValue.trim() || editingReplyValue.length > 300}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-black disabled:opacity-40 hover:opacity-90 transition-opacity"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words mt-0.5">
                                    {reply.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Load more replies */}
                        {rs.loaded && remaining > 0 && (
                          <button
                            onClick={() => handleLoadMoreReplies(c.id)}
                            className="w-full px-4 py-2.5 text-xs font-semibold text-primary hover:bg-foreground/5 transition-colors text-left"
                          >
                            View {Math.min(remaining, REPLIES_PAGE)} more {remaining === 1 ? "reply" : "replies"}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Reply input */}
                    {rs.inputOpen && (
                      <div className="border-t border-border px-4 py-3 space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            autoFocus
                            value={rs.inputValue}
                            onChange={(e) => updateReply(c.id, { inputValue: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddReply(c.id); }
                            }}
                            placeholder={`Reply to ${cName}...`}
                            className={`flex-1 bg-background border rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none transition-colors ${
                              rs.inputValue.length > 300 ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary/50"
                            }`}
                          />
                          <button
                            onClick={() => handleAddReply(c.id)}
                            disabled={!rs.inputValue.trim() || rs.inputValue.length > 300 || rs.submitting}
                            className="px-4 py-2 rounded-full bg-primary text-black text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity"
                          >
                            {rs.submitting ? (
                              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : "Reply"}
                          </button>
                        </div>
                        {rs.inputValue.length > 0 && (
                          <div className="flex items-center justify-between px-1">
                            {rs.inputValue.length > 300 ? (
                              <p className="text-xs text-red-500">Content must be at most 300 characters</p>
                            ) : rs.inputValue.length >= 250 ? (
                              <p className="text-xs text-foreground/40">{300 - rs.inputValue.length} characters remaining</p>
                            ) : <span />}
                            <p className={`text-xs ml-auto ${rs.inputValue.length > 300 ? "text-red-500" : "text-foreground/30"}`}>
                              {rs.inputValue.length}/300
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <FeedSidebar currentUserId={currentUserId} />

      {/* Image lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightbox(false)}>
          <img src={`${API_URL}${post.image_path}`} alt="full"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
