"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2, User, X } from "lucide-react";
import { API_URL } from "@/lib/config";
import { formatTimeAgo } from "@/lib/utils/format";
import { getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";
import {
  fetchGroupInvitations,
  handleGroupInvitation,
  fetchGroups,
  fetchJoinRequests,
  handleJoinRequest,
} from "@/lib/groups/api";
import * as ws from "@/lib/ws/ws";

type NotificationItem = {
  id: number;
  actor_id: number | null;
  type: string;
  data: string;
  read: number;
  created_at: string;
  actor?: {
    first_name?: string | null;
    last_name?: string | null;
    avatar?: string | null;
  };
};

type GroupInvitation = {
  id: number;
  group_id: number;
  group_name: string;
  inviter_id: number;
  inviter_name: string;
  created_at: string;
};

type PendingJoinRequest = {
  id: number;
  group_id: number;
  group_name: string;
  user_id: number;
  created_at: string;
  user?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
  };
};

async function fetchNotifications(): Promise<NotificationItem[]> {
  const response = await fetch(`${API_URL}/api/notifications`, {
    credentials: "include",
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data.notifications || [];
}

async function markAllNotificationsRead(): Promise<boolean> {
  const response = await fetch(`${API_URL}/api/notifications/read-all`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) return false;
  const data = await response.json();
  return !!data.success;
}

async function markNotificationRead(notificationId: number): Promise<boolean> {
  const body = new URLSearchParams();
  body.set("notification_id", String(notificationId));

  const response = await fetch(`${API_URL}/api/notifications/read`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) return false;
  const data = await response.json();
  return !!data.success;
}

function safeJsonParse(data?: string): Record<string, any> {
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function buildActivityText(item: NotificationItem): { title: string; subtitle: string } {
  const payload = safeJsonParse(item.data);
  const actorName = `${item.actor?.first_name || ""} ${item.actor?.last_name || ""}`.trim() || "Someone";

  if (item.type === "new_event") {
    const groupName = payload.group_name || "your group";
    return {
      title: `${actorName} created a new event in ${groupName}`,
      subtitle: "Group Update",
    };
  }

  if (item.type === "join_request_approved") {
    return {
      title: payload.message || `Your request for ${payload.group_name || "a group"} was approved`,
      subtitle: "Join Request",
    };
  }

  if (item.type === "join_request_rejected") {
    return {
      title: payload.message || `Your request for ${payload.group_name || "a group"} was rejected`,
      subtitle: "Join Request",
    };
  }

  return {
    title: payload.message || `${actorName} sent an update`,
    subtitle: item.type,
  };
}

export default function NotificationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingJoinRequest[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification: NotificationItem) => notification.read === 0).length,
    [notifications],
  );

  const loadAll = async (ownerUserId: number | null) => {
    const [notificationData, invitationData, groupsData] = await Promise.all([
      fetchNotifications(),
      fetchGroupInvitations(),
      fetchGroups(),
    ]);

    setNotifications(notificationData);
    setInvitations(invitationData?.invitations || []);

    const ownerGroups = (groupsData?.userGroups || []).filter(
      (group) => ownerUserId !== null && group.owner_id === ownerUserId,
    );

    if (!ownerGroups.length) {
      setPendingRequests([]);
      return;
    }

    const requestsResult = await Promise.all(
      ownerGroups.map(async (group) => {
        const res = await fetchJoinRequests(group.id);
        return {
          groupId: group.id,
          groupName: group.name,
          requests: res?.requests || [],
        };
      }),
    );

    const merged: PendingJoinRequest[] = [];
    requestsResult.forEach((bucket) => {
      bucket.requests.forEach((request: any) => {
        merged.push({
          id: request.id,
          group_id: bucket.groupId,
          group_name: bucket.groupName,
          user_id: request.user_id,
          created_at: request.created_at,
          user: request.user,
        });
      });
    });

    setPendingRequests(merged);
  };

  useEffect(() => {
    async function init() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const ownerUserId = user.userId ?? null;
        setCurrentUserId(ownerUserId);

        await loadAll(ownerUserId);
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
    if (currentUserId === null) return;

    const refresh = async () => {
      await loadAll(currentUserId);
    };

    ws.on("group_invitation", refresh);
    ws.on("join_request_approved", refresh);
    ws.on("join_request_rejected", refresh);
    ws.on("group_join_request", refresh);
    ws.on("new_event", refresh);

    return () => {
      ws.off("group_invitation", refresh);
      ws.off("join_request_approved", refresh);
      ws.off("join_request_rejected", refresh);
      ws.off("group_join_request", refresh);
      ws.off("new_event", refresh);
    };
  }, [currentUserId]);

  const onMarkAllRead = async () => {
    setMarkingAllRead(true);
    const success = await markAllNotificationsRead();

    if (success) {
      setNotifications((prev: NotificationItem[]) => prev.map((notification: NotificationItem) => ({ ...notification, read: 1 })));
      (globalThis as any).addToast({
        id: crypto.randomUUID(),
        title: "Updated",
        message: "All notifications marked as read",
        type: "success",
      });
    }

    setMarkingAllRead(false);
  };

  const onMarkRead = async (notificationId: number) => {
    const success = await markNotificationRead(notificationId);
    if (!success) return;

    setNotifications((prev: NotificationItem[]) =>
      prev.map((notification: NotificationItem) =>
        notification.id === notificationId ? { ...notification, read: 1 } : notification,
      ),
    );
  };

  const onHandleInvitation = async (invitationId: number, action: "accept" | "decline") => {
    setProcessingId(invitationId);
    const result = await handleGroupInvitation(invitationId, action);

    if (result.success) {
      setInvitations((prev: GroupInvitation[]) => prev.filter((invitation: GroupInvitation) => invitation.id !== invitationId));
      (globalThis as any).addToast({
        id: crypto.randomUUID(),
        title: action === "accept" ? "Invitation accepted" : "Invitation declined",
        message: result.message || "Done",
        type: action === "accept" ? "success" : "info",
      });
    }

    setProcessingId(null);
  };

  const onHandleJoinRequest = async (requestId: number, action: "approve" | "reject") => {
    setProcessingId(requestId);
    const result = await handleJoinRequest(requestId, action);

    if (result.success) {
      setPendingRequests((prev: PendingJoinRequest[]) => prev.filter((request: PendingJoinRequest) => request.id !== requestId));
      (globalThis as any).addToast({
        id: crypto.randomUUID(),
        title: action === "approve" ? "Request approved" : "Request rejected",
        message: result.message || "Done",
        type: action === "approve" ? "success" : "info",
      });
    }

    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 p-6 lg:p-8 bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Notifications</h1>
            <p className="text-muted font-medium">Manage activity and incoming requests</p>
          </div>
          <button
            onClick={onMarkAllRead}
            disabled={markingAllRead || unreadCount === 0}
            className="px-4 py-2 bg-surface hover:bg-foreground/5 border border-border rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {markingAllRead ? "Updating..." : `Mark all as read${unreadCount ? ` (${unreadCount})` : ""}`}
          </button>
        </header>

        <div className="grid grid-cols-12 gap-8">
          <section className="col-span-12 lg:col-span-7">
            <div className="flex items-center gap-2 mb-4 px-2">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Recent Activity</h2>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-2">
              <div className="space-y-1 max-h-[70vh] overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted">No notifications yet.</div>
                )}

                {notifications.map((item: NotificationItem) => {
                  const { title, subtitle } = buildActivityText(item);
                  const actorName = `${item.actor?.first_name || ""} ${item.actor?.last_name || ""}`.trim();

                  return (
                    <button
                      key={item.id}
                      onClick={() => onMarkRead(item.id)}
                      className="w-full text-left group p-4 flex gap-4 hover:bg-foreground/5 rounded-2xl transition-all"
                    >
                      <div className="relative">
                        {item.actor?.avatar ? (
                          <img
                            alt={actorName || "User"}
                            className="w-12 h-12 rounded-xl object-cover bg-surface border border-border"
                            src={`${API_URL}${item.actor.avatar}`}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl border border-border bg-background flex items-center justify-center">
                            <User className="w-5 h-5 text-muted" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm leading-relaxed line-clamp-2">{title}</p>
                          <span className="text-[11px] text-muted font-medium whitespace-nowrap">
                            {formatTimeAgo(item.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted font-bold uppercase tracking-wider mt-1">{subtitle}</p>
                      </div>

                      {item.read === 0 && <div className="w-2 h-2 bg-primary rounded-full mt-2 self-start" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-2 mb-4 px-2">
              <h2 className="text-lg font-bold">Requests</h2>
              <span className="ml-auto px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-black rounded uppercase">
                {invitations.length + pendingRequests.length} Pending
              </span>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="rounded-3xl border border-border bg-surface p-6 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted">Group Invites</h3>
                <div className="space-y-3">
                  {!invitations.length && (
                    <p className="text-sm text-muted">No pending invitations.</p>
                  )}

                  {invitations.map((invite: GroupInvitation) => (
                    <div key={invite.id} className="bg-background/60 p-4 rounded-2xl border border-border space-y-3">
                      <div>
                        <div className="text-sm font-bold truncate">{invite.group_name}</div>
                        <div className="text-[11px] text-muted">Invited by {invite.inviter_name}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onHandleInvitation(invite.id, "accept")}
                          disabled={processingId === invite.id}
                          className="flex-1 py-2.5 bg-primary text-black text-xs font-bold rounded-xl disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onHandleInvitation(invite.id, "decline")}
                          disabled={processingId === invite.id}
                          className="px-4 py-2.5 border border-border hover:bg-foreground/5 text-muted text-xs font-bold rounded-xl disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-surface p-6 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted">Join Requests</h3>
                <div className="space-y-3">
                  {!pendingRequests.length && (
                    <p className="text-sm text-muted">No pending join requests.</p>
                  )}

                  {pendingRequests.map((request: PendingJoinRequest) => (
                    <div key={request.id} className="bg-background/60 p-4 rounded-2xl border border-border">
                      <div className="flex items-center gap-3">
                        {request.user?.avatar ? (
                          <img
                            src={`${API_URL}${request.user.avatar}`}
                            alt={request.user.username || "User"}
                            className="w-10 h-10 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl border border-border bg-background flex items-center justify-center">
                            <User className="w-4 h-4 text-muted" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">
                            {(request.user?.firstName || "User")} {(request.user?.lastName || "")}
                          </p>
                          <p className="text-[11px] text-muted truncate">
                            @{request.user?.username || "user"} requested {request.group_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => onHandleJoinRequest(request.id, "approve")}
                          disabled={processingId === request.id}
                          className="flex-1 py-2 bg-green-500/10 text-green-500 text-xs font-bold rounded-lg hover:bg-green-500/20 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => onHandleJoinRequest(request.id, "reject")}
                          disabled={processingId === request.id}
                          className="flex-1 py-2 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg hover:bg-red-500/20 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
