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
    <div className="relative flex h-screen w-full flex-col md:flex-row overflow-hidden bg-background text-foreground">
      {/* Left Side: Brand & Value Proposition */}
      <div className="flex flex-1 flex-col justify-between p-8 md:p-20 bg-background border-r border-border">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-2xl">hub</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            SocialNetwork
          </h2>
        </div>

        <div className="max-w-135">
          <h1 className="text-6xl md:text-7xl font-extrabold leading-[1.1] tracking-[-0.04em] mb-8">
            Connect.
            <br />
            <span className="text-primary">Share.</span>
            <br />
            Belong.
          </h1>
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-ring mt-1">
                check_circle
              </span>
              <p className="text-lg text-muted-foreground font-medium">
                Follow your interests and stay updated with the people you love.
              </p>
            </div>
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-ring mt-1">
                check_circle
              </span>
              <p className="text-lg text-muted-foreground font-medium">
                Join vibrant, moderated groups for niche communities.
              </p>
            </div>
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-ring mt-1">
                check_circle
              </span>
              <p className="text-lg text-muted-foreground font-medium">
                Chat in real-time with end-to-end encrypted messaging.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Action Card */}
      <div className="flex flex-1 items-center justify-center p-8 bg-background/50">
        <div className="w-full max-w-105 rounded-xl bg-background p-10 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-border">
          <div className="mb-8 text-center md:text-left">
            <h3 className="text-2xl font-bold mb-2">Join the conversation.</h3>
            <p className="text-muted-foreground">
              Experience the next generation of social networking.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <Link
              href="/register"
              className="flex w-full items-center justify-center gap-2 rounded-lg h-14 font-bold text-lg transition-all active:scale-[0.98]"
              style={{ backgroundColor: "#3b82f6", color: "#ffffff" }}
            >
              <span>Create Account</span>
            </Link>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-border h-14 text-foreground font-bold text-lg hover:bg-foreground/5 transition-all active:scale-[0.98]"
            >
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-ring/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-ring/5 rounded-full blur-[100px] pointer-events-none"></div>
    </div>
  );
}
