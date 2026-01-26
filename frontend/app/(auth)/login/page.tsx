"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, getCurrentUser } from "@/lib/auth/auth";
import { LayoutGrid, Mail, Lock, Sparkles, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
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
      setError(err instanceof Error ? err.message : "Login failed");
      setFormData({ ...formData, password: "" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (checkingAuth) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
          <h2 className="text-sm font-bold tracking-tight">SocialNet</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider hidden sm:inline">
            New here?
          </span>
          <Link
            href="/register"
            className="px-4 py-1.5 bg-primary text-background-dark text-[11px] font-bold rounded-md transition-all hover:bg-primary/90 active:scale-95"
          >
            SIGN UP
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-110 bg-background border border-border rounded-xl shadow-2xl h-fit overflow-hidden">
          <div className="h-1 w-full bg-primary" />

          <div className="p-8 md:p-10">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-foreground/60 text-xs mt-2 font-medium">
                Please enter your details to sign in
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-[11px] font-medium text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                  <input
                    name="email"
                    required
                    type="email"
                    placeholder="alex@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-input bg-background h-11 pl-10 pr-3 text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
                  <input
                    name="password"
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-input bg-background h-11 pl-10 pr-10 text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full h-11 bg-primary text-background-dark rounded-lg font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-[11px] text-foreground/50">
                  Don't have an account yet?{" "}
                  <Link
                    href="/register"
                    className="text-foreground font-bold hover:underline underline-offset-4"
                  >
                    Create one here
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
