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
          console.log("Join request approved event received:", data);
          if (data.type === "join_request_approved") {
            (globalThis as any).addToast({
              id: Date.now().toString(),
              title: "Request Approved!",
              message: data.data.message || `You can now access ${data.data.group_name}`,
              type: "success",
              duration: 5000,
            });
          }
        };

        const handleRejected = (data: any) => {
          console.log("Join request rejected event received:", data);
          if (data.type === "join_request_rejected") {
            (globalThis as any).addToast({
              id: Date.now().toString(),
              title: "Request Declined",
              message: data.data.message || `Your request to join ${data.data.group_name} was declined`,
              type: "error",
              duration: 5000,
            });
          }
        };

        const handleInvitation = (data: any) => {
          console.log("Group invitation received:", data);
          if (data.type === "group_invitation") {
            (globalThis as any).addToast({
              id: Date.now().toString(),
              title: "Group Invitation",
              message: `${data.data.inviter_name} invited you to join ${data.data.group_name}`,
              type: "info",
              duration: 6000,
            });
          }
        };

        ws.on("join_request_approved", handleApproved);
        ws.on("join_request_rejected", handleRejected);
        ws.on("group_invitation", handleInvitation);
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
