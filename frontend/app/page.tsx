"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          router.push("/feed");
          return;
        }
        setLoading(false);
      } catch (error) {
        if (error instanceof ServerError) {
          router.push("/error/500");
          return;
        }
        setLoading(false);
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-2xl px-4 animate-in fade-in zoom-in-95 duration-700">
        <h1 className="text-6xl font-bold text-foreground tracking-tight animate-in slide-in-from-bottom-4 duration-700 delay-100">
          Social Network
        </h1>
        <p className="text-xl text-foreground/60 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-200">
          Connect with friends and share your moments
        </p>
        <div className="flex gap-3 justify-center mt-8 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-300">
          <Link
            href="/login"
            className="px-6 py-2.5 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-6 py-2.5 border border-border text-foreground rounded-md font-medium hover:bg-foreground/5 transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
