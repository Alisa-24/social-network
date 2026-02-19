"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  LayoutGrid,
  Settings,
  House,
  CircleUserRound,
  UsersRound,
  MessagesSquare,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { API_URL } from "@/lib/config";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type CurrentUser = {
  email: string;
  username: string;
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
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

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
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }

    const handleUserUpdate = (event: any) => {
      setCurrentUser(event.detail);
    };

    window.addEventListener("userUpdated", handleUserUpdate);
    return () => window.removeEventListener("userUpdated", handleUserUpdate);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const items: NavItem[] = useMemo(
    () => [
      { label: "Feed", href: "/feed", icon: House },
      { label: "Search", href: "/search", icon: Search },
      { label: "Profile", href: "/profile/me", icon: CircleUserRound },
      { label: "Groups", href: "/groups", icon: UsersRound },
      { label: "Chat", href: "/chat", icon: MessagesSquare },
      { label: "Notifications", href: "/notifications", icon: Bell },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
    [],
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const getFullName = () =>
    currentUser
      ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "User"
      : "User";

  const getUsername = () => {
    if (!currentUser) return "user";
    const username = currentUser.username || (currentUser as any).Username || "";
    return username || "user";
  };

  const AvatarComponent = () => {
    if (currentUser?.avatar) {
      return (
        <img
          src={`${API_URL}${currentUser.avatar}`}
          alt={getFullName()}
          className="h-8 w-8 rounded-full object-cover shrink-0"
        />
      );
    }
    return (
      <div className="h-8 w-8 rounded-full bg-foreground/10 flex items-center justify-center border border-border shrink-0">
        <CircleUserRound className="h-4 w-4 text-foreground/60" />
      </div>
    );
  };

  const SidebarContent = (
    <aside
      className={`h-full border-r border-border bg-background text-foreground flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${open ? "w-64" : "w-[72px]"}`}
    >
      {/* TOP: Branding + collapse toggle */}
      <div className={`h-16 flex items-center shrink-0 px-4 ${open ? "justify-between" : "justify-center"}`}>
        {open ? (
          <>
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-green-400" strokeWidth={2.5} />
              <h2 className="text-sm font-bold tracking-tight whitespace-nowrap">SocialNet</h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 hover:bg-foreground/5 rounded-lg hidden md:flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4 text-foreground/40" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="p-2 hover:bg-foreground/5 rounded-lg hidden md:flex items-center justify-center"
          >
            <ChevronRight className="h-5 w-5 text-foreground/40" />
          </button>
        )}
      </div>

      {/* MIDDLE: Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {items.map((it) => {
          const active =
            pathname === it.href ||
            (it.href !== "/" && pathname?.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              title={!open ? it.label : undefined}
              className={`flex items-center rounded-xl px-3 py-2.5 transition-all group ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/60 hover:bg-foreground/5 hover:text-primary"
              } ${open ? "gap-3" : "justify-center"}`}
            >
              <it.icon
                className={`h-5 w-5 shrink-0 ${active ? "text-primary" : "group-hover:text-primary"}`}
              />
              {open && (
                <span className="text-sm font-medium whitespace-nowrap">
                  {it.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* BOTTOM: User & Settings */}
      <div className="p-3 border-t border-border space-y-1 bg-background/50 backdrop-blur-sm">
        {/* User info */}
        <div
          className={`flex items-center px-3 py-2 rounded-lg mb-2 ${open ? "gap-3 bg-foreground/5" : "justify-center"}`}
        >
          <AvatarComponent />
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{getFullName()}</p>
              <p className="text-[10px] text-foreground/40 truncate">@{getUsername()}</p>
              <p className="text-[10px] text-primary truncate uppercase tracking-widest font-bold">
                Active Now
              </p>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={toggleTheme}
            title={!open ? (isDark ? "Dark Mode" : "Light Mode") : undefined}
            className={`w-full flex items-center rounded-xl px-3 py-2 text-foreground/60 hover:bg-foreground/5 hover:text-primary transition-all ${open ? "gap-3" : "justify-center"}`}
          >
            {isDark ? (
              <Moon className="h-5 w-5 shrink-0" />
            ) : (
              <Sun className="h-5 w-5 shrink-0" />
            )}
            {open && (
              <span className="text-sm font-medium whitespace-nowrap">
                {isDark ? "Dark Mode" : "Light Mode"}
              </span>
            )}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          title={!open ? "Logout" : undefined}
          className={`w-full flex items-center rounded-xl px-3 py-2 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all ${open ? "gap-3" : "justify-center"}`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {open && (
            <span className="text-sm font-medium whitespace-nowrap">Logout</span>
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 hover:bg-foreground/5 rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-green-400" strokeWidth={2.5} />
          <h2 className="text-sm font-bold tracking-tight">SocialNet</h2>
        </div>
        <Link href="/notifications" className="p-2 hover:bg-foreground/5 rounded-lg">
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
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 h-full shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="h-full bg-background border-r border-border flex flex-col">
              <div className="h-16 flex items-center px-6 justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-6 h-6 text-green-400" strokeWidth={2.5} />
                  <h2 className="text-lg font-bold tracking-tight">SocialNet</h2>
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
                    <p className="text-xs text-foreground/40">@{getUsername()}</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-4 px-2 py-2 text-foreground/70 hover:text-foreground"
                >
                  {isDark ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
                  <span>Theme</span>
                </button>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-4 px-2 py-2 text-destructive"
                >
                  <LogOut className="h-6 w-6" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}