"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Plus, X } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";
import { User } from "@/lib/interfaces";
import * as ws from "@/lib/ws/ws";
import WebSocketErrorPage from "@/components/layout/WebSocketErrorPage";
import CreatePost from "@/components/feed/CreatePost";
import FeedPostFull from "@/components/feed/FeedPostFull";
import FeedSidebar from "@/components/feed/FeedSidebar";
import FeedCommentsPanel from "@/components/feed/FeedCommentsPanel";
import { getFeedPosts, type FeedPost } from "@/lib/posts";

const LIMIT = 5;
const PRELOAD_THRESHOLD = 2; // load more when within 2 posts of the end

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showErrorPage, setShowErrorPage] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  // Comments panel
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<number | null>(null);

  // Create post modal
  const [createOpen, setCreateOpen] = useState(false);

  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const offsetRef = useRef(0);
  const lastScrollRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Auth ──
  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) { router.push("/login"); return; }
        setUser(currentUser);
        setLoading(false);
      } catch (error) {
        router.push(error instanceof ServerError ? "/error/500" : "/login");
      }
    }
    checkAuth();
  }, [router]);

  // ── WS ──
  useEffect(() => {
    if (!user) return;
    const handleConnect = () => { setShowErrorPage(false); setReconnectAttempts(0); };
    const handleDisconnect = () => setReconnectAttempts(ws.getReconnectAttempts());
    const handleMaxRetries = () => setShowErrorPage(true);
    ws.onConnect(handleConnect);
    ws.onDisconnect(handleDisconnect);
    ws.onMaxRetriesReached(handleMaxRetries);
  }, [user]);

  // ── Fetch pages ──
  const fetchPage = useCallback(async (reset = false) => {
    if (isFetchingRef.current || (!reset && !hasMoreRef.current)) return;
    isFetchingRef.current = true;
    if (!reset) setFetchingMore(true);
    const currentOffset = reset ? 0 : offsetRef.current;
    try {
      const { posts: newPosts, has_more } = await getFeedPosts(currentOffset, LIMIT);
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
      offsetRef.current = currentOffset + newPosts.length;
      hasMoreRef.current = has_more;
      setHasMore(has_more);
    } catch { }
    finally {
      if (reset) { setInitialLoading(false); setCurrentIdx(0); }
      setFetchingMore(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchPage(true);
  }, [user, fetchPage]);

  // ── Navigation helpers ──
  const goNext = useCallback((postsLen: number) => {
    setCurrentIdx(prev => {
      const next = prev + 1;
      if (next >= postsLen) return prev; // can't go past end
      // preload more when near end
      if (next >= postsLen - PRELOAD_THRESHOLD && hasMoreRef.current && !isFetchingRef.current) {
        fetchPage(false);
      }
      return next;
    });
  }, [fetchPage]);

  const goPrev = useCallback(() => {
    setCurrentIdx(prev => Math.max(0, prev - 1));
  }, []);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowDown") { e.preventDefault(); goNext(posts.length); }
      if (e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, posts.length]);

  // ── Wheel navigation (debounced) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastScrollRef.current < 650) return;
      lastScrollRef.current = now;
      if (e.deltaY > 0) goNext(posts.length);
      else goPrev();
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [goNext, goPrev, posts.length]);

  // ── When navigating posts, keep comments panel in sync ──
  useEffect(() => {
    if (commentsOpen && posts[currentIdx]) {
      setCommentsPostId(posts[currentIdx].id);
    }
  }, [currentIdx, commentsOpen, posts]);

  // ── Toggle comments panel for current post ──
  const handleOpenComments = useCallback((postId: number) => {
    setCommentsPostId((prev) => {
      if (commentsOpen && prev === postId) {
        setCommentsOpen(false);
        return null;
      }
      setCommentsOpen(true);
      return postId;
    });
  }, [commentsOpen]);

  const handleCloseComments = useCallback(() => {
    setCommentsOpen(false);
    setCommentsPostId(null);
  }, []);

  // ── Post CRUD ──
  const handlePostCreated = useCallback(() => {
    setCreateOpen(false);
    setInitialLoading(true);
    offsetRef.current = 0;
    fetchPage(true);
  }, [fetchPage]);

  const handleDeleted = useCallback((id: number) => {
    setPosts(prev => {
      const next = prev.filter(p => p.id !== id);
      setCurrentIdx(ci => Math.min(ci, Math.max(0, next.length - 1)));
      return next;
    });
    if (commentsPostId === id) handleCloseComments();
  }, [commentsPostId, handleCloseComments]);

  const handleUpdated = useCallback((id: number, content: string, privacy: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, content, privacy: privacy as FeedPost["privacy"] } : p));
  }, []);

  // ── Active post for comments panel ──
  const commentsPost = posts.find(p => p.id === commentsPostId) ?? null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;
  if (showErrorPage) {
    return (
      <WebSocketErrorPage
        onRetry={() => window.location.reload()}
        isReconnecting={false}
        reconnectAttempts={reconnectAttempts}
        maxAttempts={ws.getMaxReconnectAttempts()}
      />
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── Centre: TikTok-style viewer ── */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">

        {initialLoading ? (
          /* Loading skeleton */
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl h-full bg-surface border border-border rounded-2xl animate-pulse flex flex-col">
              <div className="p-5 flex items-center gap-3 border-b border-border">
                <div className="w-11 h-11 rounded-full bg-foreground/10 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-foreground/10 rounded w-36" />
                  <div className="h-2 bg-foreground/10 rounded w-20" />
                </div>
              </div>
              <div className="flex-1 p-5 space-y-3">
                <div className="h-3 bg-foreground/10 rounded w-full" />
                <div className="h-3 bg-foreground/10 rounded w-4/5" />
                <div className="h-3 bg-foreground/10 rounded w-2/3" />
              </div>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <p className="text-foreground/40 text-sm">No posts yet</p>
            <button onClick={() => setCreateOpen(true)}
              className="px-4 py-2 rounded-lg bg-primary text-black text-sm font-bold hover:opacity-90 transition-opacity">
              Create the first post
            </button>
          </div>
        ) : (
          /* Slide container */
          <div
            className="absolute inset-0 flex flex-col"
            style={{
              transform: `translateY(-${currentIdx * 100}%)`,
              transition: "transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {posts.map((post, i) => (
              <div
                key={post.id}
                className="shrink-0 w-full flex items-center justify-center p-6"
                style={{ height: "100vh", minHeight: "100%" }}
              >
                <div className="w-full max-w-[680px]">
                  <FeedPostFull
                    post={post}
                    currentUserId={user.userId ?? 0}
                    commentsOpen={commentsOpen && commentsPostId === post.id}
                    onDeleted={handleDeleted}
                    onUpdated={handleUpdated}
                    onToggleComments={() => handleOpenComments(post.id)}
                  />
                </div>
              </div>
            ))}

            {/* Loading more indicator */}
            {fetchingMore && (
              <div className="shrink-0 w-full flex items-center justify-center" style={{ height: "100vh" }}>
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* End of feed */}
            {!hasMore && posts.length > 0 && (
              <div className="shrink-0 w-full flex items-center justify-center" style={{ height: "100vh" }}>
                <p className="text-foreground/30 text-sm">You&apos;ve seen all posts</p>
              </div>
            )}
          </div>
        )}

        {/* ── Up / Down arrow buttons ── */}
        {!initialLoading && posts.length > 0 && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-10">
            <button
              onClick={goPrev}
              disabled={currentIdx === 0}
              className="w-11 h-11 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-background disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              onClick={() => goNext(posts.length)}
              disabled={currentIdx >= posts.length - 1 && !hasMore}
              className="w-11 h-11 rounded-full bg-background/80 backdrop-blur border border-border flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-background disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── Post counter (sliding window always showing active dot) ── */}
        {!initialLoading && posts.length > 0 && (() => {
          const MAX = 9;
          const half = Math.floor(MAX / 2);
          const start = Math.max(0, Math.min(currentIdx - half, posts.length - MAX));
          const end = Math.min(posts.length, start + MAX);
          const windowIndices = Array.from({ length: end - start }, (_, k) => start + k);
          return (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
              {windowIndices.map((i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === currentIdx
                      ? "w-5 h-1.5 bg-primary"
                      : "w-1.5 h-1.5 bg-foreground/20 hover:bg-foreground/40"
                  }`}
                />
              ))}
              {end < posts.length && (
                <span className="text-[10px] text-foreground/30 self-center ml-0.5">+{posts.length - end}</span>
              )}
            </div>
          );
        })()}

        {/* ── New Post button (floating) ── */}
        <button
          onClick={() => setCreateOpen(true)}
          className="absolute bottom-6 right-16 z-10 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-black font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* ── Right panel: Sidebar OR Comments ── */}
      {commentsOpen && commentsPost ? (
        <FeedCommentsPanel
          post={commentsPost}
          currentUserId={user.userId ?? 0}
          onClose={handleCloseComments}
        />
      ) : (
        <FeedSidebar currentUserId={user.userId ?? 0} />
      )}

      {/* ── Create Post Modal ── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreateOpen(false)} />
          <div className="relative w-full max-w-xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
              <p className="font-bold text-foreground">Create Post</p>
              <button onClick={() => setCreateOpen(false)}
                className="p-1.5 rounded-full hover:bg-foreground/5 text-foreground/40 hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <CreatePost user={user} onPostCreated={handlePostCreated} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
