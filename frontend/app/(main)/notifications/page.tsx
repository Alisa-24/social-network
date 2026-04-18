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
import { getFollowRequests, handleFollowRequest } from "@/lib/users/follow";
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
    username?: string | null;
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

type PendingFollowRequest = {
  id: number;
  requester_id: number;
  created_at: string;
  requester?: {
    userId: number;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
};

async function fetchNotifications(): Promise<NotificationItem[]> {
  try {
    console.log("[Notifications API] Fetching notifications from:", `${API_URL}/api/notifications`);
    const response = await fetch(`${API_URL}/api/notifications`, {
      credentials: "include",
    });
    console.log("[Notifications API] Response status:", response.status);
    if (!response.ok) {
      console.error("[Notifications API] Response not OK:", response.statusText);
      return [];
    }
    const data = await response.json();
    console.log("[Notifications API] Raw response:", data);
    const notifications = data.notifications || [];
    console.log("[Notifications API] Notifications count:", notifications.length);
    return notifications;
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return [];
  }
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

function emitUnreadCountChanged(unreadCount: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("notificationsUnreadCountChanged", {
      detail: { unreadCount },
    }),
  );
}

function buildActivityText(item: NotificationItem): { title: string; subtitle: string } {
  const payload = safeJsonParse(item.data);
  const actorName = `${item.actor?.first_name || ""} ${item.actor?.last_name || ""}`.trim() || "Someone";
  const message = typeof payload.message === "string" && payload.message.trim() ? payload.message : "";
  const subtitle = typeof payload.subtitle === "string" && payload.subtitle.trim()
    ? payload.subtitle
    : item.type?.replace(/_/g, " ").toUpperCase() || "Notification";

  switch (item.type) {
    case "join_request_approved":
      return {
        title: message || `You joined ${payload.group_name ? `'${payload.group_name}'` : "'a group'"}`,
        subtitle,
      };

    case "join_request_rejected":
      return {
        title: message || `Your request to join ${payload.group_name ? `'${payload.group_name}'` : "'a group'"} was rejected`,
        subtitle,
      };

    case "group_invitation":
      return {
        title: message || `${actorName} invited you to ${payload.group_name ? `'${payload.group_name}'` : "a group"}`,
        subtitle,
      };

    case "group_join_request":
      return {
        title: message || `${actorName} requested to join your group`,
        subtitle,
      };

    case "follow_request":
      return {
        title: message || `${actorName} requested to follow you`,
        subtitle,
      };

    case "follow_update":
      return {
        title: message || `${actorName} updated a follow request`,
        subtitle,
      };

    case "new_message":
      const msgPreview = payload.content?.substring(0, 50) || "New message";
      return {
        title: message || `${actorName}: ${msgPreview}`,
        subtitle,
      };

    default:
      return {
        title: message || `${actorName} sent an update`,
        subtitle,
      };
  }
}

export default function NotificationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingJoinRequest[]>([]);
  const [followRequests, setFollowRequests] = useState<PendingFollowRequest[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [viewAllNotifications, setViewAllNotifications] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification: NotificationItem) => notification.read === 0).length,
    [notifications],
  );

  const loadAll = async (ownerUserId: number | null) => {
    console.log("[Notifications] loadAll called with ownerUserId:", ownerUserId);
    const [notificationData, invitationData, groupsData, followRequestsData] = await Promise.all([
      fetchNotifications(),
      fetchGroupInvitations(),
      fetchGroups(),
      getFollowRequests(),
    ]);

    console.log("[Notifications] Loaded data:", {
      notifications: notificationData.length,
      invitations: invitationData?.invitations?.length || 0,
      followRequests: followRequestsData?.requests?.length || 0,
    });
    console.log("[Notifications] Notification items:", notificationData);
    console.log("[Notifications] Follow requests raw:", followRequestsData?.requests);

    setNotifications(notificationData);
    console.log("[Notifications] Notifications state set to:", notificationData.length, "items");
    setInvitations(invitationData?.invitations || []);
    setFollowRequests(followRequestsData?.requests || []);

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
        console.log("[Join Request Debug] Raw request data:", request);
        if (request.user) {
          console.log("[Join Request Debug] User object fields:", Object.keys(request.user));
        }
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

    console.log("[Join Request Debug] Merged requests:", merged);
    setPendingRequests(merged);
  };

  useEffect(() => {
    async function init() {
      try {
        console.log("[Notifications] Initializing notifications page");
        const user = await getCurrentUser();
        console.log("[Notifications] Current user:", user);
        if (!user) {
          console.warn("[Notifications] No user found, redirecting to login");
          router.push("/login");
          return;
        }

        const ownerUserId = user.userId ?? null;
        console.log("[Notifications] Setting currentUserId:", ownerUserId);
        setCurrentUserId(ownerUserId);

        console.log("[Notifications] Calling loadAll");
        await loadAll(ownerUserId);
        console.log("[Notifications] loadAll completed");
        setLoading(false);
      } catch (error) {
        console.error("[Notifications] Error during init:", error);
        if (error instanceof ServerError) {
          console.error("[Notifications] ServerError detected");
          router.push("/error/500");
          return;
        }
        console.error("[Notifications] Unknown error, redirecting to login");
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
    ws.on("follow_request", refresh);
    ws.on("follow_update", refresh);
    ws.on("new_message", refresh);
    ws.on("group_joined", refresh);
    ws.on("notification_event", refresh);

    return () => {
      ws.off("group_invitation", refresh);
      ws.off("join_request_approved", refresh);
      ws.off("join_request_rejected", refresh);
      ws.off("group_join_request", refresh);
      ws.off("follow_request", refresh);
      ws.off("follow_update", refresh);
      ws.off("new_message", refresh);
      ws.off("group_joined", refresh);
      ws.off("notification_event", refresh);
    };
  }, [currentUserId]);

  const onMarkAllRead = async () => {
    setMarkingAllRead(true);
    const success = await markAllNotificationsRead();

    if (success) {
      setNotifications((prev: NotificationItem[]) => prev.map((notification: NotificationItem) => ({ ...notification, read: 1 })));
      emitUnreadCountChanged(0);
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

    setNotifications((prev: NotificationItem[]) => {
      const next = prev.map((notification: NotificationItem) =>
        notification.id === notificationId ? { ...notification, read: 1 } : notification,
      );
      const unread = next.filter((notification: NotificationItem) => Number(notification.read) === 0).length;
      emitUnreadCountChanged(unread);
      return next;
    });
  };

  const getActivityNavigation = (item: NotificationItem) => {
    const payload = safeJsonParse(item.data);

    switch (item.type) {
      case "new_message":
        // Navigate to chat - ideally to specific conversation
        // For now route to chat, frontend should handle selecting conversation
        if (payload.conversation_id) {
          return `/chat?conversation=${payload.conversation_id}`;
        }
        if (payload.sender_id) {
          return `/chat?user=${payload.sender_id}`;
        }
        return `/chat`;

      case "group_invitation":
      case "group_join_request":
      case "join_request_approved":
      case "join_request_rejected":
      case "group_joined":
        // Navigate to group
        if (payload.group_id) return `/groups/${payload.group_id}`;
        break;

      case "follow_update":
        if (item.actor?.username) {
          return `/profile/${item.actor.username}`;
        }
        if (item.actor_id) {
          return `/profile/${item.actor_id}`;
        }
        break;

      case "follow_request":
        // Navigate to follow request sender's profile
        // Use username if available, fallback to actor_id
        if (item.actor?.username) {
          return `/profile/${item.actor.username}`;
        }
        if (item.actor_id) {
          return `/profile/${item.actor_id}`;
        }
        break;

      default:
        // Fallback - try to navigate to actor's profile
        if (item.actor?.username) {
          return `/profile/${item.actor.username}`;
        }
        if (item.actor_id) {
          return `/profile/${item.actor_id}`;
        }
    }
    return null;
  };

  const handleActivityClick = (item: NotificationItem) => {
    onMarkRead(item.id);
    const path = getActivityNavigation(item);
    if (path) {
      router.push(path);
    }
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

  const onHandleFollowRequest = async (requestId: number, action: "accept" | "decline") => {
    console.log(`[Follow Request] Handling request ${requestId} with action ${action}`);
    setProcessingId(requestId);
    const result = await handleFollowRequest(requestId, action);

    console.log(`[Follow Request] Result:`, result);

    if (result.success) {
      setFollowRequests((prev: PendingFollowRequest[]) => {
        const updated = prev.filter((request: PendingFollowRequest) => request.id !== requestId);
        console.log(`[Follow Request] Removed request ${requestId}, remaining:`, updated);
        return updated;
      });
      (globalThis as any).addToast({
        id: crypto.randomUUID(),
        title: action === "accept" ? "Follow request accepted" : "Follow request declined",
        message: result.message || "Done",
        type: action === "accept" ? "success" : "info",
      });
    } else {
      console.error(`[Follow Request] Failed:`, result.message);
      (globalThis as any).addToast({
        id: crypto.randomUUID(),
        title: "Error",
        message: result.message || "Failed to handle request",
        type: "error",
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
              {notifications.length > 10 && (
                <button
                  onClick={() => setViewAllNotifications(!viewAllNotifications)}
                  className="ml-auto text-xs text-primary hover:underline font-medium"
                >
                  {viewAllNotifications ? "Show Less" : `View All (${notifications.length})`}
                </button>
              )}
            </div>

            <div className="rounded-3xl border border-border bg-surface p-2">
              <div className="space-y-1 max-h-[70vh] overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted">No recent activity yet.</div>
                )}

                {(viewAllNotifications ? notifications : notifications.slice(0, 10)).map((item: NotificationItem) => {
                  const { title, subtitle } = buildActivityText(item);
                  const actorName = `${item.actor?.first_name || ""} ${item.actor?.last_name || ""}`.trim();

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleActivityClick(item)}
                      className="w-full text-left group p-4 flex gap-4 hover:bg-foreground/5 rounded-2xl transition-all cursor-pointer hover:shadow-sm"
                    >
                      <div className="relative flex-shrink-0">
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
                          <p className="text-sm leading-relaxed line-clamp-2 group-hover:text-foreground transition-colors">{title}</p>
                          <span className="text-[11px] text-muted font-medium whitespace-nowrap flex-shrink-0">
                            {formatTimeAgo(item.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted font-bold uppercase tracking-wider mt-1">{subtitle}</p>
                      </div>

                      {item.read === 0 && <div className="w-2 h-2 bg-primary rounded-full mt-2 self-start flex-shrink-0 animate-pulse" />}
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
                {invitations.length + pendingRequests.length + followRequests.length} Pending
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
                    <div key={invite.id} className="bg-background/60 p-4 rounded-2xl border border-border">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl border border-border bg-background flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-muted" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">{invite.group_name}</p>
                          <p className="text-[11px] text-muted truncate">Invited by {invite.inviter_name}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => onHandleInvitation(invite.id, "accept")}
                          disabled={processingId === invite.id}
                          className="flex-1 py-2 bg-green-500/10 text-green-500 text-xs font-bold rounded-lg hover:bg-green-500/20 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </button>
                        <button
                          onClick={() => onHandleInvitation(invite.id, "decline")}
                          disabled={processingId === invite.id}
                          className="flex-1 py-2 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg hover:bg-red-500/20 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
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

                  {pendingRequests.map((request: PendingJoinRequest) => {
                    console.log("[Join Request Render] Request:", request);
                    console.log("[Join Request Render] User object:", request.user);
                    return (
                    <div key={request.id} className="bg-background/60 p-4 rounded-2xl border border-border">
                      <div className="flex items-start gap-3">
                        {request.user?.avatar ? (
                          <img
                            src={`${API_URL}${request.user.avatar}`}
                            alt={request.user.username || "User"}
                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl border border-border bg-background flex items-center justify-center flex-shrink-0">
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
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-surface p-6 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted">Follow Requests</h3>
                <div className="space-y-3">
                  {!followRequests.length && (
                    <p className="text-sm text-muted">No pending follow requests.</p>
                  )}

                  {followRequests.map((request: PendingFollowRequest) => {
                    console.log("[Render] Follow request item:", request);
                    const requester = request.requester;
                    if (!requester) {
                      console.warn("[Render] Missing requester for request:", request);
                      return null;
                    }
                    return (
                      <div key={request.id} className="bg-background/60 p-4 rounded-2xl border border-border">
                        <div className="flex items-start gap-3">
                          {requester.avatar ? (
                            <img
                              src={`${API_URL}${requester.avatar}`}
                              alt={requester.username || "User"}
                              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl border border-border bg-background flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-muted" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">
                              {(requester.firstName || "User")} {(requester.lastName || "")}
                            </p>
                            <p className="text-[11px] text-muted truncate">
                              @{requester.username || "user"} wants to follow you
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              console.log("[Button] Accept clicked for request:", request.id);
                              onHandleFollowRequest(request.id, "accept");
                            }}
                            disabled={processingId === request.id}
                            className="flex-1 py-2 bg-green-500/10 text-green-500 text-xs font-bold rounded-lg hover:bg-green-500/20 disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Accept
                          </button>
                          <button
                            onClick={() => {
                              console.log("[Button] Decline clicked for request:", request.id);
                              onHandleFollowRequest(request.id, "decline");
                            }}
                            disabled={processingId === request.id}
                            className="flex-1 py-2 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg hover:bg-red-500/20 disabled:opacity-50 flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
