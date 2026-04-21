"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import WebSocketErrorPage from "@/components/layout/WebSocketErrorPage";
import { logout, getCurrentUser } from "@/lib/auth/auth";
import { useRouter } from "next/navigation";
import * as ws from "@/lib/ws/ws";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    let isActive = true;

    const handleApproved = (data: any) => {
      if (data.type === "join_request_approved") {
        (globalThis as any).addToast({
          id: Date.now().toString(),
          title: "Request Approved!",
          message: data.data.message || `You can now access ${data.data.group_name}`,
          type: "success",
          duration: 5000,
          href: "/notifications",
        });
      }
    };

    const handleRejected = (data: any) => {
      if (data.type === "join_request_rejected") {
        (globalThis as any).addToast({
          id: Date.now().toString(),
          title: "Request Declined",
          message: data.data.message || `Your request to join ${data.data.group_name} was declined`,
          type: "error",
          duration: 5000,
          href: "/notifications",
        });
      }
    };

    const handleInvitation = (data: any) => {
      if (data.type !== "group_invitation") return;

      const payload = data.data ?? {};
      const payloadMessage =
        typeof payload.message === "string" ? payload.message.trim() : "";

      // Ignore sender-side activity like "You invited @user to ..."
      // and only show the incoming invitation toast to the real recipient.
      if (
        payloadMessage.startsWith("You invited") ||
        !payload.inviter_id
      ) {
        return;
      }

      const inviterName =
        payload.inviter_name ||
        payload.inviter_username ||
        "Someone";

      (globalThis as any).addToast({
        id: Date.now().toString(),
        title: "Group Invitation",
        message: `${inviterName} invited you to join ${payload.group_name}`,
        type: "info",
        duration: 6000,
        href: "/notifications",
      });
    };

    const handleFollowUpdate = (data: any) => {
      if (data.type !== "follow_update") return;
      const d = data.data;
      const payloadMessage =
        typeof d?.message === "string" ? d.message.trim() : "";

      const name = [d.followerFirstName, d.followerLastName].filter(Boolean).join(" ") || d.followerUsername;
      if (d.status === "none") return;

      if (d.targetUsername) {
        (globalThis as any).addToast({
          id: Date.now().toString(),
          title:
            d.action === "decline"
              ? "Follow Request Declined"
              : "Follow Request Accepted",
          message:
            d.action === "decline"
              ? `Your follow request to @${d.targetUsername} was declined`
              : `You are now following @${d.targetUsername}`,
          type: d.action === "decline" ? "error" : "success",
          duration: 5000,
          href: "/notifications",
        });
        window.dispatchEvent(new CustomEvent("follow_update", { detail: d }));
        return;
      }

      if (payloadMessage.startsWith("You are now following")) {
        return;
      }

      (globalThis as any).addToast({
        id: Date.now().toString(),
        title: d.status === "pending" ? "Follow Request" : "New Follower",
        message: payloadMessage || (d.status === "pending"
          ? `${name} requested to follow you`
          : `${name} started following you`),
        type: "info",
        duration: 5000,
        href: "/notifications",
      });
      window.dispatchEvent(new CustomEvent("follow_update", { detail: d }));
    };

    const handleSocketConnect = () => {
      setShowConnectionModal(false);
      setIsReconnecting(false);
      setReconnectAttempts(0);
    };

    const handleSocketError = () => {
      setShowConnectionModal(true);
      setIsReconnecting(true);
      setReconnectAttempts((current) =>
        current > 0 ? current : Math.max(1, ws.getReconnectAttempts()),
      );
    };

    const handleReconnectAttempt = (attempt: number) => {
      setShowConnectionModal(true);
      setIsReconnecting(true);
      setReconnectAttempts(attempt);
    };

    const handleMaxRetries = () => {
      setShowConnectionModal(true);
      setIsReconnecting(false);
      setReconnectAttempts(ws.getMaxReconnectAttempts());
    };

    // Connect WebSocket when app loads if user is authenticated
    getCurrentUser().then((user) => {
      if (!isActive || !user) {
        return;
      }

      ws.connect();
      ws.on("join_request_approved", handleApproved);
      ws.on("join_request_rejected", handleRejected);
      ws.on("group_invitation", handleInvitation);
      ws.on("follow_update", handleFollowUpdate);
      ws.onConnect(handleSocketConnect);
      ws.onError(handleSocketError);
      ws.onReconnectAttempt(handleReconnectAttempt);
      ws.onMaxRetriesReached(handleMaxRetries);
    });

    return () => {
      isActive = false;
      ws.off("join_request_approved", handleApproved);
      ws.off("join_request_rejected", handleRejected);
      ws.off("group_invitation", handleInvitation);
      ws.off("follow_update", handleFollowUpdate);
      ws.offConnect(handleSocketConnect);
      ws.offError(handleSocketError);
      ws.offReconnectAttempt(handleReconnectAttempt);
      ws.offMaxRetriesReached(handleMaxRetries);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      router.push("/login");
    }
  };

  return (
    <>
      <Navbar onLogout={handleLogout}>{children}</Navbar>
      {showConnectionModal && (
        <WebSocketErrorPage
          variant="modal"
          onRetry={() => window.location.reload()}
          isReconnecting={isReconnecting}
          reconnectAttempts={reconnectAttempts}
          maxAttempts={ws.getMaxReconnectAttempts()}
        />
      )}
    </>
  );
}
