"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";
import { User } from "@/lib/interfaces";

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push("/login");
          return;
        }
        setUser(currentUser);
        setLoading(false);
      } catch (error) {
        if (error instanceof ServerError) {
          router.push("/error/500");
          return;
        }
        router.push("/login");
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="border border-border rounded-lg bg-background p-8 text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-4">
          Welcome, {user.firstName}!
        </h2>
        <p className="text-foreground/60">Your feed will appear here.</p>
      </div>
    </div>
  );
}
