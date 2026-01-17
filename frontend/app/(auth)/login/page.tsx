"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";
import { Mail, Lock, Sparkles, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          router.push("/feed");
          return;
        }
        setCheckingAuth(false);
      } catch (error) {
        if (error instanceof ServerError) {
          router.push("/error/500");
          return;
        }
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(formData);
      router.push("/feed");
    } catch (err) {
      if (err instanceof ServerError) {
        router.push("/error/500");
        return;
      }
      setError(err instanceof Error ? err.message : "Login failed");
      setFormData({
        ...formData,
        password: "",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-background p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-semibold text-foreground">Sign In</h2>
        </div>
        <p className="mt-2 text-sm text-foreground/60">Welcome back</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground/80 mb-2"
          >
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-foreground/40 transition-all duration-200 hover:border-foreground/20"
              placeholder="example@email.com"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground/80 mb-2"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full pl-10 pr-10 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-foreground/40 transition-all duration-200 hover:border-foreground/20"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/80 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-foreground text-background rounded-md font-medium hover:opacity-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </button>

        <div className="text-center mt-4">
          <p className="text-sm text-foreground/60">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-foreground hover:text-foreground/80 underline underline-offset-4"
            >
              Sign up
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
