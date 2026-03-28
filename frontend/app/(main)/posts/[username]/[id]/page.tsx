"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getPost, getComments, addComment, toggleLike,
  type FeedPost, type PostComment,
} from "@/lib/posts";
import { getCurrentUser } from "@/lib/auth/auth";
import { API_URL } from "@/lib/config";
import FeedSidebar from "@/components/feed/FeedSidebar";
import { Heart, MessageSquare, Share2, Globe, Users, Lock } from "lucide-react";

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

  const [lightbox, setLightbox] = useState(false);

  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCurrentUser().then((u) => { if (u) setCurrentUserId(u.userId ?? 0); }).catch(() => {});

    getPost(Number(id))
      .then((p) => {
        // Validate that the username in the URL matches the post's author
        if (p.author?.username && p.author.username !== username) {
          setNotFound(true);
          return;
        }
        setPost(p);
        setLikes(p.likes);
        setIsLiked(p.is_liked);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    getComments(Number(id)).then(setComments).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!loading && sessionStorage.getItem("focusComment") === "1") {
      sessionStorage.removeItem("focusComment");
      commentInputRef.current?.focus();
    }
  }, [loading]);

  const handleLike = async () => {
    if (!post || likeLoading) return;
    setLikeLoading(true);
    const prev = isLiked;
    const prevCount = likes;
    setIsLiked(!prev);
    setLikes(prev ? prevCount - 1 : prevCount + 1);
    try {
      const res = await toggleLike(post.id);
      setIsLiked(res.is_liked);
      setLikes(res.likes);
    } catch {
      setIsLiked(prev);
      setLikes(prevCount);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !newComment.trim() || commentLoading) return;
    setCommentLoading(true);
    try {
      await addComment(post.id, newComment.trim());
      setComments(await getComments(post.id));
      setNewComment("");
    } catch {
    } finally {
      setCommentLoading(false);
    }
  };

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
      {/* ── Centre ── */}
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

            {post.content && (
              <div className="px-4 pb-4">
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
                  {post.content}
                </p>
              </div>
            )}

            {post.image_path && (
              <div className="cursor-zoom-in bg-foreground/5" onClick={() => setLightbox(true)}>
                <img src={`${API_URL}${post.image_path}`} alt="post"
                  className="w-full object-contain max-h-[600px]" />
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
              <button onClick={handleShare}
                className="flex items-center gap-2 text-muted hover:text-primary transition-colors ml-auto">
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
                    newComment.length > 300
                      ? "border-red-500 focus:border-red-500"
                      : "border-border focus:border-primary/50"
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
                ) : (
                  <span />
                )}
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
                return (
                  <div key={c.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                    {/* Comment header — same layout as post header */}
                    <div className="p-4 flex items-center gap-3">
                      <div className="shrink-0">
                        {cAuthor?.avatar ? (
                          <img src={`${API_URL}${cAuthor.avatar}`} alt={cName}
                            className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-foreground/10 flex items-center justify-center border border-border font-semibold text-sm text-foreground/60">
                            {cName[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{cName}</p>
                        <p className="text-[10px] text-foreground/40 font-semibold uppercase tracking-wider mt-0.5">
                          {timeAgo(c.created_at)}
                        </p>
                      </div>
                    </div>
                    {/* Comment content */}
                    <div className="px-4 pb-4">
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
                        {c.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Right sidebar ── */}
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
