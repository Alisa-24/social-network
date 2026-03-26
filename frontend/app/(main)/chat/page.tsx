"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleUserRound, Loader2, Users, Wifi, WifiOff } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";
import { User, OnlineUser } from "@/lib/interfaces";
import { Group } from "@/lib/groups/interface";
import { fetchGroups, fetchGroupMembers } from "@/lib/groups/api";
import { GroupMember } from "@/lib/groups/members";
import GroupChat from "@/components/groups/GroupChat";
import * as ws from "@/lib/ws/ws";
import { API_URL } from "@/lib/config";

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setCurrentUser(user);

        const groupsData = await fetchGroups();
        const userGroups = groupsData?.userGroups ?? [];
        setGroups(userGroups);
        if (userGroups.length > 0) {
          setSelectedGroupId(userGroups[0].id);
        }

        setLoading(false);
      } catch (error) {
        if (error instanceof ServerError) {
          router.push("/error/500");
          return;
        }
        router.push("/login");
      }
    }

    init();
  }, [router]);

  useEffect(() => {
    if (!selectedGroupId) return;

    async function loadMembers() {
      setMembersLoading(true);
      const res = await fetchGroupMembers(selectedGroupId!);
      setGroupMembers(res.members ?? []);
      setMembersLoading(false);
    }

    loadMembers();
  }, [selectedGroupId]);

  useEffect(() => {
    const handleOnlineUsers = (data: { users: OnlineUser[] }) => {
      setOnlineUsers(data.users ?? []);
    };

    const handleConnect = () => {
      setWsConnected(true);
      ws.requestOnlineUsers();
    };

    const handleDisconnect = () => {
      setWsConnected(false);
    };

    ws.on("online_users", handleOnlineUsers);
    ws.onConnect(handleConnect);
    ws.onDisconnect(handleDisconnect);

    setWsConnected(ws.isConnected());
    if (ws.isConnected()) {
      ws.requestOnlineUsers();
    }

    return () => {
      ws.off("online_users", handleOnlineUsers);
    };
  }, []);

  const selectedGroup = groups.find((group: Group) => group.id === selectedGroupId) || null;
  const onlineMemberIds = new Set((onlineUsers ?? []).map((user: OnlineUser) => user.userId));

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="p-8">
        <div className="rounded-3xl border border-border bg-surface p-8 text-center">
          <h2 className="text-2xl font-black tracking-tight">No Group Chats Yet</h2>
          <p className="text-muted mt-2">Join a group to start chatting with members in real-time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 p-6 lg:p-8 bg-background">
      <div className="grid grid-cols-12 gap-6 min-h-[calc(100vh-8rem)]">
        <aside className="col-span-12 lg:col-span-3 rounded-3xl border border-border bg-surface p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-muted">Your Groups</h2>
            <div className="flex items-center gap-1 text-xs text-muted">
              {wsConnected ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
              {wsConnected ? "Live" : "Offline"}
            </div>
          </div>
          <div className="space-y-2">
            {groups.map((group: Group) => {
              const active = group.id === selectedGroupId;
              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30 hover:bg-foreground/5"
                  }`}
                >
                  <p className="font-bold text-sm truncate">{group.name}</p>
                  <p className="text-xs text-muted truncate mt-1">{group.description}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="col-span-12 lg:col-span-6 flex flex-col min-h-0">
          {selectedGroup ? (
            <GroupChat groupId={selectedGroup.id} currentUser={currentUser} />
          ) : (
            <div className="rounded-3xl border border-border bg-surface h-full flex items-center justify-center text-muted">
              Select a group to open chat
            </div>
          )}
        </section>

        <aside className="col-span-12 lg:col-span-3 rounded-3xl border border-border bg-surface p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-muted">Members</h2>
            <span className="text-xs font-bold bg-primary/15 text-primary px-2 py-1 rounded-lg">
              {groupMembers.length}
            </span>
          </div>

          {membersLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {groupMembers.map((member: GroupMember) => {
                const isOnline = onlineMemberIds.has(member.ID);
                return (
                  <div
                    key={member.ID}
                    className="flex items-center gap-3 p-2 rounded-xl border border-border bg-background/40"
                  >
                    <div className="relative">
                      {member.Avatar ? (
                        <img
                          src={`${API_URL}${member.Avatar}`}
                          alt={member.Username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center">
                          <CircleUserRound className="w-5 h-5 text-muted" />
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${
                          isOnline ? "bg-green-500" : "bg-muted"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {member.FirstName} {member.LastName}
                      </p>
                      <p className="text-xs text-muted truncate">@{member.Username}</p>
                    </div>
                    {member.Role === "owner" && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">Owner</span>
                    )}
                  </div>
                );
              })}

              {!groupMembers.length && (
                <div className="text-center text-sm text-muted py-8">
                  No members found.
                </div>
              )}
            </div>
          )}

          <div className="mt-4 p-3 rounded-xl border border-border bg-background/40">
            <div className="flex items-center gap-2 text-xs text-muted">
              <Users className="w-4 h-4" />
              <span>{onlineUsers.length} users online globally</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
