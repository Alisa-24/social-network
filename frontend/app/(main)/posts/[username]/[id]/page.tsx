"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPost, type FeedPost } from "@/lib/posts";
import { getCurrentUser } from "@/lib/auth/auth";
import FeedPostFull from "@/components/feed/FeedPostFull";
import FeedSidebar from "@/components/feed/FeedSidebar";
import FeedCommentsPanel from "@/components/feed/FeedCommentsPanel";

export default function PostDetailPage() {
  const { id, username } = useParams<{ id: string; username: string }>();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState(0);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Comments panel
  const [commentsOpen, setCommentsOpen] = useState(false);

  const navBlockedRef = useRef(false);

  // ── initial load ──
  useEffect(() => {
    getCurrentUser()
      .then((u) => { if (u) setCurrentUserId(u.userId ?? 0); })
      .catch(() => {});

    getPost(Number(id))
      .then((p) => {
        if (p.author?.username && p.author.username !== username) {
          setNotFound(true);
          return;
        }
        setPost(p);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, username]);

  const handleToggleComments = useCallback(() => {
    setCommentsOpen((o) => !o);
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentsOpen(false);
  }, []);

  const handleDeleted = useCallback(() => {
    router.push("/feed");
  }, [router]);

  const handleUpdated = useCallback(
    (postId: number, content: string, privacy: string) => {
      setPost((prev) =>
        prev ? { ...prev, content, privacy: privacy as FeedPost["privacy"] } : prev
      );
    },
    []
  );

  // ── Loading ──
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

  // ── Not found ──
  if (notFound || !post) {
    return (
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-foreground/40">
          <p className="text-lg font-semibold">Post not found</p>
          <button
            onClick={() => router.push("/feed")}
            className="text-primary text-sm hover:underline"
          >
            Go back to feed
          </button>
        </div>
        <FeedSidebar currentUserId={currentUserId} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* ── Centre: single post, feed-style ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-5 left-5 z-10 flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors bg-background/70 backdrop-blur px-3 py-1.5 rounded-full border border-border shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Post centred exactly like the feed */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="w-full max-w-[860px]">
            <FeedPostFull
              post={post}
              currentUserId={currentUserId}
              commentsOpen={commentsOpen}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
              onToggleComments={handleToggleComments}
              onNavBlock={(blocked) => { navBlockedRef.current = blocked; }}
            />
          </div>
        </div>
      </div>

      {/* ── Right panel: Comments OR Sidebar ── */}
      {commentsOpen ? (
        <FeedCommentsPanel
          post={post}
          currentUserId={currentUserId}
          onClose={handleCloseComments}
        />
      ) : (
        <FeedSidebar currentUserId={currentUserId} />
      )}
    </div>
  );
}
