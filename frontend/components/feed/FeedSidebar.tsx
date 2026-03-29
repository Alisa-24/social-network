"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, User as UserIcon } from "lucide-react";
import { API_URL } from "@/lib/config";
import * as ws from "@/lib/ws/ws";
import { fetchGroups } from "@/lib/groups/groups";
import type { Group } from "@/lib/groups/interface";
import type { OnlineUser } from "@/lib/interfaces";

async function fetchFollowingIDs(): Promise<Set<number>> {
  try {
    const res = await fetch(`${API_URL}/api/users/following`, { credentials: "include" });
    const data = await res.json();
    return new Set<number>(data.following_ids ?? []);
  } catch {
    return new Set();
  }
}

export default function FeedSidebar({ currentUserId }: { currentUserId: number }) {
  const [allOnlineUsers, setAllOnlineUsers] = useState<OnlineUser[]>([]);
  const [followingIDs, setFollowingIDs] = useState<Set<number>>(new Set());
  const [wsConnected, setWsConnected] = useState(false);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);

  useEffect(() => {
    fetchFollowingIDs().then(setFollowingIDs);
    fetchGroups().then((data) => {
      if (!data) return;
      setMyGroups(data.userGroups.slice(0, 5));
      setSuggestedGroups(
        data.allGroups
          .filter((g) => !data.userGroups.some((ug) => ug.id === g.id))
          .slice(0, 4),
      );
    });
  }, []);

  useEffect(() => {
    const handleOnlineUsers = (data: { users: OnlineUser[] }) => {
      setAllOnlineUsers(
        (data.users || []).filter((u) => u.userId !== currentUserId && u.online),
      );
    };
    const handleConnect = () => {
      setWsConnected(true);
      ws.requestOnlineUsers();
    };
    const handleDisconnect = () => setWsConnected(false);

    ws.on("online_users", handleOnlineUsers);
    ws.onConnect(handleConnect);
    ws.onDisconnect(handleDisconnect);
    setWsConnected(ws.isConnected());
    if (ws.isConnected()) ws.requestOnlineUsers();

    return () => { ws.off("online_users", handleOnlineUsers); };
  }, [currentUserId]);

  const onlineFriends = allOnlineUsers.filter((u) => followingIDs.has(u.userId));

  return (
    <aside className="hidden lg:flex flex-col w-96 shrink-0 border-l border-border overflow-y-auto p-6 space-y-8 bg-background">

      {/* Online Friends */}
      <div>
        <h3 className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest mb-4">
          Online Friends
          {!wsConnected && <span className="ml-2 text-red-400">· offline</span>}
        </h3>
        {onlineFriends.length === 0 ? (
          <p className="text-xs text-foreground/30 py-2">No friends online</p>
        ) : (
          <div className="space-y-3">
            {onlineFriends.map((u) => (
              <div key={u.userId} className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {u.avatar ? (
                    <img src={`${API_URL}${u.avatar}`} alt={u.firstName}
                      className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center border border-border">
                      <UserIcon className="w-4 h-4 text-foreground/40" />
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.firstName} {u.lastName}
                  </p>
                  {u.username && (
                    <p className="text-xs text-foreground/40 truncate">@{u.username}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Groups */}
      {myGroups.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest">
              Active Groups
            </h3>
            <Link href="/groups" className="text-[11px] text-primary hover:underline font-medium">
              See all
            </Link>
          </div>
          <div className="space-y-1">
            {myGroups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {g.cover_image_path ? (
                    <img src={`${API_URL}${g.cover_image_path}`} alt={g.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                  {g.members_count !== undefined && (
                    <p className="text-[11px] text-foreground/40">{g.members_count.toLocaleString()} members</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Groups */}
      {suggestedGroups.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold text-foreground/40 uppercase tracking-widest">
              Suggested Groups
            </h3>
            <Link href="/groups" className="text-[11px] text-primary hover:underline font-medium">
              See all
            </Link>
          </div>
          <div className="space-y-1">
            {suggestedGroups.map((g) => (
              <Link key={g.id} href={`/groups/${g.id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/5 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0 overflow-hidden border border-border">
                  {g.cover_image_path ? (
                    <img src={`${API_URL}${g.cover_image_path}`} alt={g.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-4 h-4 text-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{g.name}</p>
                  {g.members_count !== undefined && (
                    <p className="text-[11px] text-foreground/40">{g.members_count.toLocaleString()} members</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
