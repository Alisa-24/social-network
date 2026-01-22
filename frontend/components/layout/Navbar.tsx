"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Users,
  X,
  User,
  Moon,
  Sun,
  Zap,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type CurrentUser = {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
};

export default function Navbar({
  children,
  onLogout,
}: {
  children: React.ReactNode;
  onLogout?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Theme and User Persistence
  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("theme");
    let dark =
      storedTheme === "dark" ||
      (!storedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);

    try {
      const userStr = localStorage.getItem("currentUser");
      if (userStr) setCurrentUser(JSON.parse(userStr));
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const items: NavItem[] = useMemo(
    () => [
      { label: "Feed", href: "/feed", icon: Home },
      { label: "Profile", href: "/profile/me", icon: User },
      { label: "Groups", href: "/groups", icon: Users },
      { label: "Chat", href: "/chat", icon: MessageSquare },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
    [],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const getFullName = () =>
    currentUser
      ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim()
      : "User";

  const AvatarComponent = () => {
    if (currentUser?.avatar) {
      return (
        <img
          src={`http://localhost:8080${currentUser.avatar}`}
          alt={getFullName()}
          className="h-8 w-8 rounded-full object-cover shrink-0"
        />
      );
    }
    return (
      <div className="h-8 w-8 rounded-full bg-foreground/10 flex items-center justify-center border border-border shrink-0">
        <User className="h-4 w-4 text-foreground/60" />
      </div>
    );
  };

  const SidebarContent = (
    <aside
      className={`h-full border-r border-border bg-background text-foreground flex flex-col transition-all duration-300 ease-in-out ${open ? "w-64" : "w-20"}`}
    >
      {/* 1. TOP SECTION: Branding (Nexus) */}
      <div className="h-20 flex items-center px-4 shrink-0 overflow-hidden">
        <div
          className={`flex items-center gap-3 transition-all duration-300 ${!open ? "mx-auto" : ""}`}
        >
          <div className="bg-primary text-primary-foreground p-2 rounded-xl shrink-0 shadow-lg shadow-primary/20">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <div
            className={`transition-all duration-300 ${open ? "opacity-100 translate-x-0 w-auto" : "opacity-0 -translate-x-10 w-0"}`}
          >
            <span className="text-xl font-bold tracking-tighter whitespace-nowrap">
              Nexus
            </span>
          </div>
        </div>
        {open && (
          <button
            onClick={() => setOpen(false)}
            className="ml-auto p-1.5 hover:bg-foreground/5 rounded-lg hidden md:block"
          >
            <X className="h-4 w-4 text-foreground/40" />
          </button>
        )}
      </div>

      {!open && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setOpen(true)}
            className="p-2 hover:bg-foreground/5 rounded-lg hidden md:block"
          >
            <Menu className="h-5 w-5 text-foreground/40" />
          </button>
        </div>
      )}

      {/* 2. MIDDLE SECTION: Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {items.map((it) => {
          const active =
            pathname === it.href ||
            (it.href !== "/" && pathname?.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all group ${
                active
                  ? "bg-foreground/10 text-foreground"
                  : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              } ${!open ? "justify-center" : ""}`}
            >
              <it.icon
                className={`h-5 w-5 shrink-0 ${active ? "text-primary" : ""}`}
              />
              <div
                className={`transition-all duration-300 ${open ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}`}
              >
                <span className="text-sm font-medium whitespace-nowrap">
                  {it.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* 3. BOTTOM SECTION: User & Settings */}
      <div className="p-3 border-t border-border space-y-1 bg-background/50 backdrop-blur-sm">
        <div
          className={`flex items-center gap-3 px-3 py-2 rounded-xl mb-2 transition-all ${open ? "bg-foreground/5" : "justify-center"}`}
        >
          <AvatarComponent />
          <div
            className={`transition-all duration-300 flex-1 min-w-0 ${open ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}`}
          >
            <p className="text-sm font-semibold truncate">{getFullName()}</p>
            <p className="text-[10px] text-foreground/40 truncate uppercase tracking-widest">
              Active Now
            </p>
          </div>
        </div>

        {mounted && (
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-foreground/60 hover:bg-foreground/5 hover:text-foreground transition-all ${!open ? "justify-center" : ""}`}
          >
            {isDark ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            <div
              className={`transition-all duration-300 ${open ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}`}
            >
              <span className="text-sm font-medium whitespace-nowrap">
                {isDark ? "Dark Mode" : "Light Mode"}
              </span>
            </div>
          </button>
        )}

        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all ${!open ? "justify-center" : ""}`}
        >
          <LogOut className="h-5 w-5" />
          <div
            className={`transition-all duration-300 ${open ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}`}
          >
            <span className="text-sm font-medium whitespace-nowrap">
              Logout
            </span>
          </div>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 hover:bg-foreground/5 rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary fill-current" />
          <span className="font-bold tracking-tight">Nexus</span>
        </div>
        <Link
          href="/notifications"
          className="p-2 hover:bg-foreground/5 rounded-lg"
        >
          <Bell className="h-5 w-5" />
        </Link>
      </header>

      {/* Desktop Sidebar */}
      <div className="hidden md:block h-screen sticky top-0 z-50">
        {SidebarContent}
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-70 h-full shadow-2xl animate-in slide-in-from-left duration-300">
            {/* Direct Mobile Content */}
            <div className="h-full bg-background border-r border-border flex flex-col">
              <div className="h-20 flex items-center px-6 justify-between border-b border-border">
                <div className="flex items-center gap-3">
                  <Zap className="h-6 w-6 text-primary fill-current" />
                  <span className="text-xl font-bold">Nexus</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="p-2">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 px-4 py-6 space-y-2">
                {items.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    className="flex items-center gap-4 rounded-2xl px-4 py-3 hover:bg-foreground/5 transition-colors"
                  >
                    <it.icon className="h-6 w-6" />
                    <span className="text-lg font-medium">{it.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="p-6 border-t border-border space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <AvatarComponent />
                  <div>
                    <p className="text-base font-bold">{getFullName()}</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-4 px-2 py-2 text-foreground/70 hover:text-foreground"
                >
                  {isDark ? (
                    <Moon className="h-6 w-6" />
                  ) : (
                    <Sun className="h-6 w-6" />
                  )}{" "}
                  Theme
                </button>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-4 px-2 py-2 text-destructive"
                >
                  <LogOut className="h-6 w-6" /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Content */}
      <main className="flex-1 min-w-0 h-full">
        <div className="mx-auto max-w-5xl p-4 md:p-10">{children}</div>
      </main>
    </div>
  );
}
