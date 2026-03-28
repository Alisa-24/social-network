"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";
import { User } from "@/lib/interfaces";
import * as ws from "@/lib/ws/ws";
import WebSocketErrorPage from "@/components/layout/WebSocketErrorPage";
import CreatePost from "@/components/feed/CreatePost";
import FeedPostCard from "@/components/feed/FeedPostCard";
import FeedSidebar from "@/components/feed/FeedSidebar";
import { getFeedPosts, type FeedPost } from "@/lib/posts";

const LIMIT = 5;

function PostSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 animate-pulse">
      <div className="flex gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-foreground/10 shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 bg-foreground/10 rounded w-32" />
          <div className="h-2 bg-foreground/10 rounded w-20" />
        </div>
      </div>
      <div className="h-3 bg-foreground/10 rounded w-full mb-2" />
      <div className="h-3 bg-foreground/10 rounded w-3/4" />
    </div>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showErrorPage, setShowErrorPage] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);

  // ── Auth check ──
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

  // ── WS error tracking ──
  useEffect(() => {
    if (!user) return;
    const handleConnect = () => { setShowErrorPage(false); setReconnectAttempts(0); };
    const handleDisconnect = () => setReconnectAttempts(ws.getReconnectAttempts());
    const handleMaxRetries = () => setShowErrorPage(true);
    ws.onConnect(handleConnect);
    ws.onDisconnect(handleDisconnect);
    ws.onMaxRetriesReached(handleMaxRetries);
  }, [user]);

  // ── Fetch next page using refs (no stale closures) ──
  const fetchPage = useCallback(async (reset = false) => {
    if (isFetchingRef.current || (!reset && !hasMoreRef.current)) return;
    isFetchingRef.current = true;
    setFetching(true);
    const currentOffset = reset ? 0 : offsetRef.current;
    try {
      const { posts: newPosts, has_more } = await getFeedPosts(currentOffset, LIMIT);
      setPosts((prev) => reset ? newPosts : [...prev, ...newPosts]);
      offsetRef.current = currentOffset + newPosts.length;
      hasMoreRef.current = has_more;
      setHasMore(has_more);
    } catch {
      /* silently fail */
    } finally {
      setFetching(false);
      setInitialLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // ── Initial load ──
  useEffect(() => {
    if (!user) return;
    fetchPage(true);
  }, [user, fetchPage]);

  // ── Infinite scroll — re-attach observer after initial load so sentinel is in DOM ──
  useEffect(() => {
    if (initialLoading || !sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !isFetchingRef.current) {
          fetchPage(false);
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchPage, initialLoading]);

  // ── After creating a new post, reload from top ──
  const handlePostCreated = useCallback(() => {
    setInitialLoading(true);
    fetchPage(true);
  }, [fetchPage]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-foreground/40 text-sm">Loading...</p>
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
      {/* ── Centre: scrollable feed ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <CreatePost user={user} onPostCreated={handlePostCreated} />

          {initialLoading ? (
            <div className="space-y-4">
              {Array.from({ length: LIMIT }).map((_, i) => <PostSkeleton key={i} />)}
            </div>
          ) : posts.length === 0 ? (
            <div className="border border-border rounded-xl bg-surface p-10 text-center">
              <p className="text-foreground/40 text-sm">No posts yet. Be the first to post something!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  currentUserId={user.userId ?? 0}
                  onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                  onUpdated={(id, content, privacy) =>
                    setPosts((prev) =>
                      prev.map((p) =>
                        p.id === id ? { ...p, content, privacy: privacy as FeedPost["privacy"] } : p
                      )
                    )
                  }
                />
              ))}

              {/* Sentinel — triggers next page load */}
              {hasMore && <div ref={sentinelRef} />}

              {/* Loading indicator while fetching next page */}
              {fetching && !initialLoading && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-2">
                    <svg className="w-6 h-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </div>
                  {Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)}
                </div>
              )}

              {/* End of feed */}
              {!hasMore && (
                <p className="text-center text-xs text-foreground/30 py-4">
                  You&apos;ve seen all posts
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right sidebar ── */}
      <FeedSidebar currentUserId={user.userId ?? 0} />
    </div>
  );
}
