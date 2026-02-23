"use client";

import { useRouter } from "next/navigation";
import { UserIcon } from "lucide-react";
import { API_URL } from "@/lib/config";
import type { UserSearchResult } from "@/lib/users/search";

export default function UserCard({ user }: { user: UserSearchResult }) {
  const router = useRouter();
  const avatarSrc = user.avatar ? `${API_URL}${user.avatar}` : null;
  const displayName = `${user.firstName} ${user.lastName}`.trim();
  const sub = user.nickname || user.username;

  return (
    <div
      className="bg-surface border border-border rounded-xl p-5 flex flex-col items-center text-center gap-4 hover:border-primary/30 transition-all cursor-pointer"
      onClick={() => router.push(`/profile/${user.username}`)}
    >
      {/* Avatar */}
      <div className="size-20 rounded-full bg-primary/10 ring-2 ring-primary/20 overflow-hidden flex items-center justify-center shrink-0">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <UserIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 w-full">
        <p className="font-bold text-base text-foreground truncate">
          {displayName}
        </p>
        <p className="text-xs text-muted-foreground truncate">@{sub}</p>
        {user.aboutMe && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {user.aboutMe}
          </p>
        )}
      </div>

      {/* Follow button — UI only */}
      <button
        onClick={(e) => e.stopPropagation()}
        className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-black font-bold rounded-lg text-sm transition-all border border-primary/30"
      >
        Follow
      </button>
    </div>
  );
}
