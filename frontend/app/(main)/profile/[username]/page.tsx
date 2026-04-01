"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Settings, Mail, Cake, ShieldCheck, Users, Globe, Lock,
  Loader2, Search, UserIcon, ArrowLeft, Heart, MessageSquare,
  Share2, Activity, FileText, Zap, Check, X, UserCheck, BadgeCheck, ShieldAlert,
} from "lucide-react";
import { sendOTP, verifyOTP } from "@/lib/auth/otp";
import { getCurrentUser } from "@/lib/auth/auth";
import { followUser, unfollowUser, getFollowers, getFollowing } from "@/lib/users/follow";
import { fetchUserProfile } from "@/lib/users/profile";
import type { PublicProfile } from "@/lib/users/profile";
import { getUserPosts, toggleLike, type FeedPost } from "@/lib/posts";
import { API_URL } from "@/lib/config";
import { User } from "@/lib/interfaces";
import type { UserSearchResult } from "@/lib/users/search";
import * as ws from "@/lib/ws/ws";

interface UserStats { postsCount: number; likesReceived: number; commentsReceived: number; }

async function getUserStats(username: string): Promise<UserStats | null> {
  try {
    const res = await fetch(`${API_URL}/api/users/${username}/stats`, { credentials: "include" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

type Tab = "posts" | "followers" | "following" | "activity";
type FollowStatus = "none" | "pending" | "accepted";

/* ── Count-up hook ── */
function useCountUp(target: number, duration: number, animKey: number) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    setValue(0);
    if (target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, animKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return value;
}

/* ── Stat ring ── */
const RADIUS = 40;
const CIRC = 2 * Math.PI * RADIUS;

function StatRing({ value, maxValue, color, glowColor, label, icon: Icon, animKey, delay = 0 }: {
  value: number; maxValue: number; color: string; glowColor: string;
  label: string; icon: React.ElementType; animKey: number; delay?: number;
}) {
  const displayed = useCountUp(value, 1600 + delay, animKey);
  const offset = CIRC * (1 - (maxValue > 0 ? Math.min(displayed / maxValue, 1) : 0));
  return (
    <div className="flex flex-col items-center gap-3 group">
      <div className="relative w-36 h-36">
        <div className="absolute inset-[-6px] rounded-full" style={{ animation: `spin ${18 + delay / 100}s linear infinite` }}>
          <svg viewBox="0 0 108 108" className="w-full h-full opacity-20">
            <circle cx="54" cy="54" r="50" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4 8" strokeLinecap="round" />
          </svg>
        </div>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="7" className="text-foreground/5" />
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${glowColor})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <Icon className="w-5 h-5 transition-transform group-hover:scale-125" style={{ color, filter: `drop-shadow(0 0 4px ${glowColor})` }} />
          <span className="text-2xl font-black text-foreground tabular-nums leading-none">{displayed.toLocaleString()}</span>
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{label}</p>
    </div>
  );
}

/* ── Privacy labels for posts ── */
const PRIVACY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  public:    { label: "PUBLIC",        icon: <Globe className="w-3 h-3" /> },
  followers: { label: "FOLLOWERS",     icon: <Users className="w-3 h-3" /> },
  selected:  { label: "CLOSE FRIENDS", icon: <Lock  className="w-3 h-3" /> },
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

/* ── Post card (feed style) ── */
function ProfilePostCard({ post, authorName, authorAvatarSrc }: {
  post: FeedPost; authorName: string; authorAvatarSrc: string | null;
}) {
  const [likes, setLikes] = useState(post.likes);
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likeLoading, setLikeLoading] = useState(false);
  const privacy = PRIVACY_LABELS[post.privacy] ?? PRIVACY_LABELS.public;
  const isVideo = post.image_path ? /\.(mp4|webm|mov)$/i.test(post.image_path) : false;

  const handleLike = async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const prevLiked = isLiked; const prevCount = likes;
    setIsLiked(!prevLiked); setLikes(prevLiked ? prevCount - 1 : prevCount + 1);
    try { const res = await toggleLike(post.id); setIsLiked(res.is_liked); setLikes(res.likes); }
    catch { setIsLiked(prevLiked); setLikes(prevCount); }
    finally { setLikeLoading(false); }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/posts/${post.author?.username ?? post.user_id}/${post.id}`;
    if (navigator.share) await navigator.share({ text: post.content, url });
    else await navigator.clipboard.writeText(url);
  };

  return (
    <div className="w-full flex flex-col bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="p-5 flex items-center gap-3 border-b border-border">
        {authorAvatarSrc
          ? <img src={authorAvatarSrc} alt={authorName} className="w-11 h-11 rounded-full object-cover shrink-0" />
          : <div className="w-11 h-11 rounded-full bg-foreground/10 border border-border font-semibold text-foreground/60 flex items-center justify-center shrink-0">{authorName[0]}</div>
        }
        <div>
          <p className="font-semibold text-foreground">{authorName}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-foreground/40 font-semibold uppercase tracking-wider mt-0.5">
            <span>{timeAgo(post.created_at)}</span><span>·</span>{privacy.icon}<span>{privacy.label}</span>
          </div>
        </div>
      </div>
      {post.content && <div className="px-5 py-4"><p className="text-base text-foreground/85 leading-relaxed whitespace-pre-wrap break-words">{post.content}</p></div>}
      {post.image_path && (
        isVideo
          ? <div className="bg-foreground/5"><video src={`${API_URL}${post.image_path}`} controls className="w-full max-h-[420px]" /></div>
          : <div className="bg-foreground/5"><img src={`${API_URL}${post.image_path}`} alt="post" className="w-full object-contain max-h-[420px]" /></div>
      )}
      <div className="px-5 py-4 flex items-center gap-5 border-t border-border">
        <button onClick={handleLike} disabled={likeLoading} className="flex items-center gap-2 text-muted hover:text-primary transition-colors group disabled:opacity-50">
          <Heart className={`w-6 h-6 transition-all ${isLiked ? "fill-primary text-primary scale-110" : "group-hover:scale-110"}`} />
          <span className="text-sm font-bold">{likes > 0 ? likes : ""}</span>
        </button>
        <button className="flex items-center gap-2 text-muted hover:text-primary transition-colors group">
          <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-bold">{post.comments_count > 0 ? post.comments_count : "0"}</span>
        </button>
        <button onClick={handleShare} className="ml-auto text-muted hover:text-primary transition-colors"><Share2 className="w-6 h-6" /></button>
      </div>
    </div>
  );
}

/* ── Info card (about section) ── */
function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-surface/50 border border-border p-3 rounded-lg flex items-center gap-3">
      <div className="bg-foreground/5 p-2 rounded-md shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted uppercase font-bold tracking-tight">{label}</p>
        <p className="text-xs text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

/* ── Follow requests panel ── */
/* ── Person card (grid layout for followers/following) ── */
function PersonCard({ person, currentUserId, onFollowChange }: {
  person: UserSearchResult;
  currentUserId?: number;
  onFollowChange: (username: string, prev: FollowStatus, next: FollowStatus) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<FollowStatus>(person.followStatus ?? "none");
  const [busy, setBusy] = useState(false);

  const isSelf = currentUserId != null && person.userId === currentUserId;
  const avatarSrc = person.avatar ? `${API_URL}${person.avatar}` : null;
  const displayName = `${person.firstName} ${person.lastName}`.trim() || person.username;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy || isSelf) return;
    const prev = status;
    if (status === "accepted" || status === "pending") {
      setStatus("none"); setBusy(true);
      const res = await unfollowUser(person.username);
      if (res.success) onFollowChange(person.username, prev, "none"); else setStatus(prev);
    } else {
      setStatus("accepted"); setBusy(true);
      const res = await followUser(person.username);
      if (res.success) {
        const next = (res.status ?? "accepted") as FollowStatus;
        setStatus(next); onFollowChange(person.username, prev, next);
      } else setStatus(prev);
    }
    setBusy(false);
  };

  const label = status === "accepted" ? "Following" : status === "pending" ? "Requested" : "Follow";
  const btnClass = isSelf
    ? "text-xs font-bold px-3 py-1.5 rounded-lg bg-foreground/5 text-muted cursor-default shrink-0"
    : status === "none"
    ? "text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-black hover:opacity-90 transition-opacity shrink-0"
    : "text-xs font-bold px-3 py-1.5 rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/15 transition-colors shrink-0";

  return (
    <div
      className="bg-surface border border-border p-4 rounded-xl flex items-center justify-between hover:border-primary/50 transition-all cursor-pointer group"
      onClick={() => router.push(`/profile/${person.username}`)}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center">
          {avatarSrc
            ? <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
            : <UserIcon className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted truncate">@{person.username}</p>
        </div>
      </div>
      <button onClick={isSelf ? undefined : handleClick} disabled={busy || isSelf} className={btnClass}>
        {isSelf ? "You" : busy ? <Loader2 className="w-3 h-3 animate-spin" /> : label}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Main profile page                                          */
/* ─────────────────────────────────────────────────────────── */
/* ── OTP Verification Modal ── */
function OTPModal({ email, onSuccess, onClose }: {
  email: string;
  onSuccess: (user: any) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"idle" | "sending" | "sent" | "verifying" | "success">("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSend = async () => {
    setStep("sending"); setError("");
    const res = await sendOTP();
    if (res.success) { setStep("sent"); setCountdown(60); }
    else { setError(res.message); setStep("idle"); }
  };

  const handleVerify = async () => {
    if (code.length !== 6) { setError("Enter the 6-digit code."); return; }
    setStep("verifying"); setError("");
    const res = await verifyOTP(code);
    if (res.success) { setStep("success"); setTimeout(() => { onSuccess(res.user); onClose(); }, 2000); }
    else { setError(res.message); setStep("sent"); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
      <div className="relative w-full max-w-sm bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #00d1b2, #3b82f6, #00d1b2)", backgroundSize: "200%", animation: "shimmer 2s linear infinite" }} />

        <div className="p-6">
          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-foreground/8 hover:bg-foreground/15 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-muted" />
          </button>

          {step === "success" ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(0,209,178,0.15)", animation: "popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)" }}>
                <BadgeCheck className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-bold text-lg">Account Verified!</p>
                <p className="text-muted text-sm mt-1">Your account is now verified.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-foreground font-bold text-base">Verify Your Account</h2>
                  <p className="text-muted text-xs">We'll send a code to <span className="text-primary font-semibold">{email}</span></p>
                </div>
              </div>

              {/* Code input */}
              {(step === "sent" || step === "verifying") && (
                <div className="mb-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted mb-2 block">Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                    placeholder="000000"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-center text-2xl font-black text-foreground tracking-[0.5em] outline-none focus:border-primary/60 transition-colors placeholder:text-muted/30"
                    autoFocus
                  />
                  <p className="text-xs text-muted mt-2 text-center">Code expires in 10 minutes</p>
                </div>
              )}

              {/* Error */}
              {error && <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</p>}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {step === "idle" && (
                  <button onClick={handleSend} className="w-full h-11 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" /> Send Verification Code
                  </button>
                )}
                {step === "sending" && (
                  <button disabled className="w-full h-11 rounded-xl bg-primary/50 text-black font-bold text-sm flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                  </button>
                )}
                {(step === "sent" || step === "verifying") && (
                  <>
                    <button onClick={handleVerify} disabled={step === "verifying" || code.length !== 6} className="w-full h-11 rounded-xl bg-primary text-black font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                      {step === "verifying" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {step === "verifying" ? "Verifying..." : "Verify"}
                    </button>
                    <button onClick={handleSend} disabled={countdown > 0 || step === "verifying"} className="w-full h-9 rounded-xl bg-foreground/5 text-muted text-xs font-semibold hover:bg-foreground/10 transition-colors disabled:opacity-40">
                      {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <style>{`
          @keyframes shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
          @keyframes popIn { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const usernameParam = params.username as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileUser, setProfileUser] = useState<User | PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [headerFollowStatus, setHeaderFollowStatus] = useState<FollowStatus>("none");
  const [headerFollowBusy, setHeaderFollowBusy] = useState(false);
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [requestCount, setRequestCount] = useState(0);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [verifiedFlash, setVerifiedFlash] = useState(false);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsOffset, setPostsOffset] = useState(0);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsInitialized, setPostsInitialized] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsAnimKey, setStatsAnimKey] = useState(0);

  const [followers, setFollowers] = useState<UserSearchResult[]>([]);
  const [following, setFollowing] = useState<UserSearchResult[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listSearch, setListSearch] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const isOwnProfile = usernameParam === "me" || (currentUser != null && usernameParam === currentUser.username);

  /* ── Load profile ── */
  useEffect(() => {
    async function load() {
      const me = await getCurrentUser();
      if (!me) { router.push("/login"); return; }
      setCurrentUser(me);
      const isOwn = usernameParam === "me" || usernameParam === me.username;
      if (isOwn) {
        setProfileUser(me); setLoading(false);
      } else {
        const data = await fetchUserProfile(usernameParam);
        if (!data) { setNotFound(true); }
        else {
          setProfileUser(data);
          setHeaderFollowStatus((data.followStatus ?? "none") as FollowStatus);
          setFollowersCount(data.followersCount);
          setFollowingCount(data.followingCount);
        }
        setLoading(false);
      }
      // Fetch request count here — guaranteed to run after auth is confirmed
      if (isOwn) {
        fetch(`${API_URL}/api/follow/requests`, { credentials: "include" })
          .then((r) => r.json())
          .then((d) => setRequestCount((d.requests ?? []).length))
          .catch(() => {});
      }
    }
    load();
  }, [usernameParam, router]);

  /* ── Load followers + following ── */
  useEffect(() => {
    if (!profileUser) return;
    const target = (profileUser as User).username ?? (profileUser as PublicProfile).username;
    async function loadLists() {
      setListLoading(true);
      const [frsRes, fngRes] = await Promise.all([getFollowers(target), getFollowing(target)]);
      setFollowers(frsRes.followers ?? []);
      setFollowing(fngRes.following ?? []);
      if (isOwnProfile) { setFollowersCount(frsRes.count ?? 0); setFollowingCount(fngRes.count ?? 0); }
      setListLoading(false);
    }
    loadLists();
  }, [profileUser]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load posts (first page) ── */
  useEffect(() => {
    if (!profileUser || postsInitialized) return;
    const target = (profileUser as User).username ?? (profileUser as PublicProfile).username;
    if (!target) return;
    async function loadPosts() {
      setPostsLoading(true);
      try {
        const res = await getUserPosts(target, 0, 10);
        setPosts(res.posts); setPostsOffset(res.posts.length);
        setPostsHasMore(res.has_more); setPostsInitialized(true);
      } catch { setPostsInitialized(true); }
      finally { setPostsLoading(false); }
    }
    loadPosts();
  }, [profileUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOwnProfile) return;
    const handler = (data: any) => {
      if (data.type !== "follow_update") return;
      const d = data.data;
      if (d.status === "pending") {
        setRequestCount((c) => c + 1);
      } else if (d.status === "none" || d.status === "accepted") {
        setRequestCount((c) => Math.max(0, c - 1));
      }
    };
    ws.on("follow_update", handler);
    return () => ws.off("follow_update", handler);
  }, [isOwnProfile]);

  /* ── Visitor: update follow button when own request is accepted/cancelled ── */
  useEffect(() => {
    if (isOwnProfile || !currentUser) return;
    const handler = (data: any) => {
      const d = data.data;
      // Only care about events where WE are the follower
      if (d.followerId !== currentUser.userId) return;
      if (d.status === "accepted") setHeaderFollowStatus("accepted");
      else if (d.status === "none") setHeaderFollowStatus("none");
    };
    ws.on("follow_update", handler);
    return () => ws.off("follow_update", handler);
  }, [isOwnProfile, currentUser]);

  /* ── Load more posts ── */
  const loadMorePosts = async () => {
    if (postsLoading || !postsHasMore) return;
    const target = (profileUser as User)?.username ?? (profileUser as PublicProfile)?.username;
    if (!target) return;
    setPostsLoading(true);
    try {
      const res = await getUserPosts(target, postsOffset, 10);
      setPosts((prev) => [...prev, ...res.posts]);
      setPostsOffset((o) => o + res.posts.length);
      setPostsHasMore(res.has_more);
    } catch { /* ignore */ }
    finally { setPostsLoading(false); }
  };

  /* ── IntersectionObserver for infinite scroll ── */
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !postsHasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadMorePosts();
    }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }); // no deps — fresh closure each render

  /* ── Load stats when Activity tab opens ── */
  useEffect(() => {
    if (activeTab !== "activity" || !profileUser) return;
    setStatsAnimKey((k) => k + 1);
    if (stats) return;
    const username = (profileUser as User).username ?? (profileUser as PublicProfile).username;
    setStatsLoading(true);
    getUserStats(username).then((s) => { setStats(s); setStatsLoading(false); });
  }, [activeTab, profileUser]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sync profile when settings saved ── */
  useEffect(() => {
    if (!isOwnProfile) return;
    const handleUserUpdated = (e: Event) => {
      const updated = (e as CustomEvent).detail as User;
      if (!updated) return;
      setCurrentUser(updated); setProfileUser(updated);
    };
    window.addEventListener("userUpdated", handleUserUpdated);
    return () => window.removeEventListener("userUpdated", handleUserUpdated);
  }, [isOwnProfile]);

  /* ── Privacy toggle ── */
  const handlePrivacyToggle = async () => {
    if (!currentUser || togglingPrivacy) return;
    const u = profileUser as User;
    const newIsPublic = !(u.isPublic === true);
    setTogglingPrivacy(true);
    setProfileUser((p) => p ? { ...p, isPublic: newIsPublic } : p);
    try {
      const res = await fetch(`${API_URL}/api/profile/privacy`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: newIsPublic }),
      });
      const result = await res.json();
      if (result.success && result.user) {
        const updated = { ...u, ...result.user };
        setProfileUser(updated);
        setCurrentUser(updated);
        localStorage.setItem("currentUser", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent("userUpdated", { detail: updated }));
        if (newIsPublic) setRequestCount(0);
      } else {
        setProfileUser((p) => p ? { ...p, isPublic: !newIsPublic } : p);
      }
    } catch {
      setProfileUser((p) => p ? { ...p, isPublic: !newIsPublic } : p);
    }
    setTogglingPrivacy(false);
  };

  /* ── Follow / Unfollow ── */
  const handleHeaderFollow = async () => {
    if (headerFollowBusy || !profileUser) return;
    const target = (profileUser as PublicProfile).username;
    const prev = headerFollowStatus;
    // Unfollow only if accepted, or if "pending" on a private account (cancel request)
    if (headerFollowStatus === "accepted" || (headerFollowStatus === "pending" && !isPublic)) {
      setHeaderFollowStatus("none"); setHeaderFollowBusy(true);
      const res = await unfollowUser(target);
      if (res.success) {
        const fresh = await fetchUserProfile(usernameParam);
        if (fresh) {
          setProfileUser(fresh);
          setHeaderFollowStatus((fresh.followStatus ?? "none") as FollowStatus);
          setFollowersCount(fresh.followersCount); setFollowingCount(fresh.followingCount);
        }
      } else setHeaderFollowStatus(prev);
    } else {
      setHeaderFollowStatus("accepted"); setHeaderFollowBusy(true);
      const res = await followUser(target);
      if (res.success) {
        const next = (res.status ?? "accepted") as FollowStatus;
        setHeaderFollowStatus(next);
        const fresh = await fetchUserProfile(usernameParam);
        if (fresh) {
          setProfileUser(fresh);
          setFollowersCount(fresh.followersCount); setFollowingCount(fresh.followingCount);
          setHeaderFollowStatus((fresh.followStatus ?? next) as FollowStatus);
        }
      } else setHeaderFollowStatus(prev);
    }
    setHeaderFollowBusy(false);
  };

  /* ── Follow change from cards ── */
  const handleFollowChange = (targetUsername: string, prev: FollowStatus, next: FollowStatus) => {
    const patch = (list: UserSearchResult[]) =>
      list.map((u) => u.username === targetUsername ? { ...u, followStatus: next } : u);
    setFollowers(patch); setFollowing(patch);
    if (prev !== "accepted" && next === "accepted") setFollowingCount((c) => c + 1);
    else if (prev === "accepted" && next === "none") setFollowingCount((c) => Math.max(0, c - 1));
  };

  /* ── Real-time follow updates ── */
  useEffect(() => {
    if (!isOwnProfile) return;
    const handler = (data: any) => {
      if (data.type !== "follow_update") return;
      const d = data.data;
      if (d.status === "accepted") {
        setFollowers((prev) => {
          if (prev.some((u) => u.userId === d.followerId)) return prev;
          return [{ userId: d.followerId, username: d.followerUsername, firstName: d.followerFirstName,
            lastName: d.followerLastName, avatar: d.followerAvatar || "", nickname: "",
            aboutMe: "", isPublic: true, followStatus: "none", followsMe: true }, ...prev];
        });
        setFollowersCount((c) => c + 1);
      } else if (d.status === "none") {
        setFollowers((prev) => prev.filter((u) => u.userId !== d.followerId));
        setFollowersCount((c) => Math.max(0, c - 1));
      }
    };
    ws.on("follow_update", handler);
    return () => { ws.off("follow_update", handler); };
  }, [isOwnProfile]);

  /* ── Real-time privacy changes ── */
  useEffect(() => {
    if (isOwnProfile || !profileUser) return;
    const targetId = (profileUser as PublicProfile).userId;
    const handler = async (data: any) => {
      if (data.type !== "privacy_changed" || data.data.userId !== targetId) return;
      const fresh = await fetchUserProfile(usernameParam);
      if (!fresh) return;
      setProfileUser(fresh);
      setHeaderFollowStatus((fresh.followStatus ?? "none") as FollowStatus);
      setFollowersCount(fresh.followersCount); setFollowingCount(fresh.followingCount);
    };
    ws.on("privacy_changed", handler);
    return () => { ws.off("privacy_changed", handler); };
  }, [isOwnProfile, profileUser, usernameParam]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Helpers ── */
  const getField = <K extends keyof User & keyof PublicProfile>(key: K) =>
    profileUser ? (profileUser as any)[key] : undefined;

  const avatarSrc = getField("avatar") ? `${API_URL}${getField("avatar")}` : null;
  const displayName = [getField("firstName"), getField("lastName")].filter(Boolean).join(" ") || getField("username") || "";
  const handle = `@${getField("username")}`;
  const isPublic = getField("isPublic") === true;
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try { return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }); }
    catch { return dateStr; }
  };
  const memberSince = getField("createdAt")
    ? new Date(getField("createdAt") as string).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  const isLocked = !isOwnProfile && (profileUser as PublicProfile)?.isLocked === true;

  const searchLower = listSearch.toLowerCase();
  const displayedList = (activeTab === "followers" ? followers : following).filter((u) => {
    const hay = `${u.firstName} ${u.lastName} ${u.username} ${u.nickname ?? ""}`.toLowerCase();
    return hay.includes(searchLower);
  });

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "posts",     label: "Posts" },
    ...(!isLocked ? [
      { key: "followers" as Tab, label: "Followers", badge: followersCount },
      { key: "following" as Tab, label: "Following", badge: followingCount },
    ] : []),
    ...(isOwnProfile ? [{ key: "activity" as Tab, label: "Activity" }] : []),
  ];

  /* ── Loading ── */
  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-foreground text-lg font-semibold">User not found</p>
        <p className="text-muted text-sm mt-1">This profile doesn&apos;t exist or is private.</p>
      </div>
    </div>
  );

  // On a public account, a stale "pending" state means the request was already accepted — treat as Follow
  const pendingOnPublic = headerFollowStatus === "pending" && isPublic;
  const headerFollowLabel = headerFollowStatus === "accepted" ? "Unfollow" : (headerFollowStatus === "pending" && !pendingOnPublic) ? "Requested" : "Follow";

  /* ════════════════════════════════════════════════════════════
     MAIN RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="w-full flex flex-col flex-1 overflow-hidden">

        {/* ══ COVER + HEADER ══════════════════════════════════════ */}
        <div className="relative">
          {/* Animated cover */}
          <div
            className="h-44 md:h-52 w-full overflow-hidden relative"
            style={{ background: "#020c0a" }}
          >
            {/* Back button — overlaid on cover for visitor profiles */}
            {!isOwnProfile && (
              <div className="absolute top-4 left-4" style={{ zIndex: 10 }}>
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors bg-black/30 hover:bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              </div>
            )}
            {/* z-0: base layers */}
            <div className="absolute inset-0" style={{ zIndex: 0,
              background: "linear-gradient(135deg, #000d0b 0%, #002e28 40%, #001830 75%, #000d0b 100%)"
            }} />

            {/* Orb 1 — teal */}
            <div className="absolute rounded-full pointer-events-none" style={{ zIndex: 1,
              width: "320px", height: "320px", top: "-80px", left: "15%",
              background: "radial-gradient(circle, rgba(0,209,178,0.18) 0%, transparent 70%)",
              animation: "drift1 9s ease-in-out infinite",
            }} />
            {/* Orb 2 — blue */}
            <div className="absolute rounded-full pointer-events-none" style={{ zIndex: 1,
              width: "260px", height: "260px", top: "-40px", right: "20%",
              background: "radial-gradient(circle, rgba(56,130,246,0.14) 0%, transparent 70%)",
              animation: "drift2 12s ease-in-out infinite",
            }} />
            {/* Orb 3 — accent */}
            <div className="absolute rounded-full pointer-events-none" style={{ zIndex: 1,
              width: "150px", height: "150px", bottom: "-20px", left: "45%",
              background: "radial-gradient(circle, rgba(0,209,178,0.12) 0%, transparent 70%)",
              animation: "drift3 7s ease-in-out infinite",
            }} />

            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ zIndex: 2,
              backgroundImage: "linear-gradient(rgba(0,209,178,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,209,178,1) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }} />

            {/* Particles */}
            {[
              { x:"12%", y:"20%", d:"6s", delay:"0s",   size:"2px" },
              { x:"28%", y:"60%", d:"8s", delay:"1s",   size:"1.5px" },
              { x:"44%", y:"35%", d:"5s", delay:"2s",   size:"2px" },
              { x:"60%", y:"70%", d:"9s", delay:"0.5s", size:"1px" },
              { x:"72%", y:"25%", d:"7s", delay:"3s",   size:"2px" },
              { x:"85%", y:"55%", d:"6s", delay:"1.5s", size:"1.5px" },
              { x:"20%", y:"80%", d:"10s",delay:"2.5s", size:"1px" },
              { x:"50%", y:"15%", d:"7s", delay:"0.8s", size:"2px" },
              { x:"90%", y:"40%", d:"8s", delay:"3.5s", size:"1.5px" },
              { x:"35%", y:"50%", d:"5s", delay:"1.2s", size:"1px" },
            ].map((p, i) => (
              <div key={i} className="absolute rounded-full pointer-events-none" style={{
                zIndex: 2, left: p.x, top: p.y,
                width: p.size, height: p.size,
                background: i % 2 === 0 ? "rgba(0,209,178,0.7)" : "rgba(96,165,250,0.6)",
                boxShadow: i % 2 === 0 ? "0 0 4px rgba(0,209,178,0.8)" : "0 0 4px rgba(96,165,250,0.8)",
                animation: `particle ${p.d} ease-in-out infinite`,
                animationDelay: p.delay,
              }} />
            ))}

            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none" style={{ zIndex: 3,
              background: "linear-gradient(to bottom, transparent, #09090b)"
            }} />

            <style>{`
              @keyframes drift1 {
                0%,100% { transform: translate(0,0) scale(1); }
                33%      { transform: translate(30px,20px) scale(1.05); }
                66%      { transform: translate(-20px,10px) scale(0.97); }
              }
              @keyframes drift2 {
                0%,100% { transform: translate(0,0) scale(1); }
                40%     { transform: translate(-25px,15px) scale(1.08); }
                70%     { transform: translate(15px,-10px) scale(0.95); }
              }
              @keyframes drift3 {
                0%,100% { transform: translate(0,0); }
                50%     { transform: translate(-18px,-12px) scale(1.1); }
              }
              @keyframes particle {
                0%,100% { transform: translate(0,0); opacity: 0.7; }
                25%     { transform: translate(6px,-8px); opacity: 1; }
                50%     { transform: translate(-4px,-14px); opacity: 0.5; }
                75%     { transform: translate(8px,-6px); opacity: 0.9; }
              }
              @keyframes verifiedPulse {
                0%   { box-shadow: 0 0 0 0 rgba(0,209,178,0.6); background: rgba(0,209,178,0.2); }
                50%  { box-shadow: 0 0 24px 8px rgba(0,209,178,0.15); background: rgba(0,209,178,0.12); }
                100% { box-shadow: 0 0 0 0 rgba(0,209,178,0); }
              }
            `}</style>

          </div>

          {/* Profile info row */}
          <div className="relative px-6 md:px-8 -mt-14 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4" style={{ zIndex: 10 }}>

            {/* Avatar + name */}
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="h-28 w-28 rounded-full border-4 border-background overflow-hidden shrink-0 bg-surface shadow-xl">
                {avatarSrc
                  ? <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
                  : <div className="h-full w-full flex items-center justify-center bg-foreground/5">
                      <span className="text-4xl font-bold text-muted-foreground/30">
                        {(getField("firstName")?.[0] || getField("username")?.[0] || "?").toUpperCase()}
                      </span>
                    </div>
                }
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{displayName}</h1>
                  {!isOwnProfile && (
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${isPublic ? "bg-primary/10 text-primary" : "bg-zinc-500/10 text-muted"}`}>
                      {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {isPublic ? "Public" : "Private"}
                    </span>
                  )}
                </div>
                <p className="text-muted text-sm mt-0.5">
                  {handle}{memberSince ? ` · Joined ${memberSince}` : ""}
                </p>
                <div className="flex items-center gap-5 mt-2">
                  <button onClick={() => setActiveTab("followers")} className="text-sm hover:text-primary transition-colors">
                    <span className="font-bold text-foreground">{followersCount}</span>{" "}
                    <span className="text-muted">Followers</span>
                  </button>
                  <button onClick={() => setActiveTab("following")} className="text-sm hover:text-primary transition-colors">
                    <span className="font-bold text-foreground">{followingCount}</span>{" "}
                    <span className="text-muted">Following</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {isOwnProfile ? (
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-surface/80 backdrop-blur-sm border border-border p-3 rounded-xl flex items-center gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted leading-none">Privacy</p>
                    <p className="text-sm text-foreground mt-0.5">{isPublic ? "Public" : "Private"}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={isPublic}
                    onClick={handlePrivacyToggle}
                    disabled={togglingPrivacy}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${isPublic ? "bg-primary" : "bg-foreground/20"}`}
                  >
                    {togglingPrivacy
                      ? <Loader2 className="w-3 h-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
                      : <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
                    }
                  </button>
                </div>
                <button onClick={() => router.push("/settings")}
                  className="flex items-center gap-2 h-10 px-4 rounded-lg bg-surface border border-border text-foreground text-sm font-semibold hover:bg-background transition-colors">
                  <Settings className="w-4 h-4" /> Edit Profile
                </button>
              </div>
            ) : (
              <button onClick={handleHeaderFollow} disabled={headerFollowBusy}
                className={`flex items-center justify-center gap-2 h-10 px-6 rounded-lg text-sm font-semibold transition-colors mb-2 ${headerFollowStatus === "none" ? "bg-primary text-black hover:bg-primary/90" : "bg-surface border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"}`}>
                {headerFollowBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : headerFollowLabel}
              </button>
            )}
          </div>
        </div>

        {/* ══ STICKY TABS ══════════════════════════════════════════ */}
        <div className="sticky top-0 z-10 border-b border-border px-6 md:px-8 bg-background/90 backdrop-blur-md">
          <div className="flex gap-6 md:gap-8 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 pb-4 pt-4 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.key ? "bg-primary/20 text-primary" : "bg-foreground/8 text-muted"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ══ TAB CONTENT + SIDEBAR ═══════════════════════════════ */}
        <div className="flex-1 overflow-hidden px-6 md:px-8 py-8 flex gap-6">

          {/* ── Main content (left) ── */}
          <div className="flex-1 min-w-0 overflow-y-auto pr-2">

            {/* Posts */}
            {activeTab === "posts" && (
              <div className="flex flex-col gap-6 max-w-2xl mx-auto">
                {isLocked ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-foreground/5 border border-border flex items-center justify-center">
                      <Lock className="w-7 h-7 text-muted/50" />
                    </div>
                    <div>
                      <p className="text-foreground font-semibold">This account is private</p>
                      <p className="text-muted text-sm mt-1 max-w-xs">Follow this account to see their posts.</p>
                    </div>
                  </div>
                ) : postsLoading && posts.length === 0 ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <FileText className="w-10 h-10 text-muted/40" />
                    <p className="text-foreground font-semibold text-sm">No posts yet</p>
                    <p className="text-muted text-xs max-w-xs">
                      {isOwnProfile ? "Share your first post to see it here." : "This user hasn't posted anything yet."}
                    </p>
                  </div>
                ) : (
                  <>
                    {posts.map((post) => (
                      <ProfilePostCard key={post.id} post={post} authorName={displayName} authorAvatarSrc={avatarSrc} />
                    ))}
                    <div ref={loadMoreRef} className="h-4" />
                    {postsLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
                    {!postsHasMore && posts.length > 0 && <p className="text-center text-muted text-xs py-2">All posts loaded</p>}
                  </>
                )}
              </div>
            )}

            {/* Followers / Following grid */}
            {(activeTab === "followers" || activeTab === "following") && (
              <div>
                <div className="mb-6 max-w-md">
                  <div className={`flex items-center gap-2.5 bg-surface border rounded-xl px-3.5 h-11 transition-colors ${listSearch ? "border-primary/50 shadow-[0_0_0_3px_rgba(0,209,178,0.08)]" : "border-border focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(0,209,178,0.08)]"}`}>
                    <Search className={`w-4 h-4 shrink-0 transition-colors ${listSearch ? "text-primary" : "text-muted"}`} />
                    <input
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                      placeholder={`Search ${activeTab}…`}
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/60 outline-none"
                    />
                    {listSearch && (
                      <button onClick={() => setListSearch("")} className="shrink-0 w-5 h-5 rounded-full bg-foreground/10 hover:bg-foreground/20 flex items-center justify-center transition-colors">
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-muted fill-current">
                          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {listSearch && (
                    <p className="text-xs text-muted mt-2 px-1">
                      {displayedList.length > 0
                        ? `${displayedList.length} result${displayedList.length !== 1 ? "s" : ""} for "${listSearch}"`
                        : `No results for "${listSearch}"`}
                    </p>
                  )}
                </div>
                {listLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : displayedList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    {listSearch ? (
                      <>
                        <div className="w-14 h-14 rounded-2xl bg-foreground/5 flex items-center justify-center">
                          <Search className="w-6 h-6 text-muted/40" />
                        </div>
                        <div>
                          <p className="text-foreground font-semibold text-sm">No user named &ldquo;{listSearch}&rdquo;</p>
                          <p className="text-muted text-xs mt-1">Try a different name or username.</p>
                        </div>
                        <button onClick={() => setListSearch("")} className="text-xs text-primary hover:underline font-semibold">Clear search</button>
                      </>
                    ) : (
                      <>
                        <Users className="w-10 h-10 text-muted/40" />
                        <p className="text-foreground font-semibold text-sm">
                          {activeTab === "followers" ? "No followers yet" : "Not following anyone yet"}
                        </p>
                        <p className="text-muted text-xs max-w-xs">
                          {activeTab === "followers" ? "When people follow this account they'll appear here." : "Accounts this person follows will appear here."}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedList.map((person) => (
                      <PersonCard key={person.userId} person={person} currentUserId={currentUser?.userId} onFollowChange={handleFollowChange} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Activity */}
            {activeTab === "activity" && isOwnProfile && (
              <div>
                {statsLoading && !stats ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : stats ? (
                  <div className="flex flex-col items-center gap-10 py-8">
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary animate-pulse" />
                        <p className="text-foreground font-black text-sm uppercase tracking-widest">Activity Overview</p>
                        <Zap className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                      <p className="text-muted text-xs">{displayName}&apos;s stats at a glance</p>
                    </div>
                    <div className="flex items-center justify-around w-full gap-4">
                      <StatRing value={stats.postsCount} maxValue={Math.max(stats.postsCount, stats.likesReceived, stats.commentsReceived, 1)} color="#00d1b2" glowColor="rgba(0,209,178,0.5)" label="Posts" icon={FileText} animKey={statsAnimKey} delay={0} />
                      <StatRing value={stats.likesReceived} maxValue={Math.max(stats.postsCount, stats.likesReceived, stats.commentsReceived, 1)} color="#f43f5e" glowColor="rgba(244,63,94,0.5)" label="Likes" icon={Heart} animKey={statsAnimKey} delay={200} />
                      <StatRing value={stats.commentsReceived} maxValue={Math.max(stats.postsCount, stats.likesReceived, stats.commentsReceived, 1)} color="#60a5fa" glowColor="rgba(96,165,250,0.5)" label="Comments" icon={MessageSquare} animKey={statsAnimKey} delay={400} />
                    </div>
                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground/5 border border-border">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted font-semibold">
                        Total engagement —{" "}
                        <span className="text-foreground font-black">{(stats.likesReceived + stats.commentsReceived).toLocaleString()}</span>{" "}
                        interactions
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center py-16"><p className="text-muted text-sm">Could not load stats.</p></div>
                )}
              </div>
            )}
          </div>

          {/* ── Info sidebar (right) ── */}
          <div className="hidden lg:flex flex-col gap-3 w-80 shrink-0 overflow-y-auto">

            {/* Follow Requests — always visible on own profile */}
            {isOwnProfile && (
              <button
                onClick={() => router.push("/notifications")}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between hover:border-primary/50 hover:bg-surface/80 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest">Follow Requests</span>
                </div>
                {requestCount > 0 && (
                  <span className="relative flex items-center justify-center">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary/40 animate-ping opacity-75" />
                    <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full relative">{requestCount}</span>
                  </span>
                )}
              </button>
            )}

            <h3 className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest pb-3 border-b border-border">About</h3>

            {/* Nickname */}
            {getField("nickname") && (
              <InfoCard icon={UserIcon} label="Nickname" value={getField("nickname") as string} />
            )}

            {/* Privacy */}
            <InfoCard icon={isPublic ? Globe : Lock} label="Privacy" value={isPublic ? "Public" : "Private"} />

            {/* Email — own profile only */}
            {isOwnProfile && (profileUser as User)?.email && (
              <InfoCard icon={Mail} label="Email" value={(profileUser as User).email} />
            )}

            {/* Birthday — own profile only */}
            {isOwnProfile && (profileUser as User)?.dateOfBirth && (
              <InfoCard icon={Cake} label="Birthday" value={formatDate((profileUser as User).dateOfBirth)} />
            )}


            {/* Member since */}
            {memberSince && (
              <InfoCard icon={ShieldCheck} label="Member Since" value={memberSince} />
            )}

            {/* Verification badge */}
            {isOwnProfile && (() => {
              const isVerified = (profileUser as User)?.isVerified === true || verifiedFlash;
              return (
                <button
                  onClick={() => !isVerified && setShowOTPModal(true)}
                  disabled={isVerified}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isVerified
                      ? verifiedFlash
                        ? "bg-primary/10 border-primary/60 shadow-[0_0_16px_rgba(0,209,178,0.25)]"
                        : "bg-primary/5 border-primary/30 cursor-default"
                      : "bg-red-500/5 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50 cursor-pointer"
                  }`}
                  style={verifiedFlash ? { animation: "verifiedPulse 1.5s ease-out" } : undefined}
                >
                  <div className={`p-2 rounded-md shrink-0 ${isVerified ? "bg-primary/10" : "bg-red-500/10"}`}>
                    {isVerified
                      ? <BadgeCheck className="w-4 h-4 text-primary" />
                      : <ShieldAlert className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className={`text-[10px] uppercase font-bold tracking-tight ${isVerified ? "text-primary" : "text-red-400"}`}>
                      {isVerified ? "Verified" : "Unverified"}
                    </p>
                    <p className="text-xs text-muted">
                      {isVerified ? "Account is verified" : "Click to verify account"}
                    </p>
                  </div>
                </button>
              );
            })()}
          </div>

        </div>

      </div>

      {/* OTP Modal */}
      {showOTPModal && isOwnProfile && (
        <OTPModal
          email={(profileUser as User)?.email ?? ""}
          onSuccess={(updatedUser) => {
            if (updatedUser) {
              setProfileUser((p) => p ? { ...p, isVerified: true } : p);
              setCurrentUser((u) => u ? { ...u, isVerified: true } : u);
              localStorage.setItem("currentUser", JSON.stringify({ ...currentUser, isVerified: true }));
            }
            setVerifiedFlash(true);
            setTimeout(() => setVerifiedFlash(false), 3000);
          }}
          onClose={() => setShowOTPModal(false)}
        />
      )}

    </div>
  );
}
