"use client";

import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { logout, getCurrentUser } from "@/lib/auth/auth";
import { useRouter } from "next/navigation";
import * as ws from "@/lib/ws/ws";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Connect WebSocket when app loads if user is authenticated
    getCurrentUser().then((user) => {
      if (user) {
        ws.connect();

        // Listen for join request responses
        const handleApproved = (data: any) => {
          if (data.type === "join_request_approved") {
            (globalThis as any).addToast({
              id: crypto.randomUUID(),
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
              id: crypto.randomUUID(),
              title: "Request Declined",
              message: data.data.message || `Your request to join ${data.data.group_name} was declined`,
              type: "error",
              duration: 5000,
              href: "/notifications",
            });
          }
        };

        const handleInvitation = (data: any) => {
          if (data.type === "group_invitation") {
            (globalThis as any).addToast({
              id: crypto.randomUUID(),
              title: "Group Invitation",
              message: `${data.data.inviter_name} invited you to join ${data.data.group_name}`,
              type: "info",
              duration: 6000,
              href: "/notifications",
            });
          }
        };

        const handleNewEvent = (data: any) => {
          if (data.type === "new_event") {
            (globalThis as any).addToast({
              id: crypto.randomUUID(),
              title: "New Group Event!",
              message: `A new event "${data.data.group_name}" has been created.`,
              type: "success",
              duration: 7000,
              href: "/notifications",
            });
          }
        };

        const handleFollowUpdate = (data: any) => {
          if (data.type !== "follow_update") return;
          const d = data.data;
          const name = [d.followerFirstName, d.followerLastName].filter(Boolean).join(" ") || d.followerUsername;
          if (d.status === "none") return;
          (globalThis as any).addToast({
            id: crypto.randomUUID(),
            title: d.status === "pending" ? "Follow Request" : "New Follower",
            message: d.status === "pending"
              ? `${name} requested to follow you`
              : `${name} started following you`,
            type: "info",
            duration: 5000,
            href: "/notifications",
          });
          window.dispatchEvent(new CustomEvent("follow_update", { detail: d }));
        };

        ws.on("join_request_approved", handleApproved);
        ws.on("join_request_rejected", handleRejected);
        ws.on("group_invitation", handleInvitation);
        ws.on("new_event", handleNewEvent);
        ws.on("follow_update", handleFollowUpdate);

        // Clean up listeners when component unmounts
        return () => {
          ws.off("join_request_approved", handleApproved);
          ws.off("join_request_rejected", handleRejected);
          ws.off("group_invitation", handleInvitation);
          ws.off("new_event", handleNewEvent);
          ws.off("follow_update", handleFollowUpdate);
        };
      }
    });
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      router.push("/login");
    }
  };

  return <Navbar onLogout={handleLogout}>{children}</Navbar>;
}
