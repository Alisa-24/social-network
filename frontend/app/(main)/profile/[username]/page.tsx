"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Settings,
  Mail,
  Cake,
  ShieldCheck,
  Users,
  Globe,
  Lock,
  Loader2,
  Search,
  UserIcon,
  ArrowLeft,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { updateProfile } from "@/lib/auth/update";
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from "@/lib/users/follow";
import { fetchUserProfile } from "@/lib/users/profile";
import type { PublicProfile } from "@/lib/users/profile";
import { API_URL } from "@/lib/config";
import { User } from "@/lib/interfaces";
import type { UserSearchResult } from "@/lib/users/search";
import * as ws from "@/lib/ws/ws";

type Tab = "followers" | "following";
type FollowStatus = "none" | "pending" | "accepted";

/* ─────────────────────────────────────────────────────────── */
/*  Person row inside followers / following list               */
/* ─────────────────────────────────────────────────────────── */
function PersonRow({
  person,
  currentUserId,
  onFollowChange,
}: {
  person: UserSearchResult;
  currentUserId?: number;
  onFollowChange: (username: string, prev: FollowStatus, next: FollowStatus) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<FollowStatus>(person.followStatus ?? "none");
  const [busy, setBusy] = useState(false);

  const isSelf = currentUserId != null && person.userId === currentUserId;
  const avatarSrc = person.avatar ? `${API_URL}${person.avatar}` : null;
  const displayName =
    `${person.firstName} ${person.lastName}`.trim() || person.username;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy || isSelf) return;
    const prev = status;

    if (status === "accepted" || status === "pending") {
      setStatus("none");
      setBusy(true);
      const res = await unfollowUser(person.username);
      if (res.success) {
        onFollowChange(person.username, prev, "none");
      } else {
        setStatus(prev);
      }
    } else {
      setStatus("accepted");
      setBusy(true);
      const res = await followUser(person.username);
      if (res.success) {
        const next = (res.status ?? "accepted") as FollowStatus;
        setStatus(next);
        onFollowChange(person.username, prev, next);
      } else {
        setStatus(prev);
      }
    }
    setBusy(false);
  };

  const label =
    status === "accepted" ? "Unfollow" : status === "pending" ? "Requested" : "Follow";

  const btnClass = isSelf
    ? "h-8 px-4 rounded-lg bg-surface border border-border text-muted text-xs font-bold cursor-default shrink-0"
    : status === "none"
    ? "h-8 px-4 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-black transition-colors shrink-0 border border-primary/30"
    : "h-8 px-4 rounded-lg bg-surface border border-border text-foreground text-xs font-bold hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors shrink-0";

  return (
    <div
      className="flex items-center justify-between px-5 py-4 hover:bg-background/50 transition-colors cursor-pointer"
      onClick={() => router.push(`/profile/${person.username}`)}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-11 h-11 rounded-full bg-primary/10 ring-2 ring-primary/20 overflow-hidden flex items-center justify-center shrink-0">
          {avatarSrc ? (
            <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-foreground text-sm font-bold truncate">{displayName}</p>
          <p className="text-muted text-xs truncate">@{person.username}</p>
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
export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const usernameParam = params.username as string;

  // The logged-in user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // The profile being viewed (own = User, other = PublicProfile)
  const [profileUser, setProfileUser] = useState<User | PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Follow state for OTHER user's profile header button
  const [headerFollowStatus, setHeaderFollowStatus] = useState<FollowStatus>("none");
  const [headerFollowBusy, setHeaderFollowBusy] = useState(false);

  // Privacy toggle (own profile only)
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);

  // Followers / following lists
  const [activeTab, setActiveTab] = useState<Tab>("followers");
  const [followers, setFollowers] = useState<UserSearchResult[]>([]);
  const [following, setFollowing] = useState<UserSearchResult[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listSearch, setListSearch] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const isOwnProfile =
    usernameParam === "me" ||
    (currentUser != null && usernameParam === currentUser.username);

  /* ── Load profile ── */
  useEffect(() => {
    async function load() {
      const me = await getCurrentUser();
      if (!me) { router.push("/login"); return; }
      setCurrentUser(me);

      if (usernameParam === "me" || usernameParam === me.username) {
        // Own profile
        setProfileUser(me);
        setLoading(false);
      } else {
        // Another user's profile — fetch from API
        const data = await fetchUserProfile(usernameParam);
        if (!data) {
          setNotFound(true);
        } else {
          setProfileUser(data);
          setHeaderFollowStatus((data.followStatus ?? "none") as FollowStatus);
          setFollowersCount(data.followersCount);
          setFollowingCount(data.followingCount);
        }
        setLoading(false);
      }
    }
    load();
  }, [usernameParam, router]);

  /* ── Load followers + following lists ── */
  useEffect(() => {
    if (!profileUser) return;
    const target = (profileUser as User).username ?? (profileUser as PublicProfile).username;

    async function loadLists() {
      setListLoading(true);
      const [frsRes, fngRes] = await Promise.all([
        getFollowers(target),
        getFollowing(target),
      ]);
      setFollowers(frsRes.followers ?? []);
      setFollowing(fngRes.following ?? []);
      // For own profile, update counts from list length
      if (isOwnProfile) {
        setFollowersCount(frsRes.count ?? 0);
        setFollowingCount(fngRes.count ?? 0);
      }
      setListLoading(false);
    }
    loadLists();
  }, [profileUser]);  // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Sync profile when settings are saved ── */
  useEffect(() => {
    if (!isOwnProfile) return;

    const handleUserUpdated = (e: Event) => {
      const updated = (e as CustomEvent).detail as User;
      if (!updated) return;
      setCurrentUser(updated);
      setProfileUser(updated);
    };

    window.addEventListener("userUpdated", handleUserUpdated);
    return () => window.removeEventListener("userUpdated", handleUserUpdated);
  }, [isOwnProfile]);

  /* ── Privacy toggle (own profile) ── */
  const handlePrivacyToggle = async () => {
    if (!currentUser || togglingPrivacy) return;
    const u = profileUser as User;
    const currentIsPublic = u.isPublic === true; // explicit boolean, never undefined
    const newIsPublic = !currentIsPublic;
    setTogglingPrivacy(true);
    setProfileUser((p) => p ? { ...p, isPublic: newIsPublic } : p);

    const result = await updateProfile({
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      nickname: u.nickname || "",
      email: u.email,
      dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split("T")[0] : "",
      aboutMe: u.aboutMe || "",
      isPublic: newIsPublic,
    });

    if (result.success && result.user) {
      const updated = { ...u, ...result.user, isPublic: newIsPublic };
      setProfileUser(updated);
      localStorage.setItem("currentUser", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("userUpdated", { detail: updated }));
    } else {
      setProfileUser((p) => p ? { ...p, isPublic: !newIsPublic } : p);
    }
    setTogglingPrivacy(false);
  };

  /* ── Follow / Unfollow from header button (other user's profile) ── */
  const handleHeaderFollow = async () => {
    if (headerFollowBusy || !profileUser) return;
    const target = (profileUser as PublicProfile).username;
    const prev = headerFollowStatus;

    if (headerFollowStatus === "accepted" || headerFollowStatus === "pending") {
      setHeaderFollowStatus("none");
      setHeaderFollowBusy(true);
      const res = await unfollowUser(target);
      if (res.success) {
        // Re-fetch the profile — if account is private we'll get isLocked:true back
        const fresh = await fetchUserProfile(usernameParam);
        if (fresh) {
          setProfileUser(fresh);
          setHeaderFollowStatus((fresh.followStatus ?? "none") as FollowStatus);
          setFollowersCount(fresh.followersCount);
          setFollowingCount(fresh.followingCount);
        }
      } else {
        setHeaderFollowStatus(prev);
      }
    } else {
      setHeaderFollowStatus("accepted");
      setHeaderFollowBusy(true);
      const res = await followUser(target);
      if (res.success) {
        const next = (res.status ?? "accepted") as FollowStatus;
        setHeaderFollowStatus(next);
        // Re-fetch so all profile data (including full profile for accepted) is fresh
        const fresh = await fetchUserProfile(usernameParam);
        if (fresh) {
          setProfileUser(fresh);
          setFollowersCount(fresh.followersCount);
          setFollowingCount(fresh.followingCount);
          setHeaderFollowStatus((fresh.followStatus ?? next) as FollowStatus);
        }
      } else {
        setHeaderFollowStatus(prev);
      }
    }
    setHeaderFollowBusy(false);
  };

  /* ── Follow change propagated from list rows ── */
  const handleFollowChange = (
    targetUsername: string,
    prev: FollowStatus,
    next: FollowStatus,
  ) => {
    const patch = (list: UserSearchResult[]): UserSearchResult[] =>
      list.map((u) =>
        u.username === targetUsername ? { ...u, followStatus: next } : u,
      );
    setFollowers(patch);
    setFollowing(patch);

    if (prev !== "accepted" && next === "accepted") {
      setFollowingCount((c) => c + 1);
    } else if (prev === "accepted" && next === "none") {
      setFollowingCount((c) => Math.max(0, c - 1));
    }
  };

  /* ── Real-time follow updates via WebSocket ── */
  useEffect(() => {
    if (!isOwnProfile) return; // only own profile needs live follower updates

    const handleWsFollowUpdate = (data: any) => {
      if (data.type !== "follow_update") return;
      const d = data.data;

      if (d.status === "accepted") {
        // Someone just followed us — add them to the list
        setFollowers((prev) => {
          if (prev.some((u) => u.userId === d.followerId)) return prev;
          const newUser: UserSearchResult = {
            userId: d.followerId,
            username: d.followerUsername,
            firstName: d.followerFirstName,
            lastName: d.followerLastName,
            avatar: d.followerAvatar || "",
            nickname: "",
            aboutMe: "",
            isPublic: true,
            followStatus: "none",
            followsMe: true,
          };
          return [newUser, ...prev];
        });
        setFollowersCount((c) => c + 1);
      } else if (d.status === "none") {
        // Someone unfollowed us — remove from list
        setFollowers((prev) => prev.filter((u) => u.userId !== d.followerId));
        setFollowersCount((c) => Math.max(0, c - 1));
      }
    };

    ws.on("follow_update", handleWsFollowUpdate);
    return () => { ws.off("follow_update", handleWsFollowUpdate); };
  }, [isOwnProfile]);

  /* ── Real-time privacy changes for other users' profiles ── */
  useEffect(() => {
    if (isOwnProfile || !profileUser) return;
    const targetId = (profileUser as PublicProfile).userId;

    const handlePrivacyChanged = async (data: any) => {
      if (data.type !== "privacy_changed") return;
      if (data.data.userId !== targetId) return;
      // Re-fetch — backend enforces access: returns isLocked:true for private non-followers
      const fresh = await fetchUserProfile(usernameParam);
      if (!fresh) return; // user deleted or network error — don't change the view
      setProfileUser(fresh);
      setHeaderFollowStatus((fresh.followStatus ?? "none") as FollowStatus);
      setFollowersCount(fresh.followersCount);
      setFollowingCount(fresh.followingCount);
    };

    ws.on("privacy_changed", handlePrivacyChanged);
    return () => { ws.off("privacy_changed", handlePrivacyChanged); };
  }, [isOwnProfile, profileUser, usernameParam]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Helpers ── */
  const getField = <K extends keyof User & keyof PublicProfile>(key: K) =>
    profileUser ? (profileUser as any)[key] : undefined;

  const avatarSrc = getField("avatar") ? `${API_URL}${getField("avatar")}` : null;
  const displayName =
    [getField("firstName"), getField("lastName")].filter(Boolean).join(" ") ||
    getField("username") || "";
  const handle = getField("nickname")
    ? `@${getField("nickname")}`
    : `@${getField("username")}`;
  const isPublic = getField("isPublic") === true;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });
    } catch { return dateStr; }
  };

  const memberSince = getField("createdAt")
    ? new Date(getField("createdAt") as string).toLocaleDateString("en-US", {
        month: "short", year: "numeric",
      })
    : null;

  const searchLower = listSearch.toLowerCase();
  const displayedList = (activeTab === "followers" ? followers : following).filter((u) => {
    const hay = `${u.firstName} ${u.lastName} ${u.username} ${u.nickname ?? ""}`.toLowerCase();
    return hay.includes(searchLower);
  });

  /* ── States ── */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-foreground text-lg font-semibold">User not found</p>
          <p className="text-muted text-sm mt-1">
            This profile doesn&apos;t exist or is private.
          </p>
        </div>
      </div>
    );
  }

  /* ── Locked profile (private account, non-follower) ── */
  const isLocked = !isOwnProfile && (profileUser as PublicProfile)?.isLocked === true;

  if (isLocked) {
    const p = profileUser as PublicProfile;
    const lockedAvatarSrc = p.avatar ? `${API_URL}${p.avatar}` : null;
    const lockedName = p.nickname ? `@${p.nickname}` : `@${p.username}`;
    const lockedFollowLabel =
      headerFollowStatus === "accepted" ? "Unfollow" : headerFollowStatus === "pending" ? "Requested" : "Follow";

    return (
      <div className="flex-1 flex justify-center py-8 px-4 md:px-10">
        <div className="max-w-md w-full flex flex-col gap-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 self-start text-sm font-semibold text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="bg-surface border border-border rounded-xl p-8 flex flex-col items-center text-center gap-5">
            {/* Avatar */}
            <div className="h-24 w-24 rounded-full bg-background border-4 border-primary/20 overflow-hidden flex items-center justify-center shrink-0">
              {lockedAvatarSrc ? (
                <img src={lockedAvatarSrc} alt={p.username} className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10 text-muted-foreground/40" />
              )}
            </div>

            {/* Name + handle */}
            <div>
              <h1 className="text-foreground text-xl font-bold">{p.username}</h1>
              <p className="text-muted text-sm mt-0.5">{lockedName}</p>
              <p className="text-muted text-xs mt-2">{p.followersCount} Followers</p>
            </div>

            {/* Lock icon + message */}
            <div className="flex flex-col items-center gap-2 py-4 border-t border-border w-full">
              <Lock className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-foreground font-semibold text-sm">This account is private</p>
              <p className="text-muted text-xs max-w-xs">
                Follow this account to see their photos and other content.
              </p>
            </div>

            {/* Follow button */}
            <button
              onClick={handleHeaderFollow}
              disabled={headerFollowBusy}
              className={`flex items-center justify-center gap-2 h-10 px-8 rounded-lg text-sm font-semibold transition-colors ${
                headerFollowStatus === "none"
                  ? "bg-primary text-black hover:bg-primary/90"
                  : "bg-surface border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              }`}
            >
              {headerFollowBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : lockedFollowLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const headerFollowLabel =
    headerFollowStatus === "accepted"
      ? "Unfollow"
      : headerFollowStatus === "pending"
      ? "Requested"
      : "Follow";

  return (
    <div className="flex-1 flex justify-center py-8 px-4 md:px-10">
      <div className="max-w-5xl w-full flex flex-col gap-6">

        {/* ── Back button (other users only) ── */}
        {!isOwnProfile && (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 self-start text-sm font-semibold text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {/* ── Profile header ── */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-5">

              {/* Avatar */}
              <div className="h-36 w-36 rounded-full bg-background border-4 border-primary/20 shadow-2xl overflow-hidden shrink-0">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-foreground/5">
                    <span className="text-4xl font-bold text-muted-foreground/30">
                      {(getField("firstName")?.[0] || getField("username")?.[0] || "?").toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-foreground text-2xl md:text-3xl font-bold tracking-tight">
                    {displayName}
                  </h1>

                  {/* Privacy badge */}
                  {isOwnProfile ? (
                    <button
                      onClick={handlePrivacyToggle}
                      disabled={togglingPrivacy}
                      title={`Switch to ${isPublic ? "Private" : "Public"}`}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                        isPublic
                          ? "bg-primary/10 text-primary hover:bg-primary/20"
                          : "bg-zinc-500/10 text-muted hover:bg-zinc-500/20"
                      }`}
                    >
                      {togglingPrivacy ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isPublic ? (
                        <Globe className="w-3 h-3" />
                      ) : (
                        <Lock className="w-3 h-3" />
                      )}
                      {isPublic ? "Public" : "Private"}
                    </button>
                  ) : (
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                        isPublic ? "bg-primary/10 text-primary" : "bg-zinc-500/10 text-muted"
                      }`}
                    >
                      {isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {isPublic ? "Public" : "Private"}
                    </span>
                  )}
                </div>

                <p className="text-muted text-base">{handle}</p>

                <div className="flex gap-4 mt-1">
                  <button
                    onClick={() => setActiveTab("followers")}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {followersCount}{" "}
                    <span className="font-normal text-muted">Followers</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("following")}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {followingCount}{" "}
                    <span className="font-normal text-muted">Following</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {isOwnProfile ? (
              <button
                onClick={() => router.push("/settings")}
                className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-surface border border-border text-foreground text-sm font-semibold hover:bg-background transition-colors"
              >
                <Settings className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleHeaderFollow}
                disabled={headerFollowBusy}
                className={`flex items-center justify-center gap-2 h-10 px-5 rounded-lg text-sm font-semibold transition-colors ${
                  headerFollowStatus === "none"
                    ? "bg-primary text-black hover:bg-primary/90"
                    : "bg-surface border border-border text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                }`}
              >
                {headerFollowBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  headerFollowLabel
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Content grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

          {/* Left sidebar — About */}
          <aside className="flex flex-col gap-4">
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-foreground font-bold text-base">About</h3>
              </div>
              <div className="p-5 flex flex-col gap-5">
                {getField("aboutMe") && (
                  <div className="flex flex-col gap-1">
                    <p className="text-muted text-xs font-bold uppercase tracking-wider">Bio</p>
                    <p className="text-foreground text-sm leading-relaxed">{getField("aboutMe")}</p>
                  </div>
                )}
                {/* Date of birth — own profile only */}
                {isOwnProfile && (profileUser as User)?.dateOfBirth && (
                  <div className="flex flex-col gap-1">
                    <p className="text-muted text-xs font-bold uppercase tracking-wider">Birthday</p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Cake className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-sm">{formatDate((profileUser as User).dateOfBirth)}</p>
                    </div>
                  </div>
                )}
                {/* Email — own profile only */}
                {isOwnProfile && (profileUser as User)?.email && (
                  <div className="flex flex-col gap-1">
                    <p className="text-muted text-xs font-bold uppercase tracking-wider">Email</p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Mail className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-sm break-all">{(profileUser as User).email}</p>
                    </div>
                  </div>
                )}
                {!getField("aboutMe") && !isOwnProfile && (
                  <p className="text-muted text-sm">Nothing shared yet.</p>
                )}
                {!getField("aboutMe") && isOwnProfile &&
                  !(profileUser as User)?.dateOfBirth && (
                    <p className="text-muted text-sm">No details added yet.</p>
                  )}
              </div>
            </div>

            {memberSince && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                <p className="text-primary text-xs font-bold uppercase tracking-wider mb-3">Member</p>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-primary shrink-0" />
                  <div>
                    <p className="text-foreground text-sm font-bold">Verified Account</p>
                    <p className="text-muted text-xs">Since {memberSince}</p>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Right — Followers / Following list */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col">

            {/* Tabs */}
            <div className="flex border-b border-border px-6 gap-6 shrink-0">
              {(["followers", "following"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center border-b-[3px] pb-[13px] pt-4 text-sm font-bold leading-normal transition-colors capitalize ${
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {tab === "followers"
                    ? `Followers (${followersCount})`
                    : `Following (${followingCount})`}
                </button>
              ))}
            </div>

            {/* Search bar */}
            <div className="p-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3 bg-background border border-border rounded-lg px-3 h-10">
                <Search className="w-4 h-4 text-muted shrink-0" />
                <input
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder={`Search ${activeTab}…`}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
                />
              </div>
            </div>

            {/* List */}
            {listLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : displayedList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                <Users className="w-10 h-10 text-muted/40" />
                <p className="text-foreground font-semibold text-sm">
                  {listSearch
                    ? "No results found"
                    : activeTab === "followers"
                    ? "No followers yet"
                    : "Not following anyone yet"}
                </p>
                <p className="text-muted text-xs max-w-xs">
                  {listSearch
                    ? "Try a different search term."
                    : activeTab === "followers"
                    ? "When people follow this account they'll appear here."
                    : "Accounts this person follows will appear here."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border overflow-y-auto">
                {displayedList.map((person) => (
                  <PersonRow
                    key={person.userId}
                    person={person}
                    currentUserId={currentUser?.userId}
                    onFollowChange={handleFollowChange}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
