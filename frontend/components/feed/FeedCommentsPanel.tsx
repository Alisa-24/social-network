"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronDown, ChevronUp, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { API_URL } from "@/lib/config";
import {
  getComments, addComment, getReplies, addReply,
  deleteComment, updateComment,
  type FeedPost, type PostComment,
} from "@/lib/posts";

interface Props {
  post: FeedPost;
  currentUserId: number;
  onClose: () => void;
}

const REPLIES_PAGE = 3;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface ReplyState {
  loaded: boolean; all: PostComment[]; visible: number;
  open: boolean; inputOpen: boolean; inputValue: string;
  submitting: boolean; repliesCount: number;
}

function defaultRS(repliesCount: number): ReplyState {
  return { loaded: false, all: [], visible: REPLIES_PAGE, open: false, inputOpen: false, inputValue: "", submitting: false, repliesCount };
}

function ItemMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative ml-auto shrink-0">
      <button onClick={() => setOpen(o => !o)} className="p-1 rounded-lg text-foreground/30 hover:text-foreground/60 hover:bg-foreground/5 transition-colors">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-28 bg-background border border-border rounded-xl shadow-xl z-20 overflow-hidden py-1">
          <button onClick={() => { setOpen(false); onEdit(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground/70 hover:bg-foreground/5 transition-colors">
            <Pencil className="w-3 h-3" /> Edit
          </button>
          <button onClick={() => { setOpen(false); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function FeedCommentsPanel({ post, currentUserId, onClose }: Props) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyStates, setReplyStates] = useState<Record<number, ReplyState>>({});
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentValue, setEditingCommentValue] = useState("");
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editingReplyValue, setEditingReplyValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const updateRS = (id: number, patch: Partial<ReplyState>) =>
    setReplyStates(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  useEffect(() => {
    setLoading(true);
    getComments(post.id)
      .then(cs => {
        setComments(cs);
        const init: Record<number, ReplyState> = {};
        cs.forEach(c => { init[c.id] = defaultRS(c.replies_count); });
        setReplyStates(init);
      })
      .finally(() => setLoading(false));
  }, [post.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment(post.id, newComment.trim());
      const fresh = await getComments(post.id);
      setComments(fresh);
      setReplyStates(prev => {
        const next = { ...prev };
        fresh.forEach(c => { if (!next[c.id]) next[c.id] = defaultRS(c.replies_count); });
        return next;
      });
      setNewComment("");
    } catch { } finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment(post.id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      setReplyStates(prev => { const n = { ...prev }; delete n[commentId]; return n; });
    } catch { }
  };

  const handleSaveEditComment = async (commentId: number) => {
    if (!editingCommentValue.trim() || editingCommentValue.length > 300) return;
    try {
      await updateComment(post.id, commentId, editingCommentValue.trim());
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editingCommentValue.trim() } : c));
      setEditingCommentId(null);
    } catch { }
  };

  const handleToggleReplies = async (commentId: number) => {
    const rs = replyStates[commentId];
    if (!rs) return;
    if (!rs.open) {
      if (!rs.loaded) {
        try {
          const fetched = await getReplies(post.id, commentId);
          updateRS(commentId, { loaded: true, all: fetched, visible: REPLIES_PAGE, open: true, repliesCount: fetched.length });
        } catch { updateRS(commentId, { open: true }); }
      } else { updateRS(commentId, { open: true, visible: REPLIES_PAGE }); }
    } else { updateRS(commentId, { open: false }); }
  };

  const handleAddReply = async (commentId: number) => {
    const rs = replyStates[commentId];
    if (!rs || !rs.inputValue.trim() || rs.submitting) return;
    updateRS(commentId, { submitting: true });
    try {
      await addReply(post.id, commentId, rs.inputValue.trim());
      const fetched = await getReplies(post.id, commentId);
      updateRS(commentId, { loaded: true, all: fetched, visible: fetched.length, open: true, inputOpen: false, inputValue: "", submitting: false, repliesCount: fetched.length });
    } catch { updateRS(commentId, { submitting: false }); }
  };

  const handleDeleteReply = async (commentId: number, replyId: number) => {
    try {
      await deleteComment(post.id, replyId);
      setReplyStates(prev => {
        const rs = prev[commentId];
        if (!rs) return prev;
        const newAll = rs.all.filter(r => r.id !== replyId);
        return { ...prev, [commentId]: { ...rs, all: newAll, repliesCount: newAll.length } };
      });
    } catch { }
  };

  const handleSaveEditReply = async (commentId: number, replyId: number) => {
    if (!editingReplyValue.trim() || editingReplyValue.length > 300) return;
    try {
      await updateComment(post.id, replyId, editingReplyValue.trim());
      setReplyStates(prev => {
        const rs = prev[commentId];
        if (!rs) return prev;
        return { ...prev, [commentId]: { ...rs, all: rs.all.map(r => r.id === replyId ? { ...r, content: editingReplyValue.trim() } : r) } };
      });
      setEditingReplyId(null);
    } catch { }
  };

  const authorName = post.author ? `${post.author.firstName} ${post.author.lastName}` : "Post";

  return (
    <div className="w-[440px] shrink-0 flex flex-col border-l border-border bg-background h-full animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="min-w-0">
          <p className="font-bold text-base text-foreground">Comments</p>
          <p className="text-sm text-foreground/40 truncate">{authorName}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-foreground/10 text-foreground/50 hover:text-foreground transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-foreground/30 text-center py-10">No comments yet</p>
        ) : (
          <div className="divide-y divide-border">
            {comments.map(c => {
              const cAuthor = c.author;
              const cName = cAuthor ? `${cAuthor.firstName} ${cAuthor.lastName}` : "User";
              const rs = replyStates[c.id] ?? defaultRS(c.replies_count);
              const shownReplies = rs.all.slice(0, rs.visible);
              const remaining = rs.repliesCount - rs.visible;
              const isMyComment = c.user_id === currentUserId;
              const isEditingThis = editingCommentId === c.id;

              return (
                <div key={c.id} className="px-5 py-4">
                  {/* Comment */}
                  <div className="flex gap-3">
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
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm text-foreground">{cName}</p>
                        <p className="text-xs text-foreground/30">{timeAgo(c.created_at)}</p>
                        {isMyComment && !isEditingThis && (
                          <ItemMenu
                            onEdit={() => { setEditingCommentId(c.id); setEditingCommentValue(c.content); }}
                            onDelete={() => handleDeleteComment(c.id)}
                          />
                        )}
                      </div>

                      {isEditingThis ? (
                        <div className="mt-1 space-y-1.5">
                          <textarea
                            autoFocus value={editingCommentValue}
                            onChange={e => setEditingCommentValue(e.target.value)}
                            rows={2}
                            className={`w-full text-xs bg-background border rounded-lg px-2 py-1.5 text-foreground resize-none focus:outline-none ${editingCommentValue.length > 300 ? "border-red-500" : "border-border focus:border-primary/50"}`}
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button onClick={() => setEditingCommentId(null)} className="px-2 py-1 rounded text-xs text-foreground/50 hover:bg-foreground/5 transition-colors">Cancel</button>
                            <button onClick={() => handleSaveEditComment(c.id)} disabled={!editingCommentValue.trim() || editingCommentValue.length > 300}
                              className="px-2 py-1 rounded text-xs bg-primary text-black font-semibold disabled:opacity-40">Save</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words mt-0.5">{c.content}</p>
                      )}

                      {/* Actions */}
                      {!isEditingThis && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <button onClick={() => updateRS(c.id, { inputOpen: !rs.inputOpen })}
                            className="text-xs font-semibold text-foreground/40 hover:text-primary transition-colors">Reply</button>
                          {rs.repliesCount > 0 && (
                            <button onClick={() => handleToggleReplies(c.id)}
                              className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity">
                              {rs.open ? <><ChevronUp className="w-3 h-3" />Hide</> : <><ChevronDown className="w-3 h-3" />{rs.repliesCount} {rs.repliesCount === 1 ? "reply" : "replies"}</>}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Replies */}
                      {rs.open && (
                        <div className="mt-2 ml-2 border-l-2 border-border/50 pl-3 space-y-2">
                          {shownReplies.map(reply => {
                            const rAuthor = reply.author;
                            const rName = rAuthor ? `${rAuthor.firstName} ${rAuthor.lastName}` : "User";
                            const isMyReply = reply.user_id === currentUserId;
                            const isEditingReply = editingReplyId === reply.id;
                            return (
                              <div key={reply.id} className="flex gap-2">
                                <div className="shrink-0">
                                  {rAuthor?.avatar ? (
                                    <img src={`${API_URL}${rAuthor.avatar}`} alt={rName} className="w-6 h-6 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center border border-border font-semibold text-[10px] text-foreground/60">
                                      {rName[0]}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-xs text-foreground">{rName}</p>
                                    <p className="text-[11px] text-foreground/30">{timeAgo(reply.created_at)}</p>
                                    {isMyReply && !isEditingReply && (
                                      <ItemMenu
                                        onEdit={() => { setEditingReplyId(reply.id); setEditingReplyValue(reply.content); }}
                                        onDelete={() => handleDeleteReply(c.id, reply.id)}
                                      />
                                    )}
                                  </div>
                                  {isEditingReply ? (
                                    <div className="mt-1 space-y-1.5">
                                      <textarea autoFocus value={editingReplyValue} onChange={e => setEditingReplyValue(e.target.value)} rows={2}
                                        className={`w-full text-xs bg-background border rounded-lg px-2 py-1.5 text-foreground resize-none focus:outline-none ${editingReplyValue.length > 300 ? "border-red-500" : "border-border"}`} />
                                      <div className="flex gap-1.5 justify-end">
                                        <button onClick={() => setEditingReplyId(null)} className="px-2 py-1 rounded text-[10px] text-foreground/50 hover:bg-foreground/5">Cancel</button>
                                        <button onClick={() => handleSaveEditReply(c.id, reply.id)} disabled={!editingReplyValue.trim() || editingReplyValue.length > 300}
                                          className="px-2 py-1 rounded text-[10px] bg-primary text-black font-semibold disabled:opacity-40">Save</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words mt-0.5">{reply.content}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {rs.loaded && remaining > 0 && (
                            <button onClick={() => updateRS(c.id, { visible: rs.visible + REPLIES_PAGE })}
                              className="text-xs font-semibold text-primary hover:opacity-80 transition-opacity">
                              View {Math.min(remaining, REPLIES_PAGE)} more
                            </button>
                          )}
                        </div>
                      )}

                      {/* Reply input */}
                      {rs.inputOpen && (
                        <div className="mt-2 flex gap-1.5">
                          <input
                            autoFocus value={rs.inputValue}
                            onChange={e => updateRS(c.id, { inputValue: e.target.value })}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddReply(c.id); } }}
                            placeholder={`Reply to ${cName}...`}
                            className={`flex-1 bg-background border rounded-full px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none transition-colors ${rs.inputValue.length > 300 ? "border-red-500" : "border-border focus:border-primary/50"}`}
                          />
                          <button onClick={() => handleAddReply(c.id)} disabled={!rs.inputValue.trim() || rs.inputValue.length > 300 || rs.submitting}
                            className="px-3 py-1.5 rounded-full bg-primary text-black text-xs font-bold disabled:opacity-40">
                            {rs.submitting ? <div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin" /> : "↑"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add comment input */}
      <div className="shrink-0 border-t border-border px-4 py-3 space-y-1">
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            ref={inputRef}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className={`flex-1 bg-background border rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none transition-colors ${newComment.length > 300 ? "border-red-500" : "border-border focus:border-primary/50"}`}
          />
          <button type="submit" disabled={!newComment.trim() || newComment.length > 300 || submitting}
            className="px-4 py-2 rounded-full bg-primary text-black text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity">
            {submitting ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : "Post"}
          </button>
        </form>
        {newComment.length > 0 && (
          <div className="flex justify-end px-1">
            <p className={`text-xs ${newComment.length > 300 ? "text-red-500" : "text-foreground/30"}`}>
              {newComment.length}/300
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
