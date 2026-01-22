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
