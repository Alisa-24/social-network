"use client";

import Navbar from "@/components/layout/Navbar";
import { logout } from "@/lib/auth/auth";
import { useRouter } from "next/navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

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
