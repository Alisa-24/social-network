"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserIcon, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/config";
import { followUser, unfollowUser } from "@/lib/users/follow";
import type { UserSearchResult } from "@/lib/users/search";

type FollowStatus = "none" | "pending" | "accepted";

export default function UserCard({
  user,
  currentUserId,
}: {
  user: UserSearchResult;
  currentUserId?: number;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<FollowStatus>(user.followStatus ?? "none");
  const [loading, setLoading] = useState(false);

  const isSelf = currentUserId != null && user.userId === currentUserId;
  const avatarSrc = user.avatar ? `${API_URL}${user.avatar}` : null;
  const displayName = `${user.firstName} ${user.lastName}`.trim();
  const sub = user.nickname || user.username;

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading || isSelf) return;

    const prev = status;

    if (status === "accepted" || status === "pending") {
      setStatus("none");
      setLoading(true);
      const res = await unfollowUser(user.username);
      if (!res.success) setStatus(prev);
    } else {
      setStatus("accepted");
      setLoading(true);
      const res = await followUser(user.username);
      if (res.success) {
        setStatus(res.status ?? "accepted");
      } else {
        setStatus(prev);
      }
    }

    setLoading(false);
  };

  const label =
    status === "accepted" ? "Unfollow" : status === "pending" ? "Requested" : "Follow";

  const btnClass = isSelf
    ? "w-full py-2 bg-surface border border-border text-muted text-sm font-bold rounded-lg cursor-default"
    : status === "none"
    ? "w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-black font-bold rounded-lg text-sm transition-all border border-primary/30"
    : status === "pending"
    ? "w-full py-2 bg-surface border border-border text-muted-foreground font-bold rounded-lg text-sm transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
    : "w-full py-2 bg-surface border border-border text-foreground font-bold rounded-lg text-sm transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30";

  return (
    <div
      className="bg-surface border border-border rounded-xl p-5 flex flex-col items-center text-center gap-4 hover:border-primary/30 transition-all cursor-pointer"
      onClick={() => router.push(`/profile/${user.username}`)}
    >
      {/* Avatar */}
      <div className="size-20 rounded-full bg-primary/10 ring-2 ring-primary/20 overflow-hidden flex items-center justify-center shrink-0">
        {avatarSrc ? (
          <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <UserIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 w-full">
        <p className="font-bold text-base text-foreground truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">@{sub}</p>
        {user.aboutMe && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{user.aboutMe}</p>
        )}
      </div>

      {/* Button */}
      <button
        onClick={isSelf ? undefined : handleFollow}
        disabled={loading || isSelf}
        className={btnClass}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
        ) : isSelf ? (
          "You"
        ) : (
          label
        )}
      </button>
    </div>
  );
}
