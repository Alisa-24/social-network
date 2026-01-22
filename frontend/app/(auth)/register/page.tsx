"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register, getCurrentUser } from "@/lib/auth/auth";
import {
  Sparkles,
  Eye,
  EyeOff,
  Camera,
  LayoutGrid,
  User,
  Mail,
  Lock,
  Calendar,
  MessageSquare,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    nickname: "",
    aboutMe: "",
  });

  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
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
      await register({
        ...formData,
        nickname: formData.nickname || undefined,
        aboutMe: formData.aboutMe || undefined,
        avatar: avatar || undefined,
      });
      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (checkingAuth) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-blue-500" strokeWidth={2.5} />
          <h2 className="text-sm font-bold tracking-tight">SocialNet</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider hidden sm:inline">
            Already a member?
          </span>
          <Link
            href="/login"
            className="px-4 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-md transition-all hover:bg-blue-500 active:scale-95"
          >
            LOG IN
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-135 bg-background border border-border rounded-xl shadow-2xl h-fit">
          <div className="p-6 md:p-8">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Create your account
              </h1>
              <p className="text-foreground/60 text-xs mt-2 font-medium">
                Join our global network of creators.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-[11px] font-medium">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" />
                    <input
                      name="firstName"
                      required
                      type="text"
                      placeholder="Alex"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-input bg-background h-10 pl-9 pr-3 text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" />
                    <input
                      name="lastName"
                      required
                      type="text"
                      placeholder="Rivers"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-input bg-background h-10 pl-9 pr-3 text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" />
                  <input
                    name="email"
                    required
                    type="email"
                    placeholder="alex@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-input bg-background h-10 pl-9 pr-3 text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" />
                    <input
                      name="password"
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-input bg-background h-10 pl-9 pr-10 text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-foreground/50 uppercase tracking-wider">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" />
                    <input
                      name="dateOfBirth"
                      required
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-input bg-background h-10 pl-9 pr-3 text-sm focus:ring-2 focus:ring-ring focus:border-transparent outline-none scheme-dark"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">
                    Profile Customization
                  </h3>
                  <span className="text-[9px] text-foreground/30 font-medium">
                    (Optional)
                  </span>
                </div>

                <div className="flex gap-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group cursor-pointer shrink-0"
                  >
                    <div className="size-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center bg-background hover:border-blue-500 transition-all overflow-hidden">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 text-foreground/30 group-hover:text-blue-500" />
                          <span className="text-[8px] text-foreground/30 mt-1 font-bold uppercase">
                            Avatar
                          </span>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAvatarPreview("");
                          setAvatar(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors shadow-md"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30" />
                      <input
                        name="nickname"
                        type="text"
                        placeholder="Nickname (@handle)"
                        value={formData.nickname}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-input bg-background h-10 pl-9 pr-3 text-sm focus:ring-2 focus:ring-ring outline-none"
                      />
                    </div>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 w-3.5 h-3.5 text-foreground/30" />
                      <textarea
                        name="aboutMe"
                        rows={2}
                        placeholder="Tell us about yourself..."
                        value={formData.aboutMe}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-ring outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full h-11 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-500 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                  {loading ? "Creating Account..." : "Complete Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
