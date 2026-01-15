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
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default function Navbar({
  children,
  onLogout,
}: {
  children: React.ReactNode;
  onLogout?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true); // desktop default open
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const dark = storedTheme === "dark" || (!storedTheme && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
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
    []
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const SidebarContent = (
    <aside
      className={[
        "h-full border-r border-border bg-background text-foreground",
        "flex flex-col",
        open ? "w-64" : "w-18",
        "transition-[width] duration-200 ease-out",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-foreground/5 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          {open && (
            <div className="leading-tight">
              <div className="text-sm font-semibold">Social</div>
              <div className="text-xs text-foreground/60">Dashboard</div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-foreground/5"
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {items.map((it) => {
            const active =
              pathname === it.href ||
              (it.href !== "/" && pathname?.startsWith(it.href));
            const Icon = it.icon;

            return (
              <Link
                key={it.href}
                href={it.href}
                className={[
                  "group flex items-center gap-3 rounded-xl px-3 py-2",
                  "hover:bg-foreground/5",
                  active ? "bg-foreground/5" : "",
                ].join(" ")}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {open && (
                  <span className="text-sm font-medium">{it.label}</span>
                )}
                {!open && <span className="sr-only">{it.label}</span>}
                {open && active && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-foreground/80" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-border p-2 space-y-1">
        {mounted && (
          <button
            type="button"
            onClick={toggleTheme}
            className={[
              "w-full flex items-center gap-3 rounded-xl px-3 py-2",
              "hover:bg-foreground/5",
            ].join(" ")}
          >
            {isDark ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            {open && (
              <span className="text-sm font-medium">
                {isDark ? "Dark" : "Light"}
              </span>
            )}
            {!open && <span className="sr-only">Toggle theme</span>}
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className={[
            "w-full flex items-center gap-3 rounded-xl px-3 py-2",
            "hover:bg-foreground/5",
          ].join(" ")}
        >
          <LogOut className="h-5 w-5" />
          {open && <span className="text-sm font-medium">Logout</span>}
          {!open && <span className="sr-only">Logout</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="md:hidden sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex items-center justify-between px-3 py-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="h-10 w-10 rounded-xl hover:bg-foreground/5 flex items-center justify-center"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="text-sm font-semibold">Social</div>

          <Link
            href="/notifications"
            className="h-10 w-10 rounded-xl hover:bg-foreground/5 flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="flex">
        <div className="hidden md:block h-screen sticky top-0">
          {SidebarContent}
        </div>

        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-background/60"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar overlay"
            />
            <div className="absolute left-0 top-0 h-full w-[80%] max-w-xs shadow-2xl">
              <div className="h-full">
                <aside className="h-full border-r border-border bg-background text-foreground flex flex-col w-full">
                  <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-foreground/5 flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="leading-tight">
                        <div className="text-sm font-semibold">Social</div>
                        <div className="text-xs text-foreground/60">
                          Dashboard
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      className="h-9 w-9 items-center justify-center rounded-xl hover:bg-foreground/5 inline-flex"
                      aria-label="Close sidebar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <nav className="flex-1 p-2">
                    <div className="space-y-1">
                      {items.map((it) => {
                        const active =
                          pathname === it.href ||
                          (it.href !== "/" && pathname?.startsWith(it.href));
                        const Icon = it.icon;

                        return (
                          <Link
                            key={it.href}
                            href={it.href}
                            className={[
                              "group flex items-center gap-3 rounded-xl px-3 py-2",
                              "hover:bg-foreground/5",
                              active ? "bg-foreground/5" : "",
                            ].join(" ")}
                          >
                            <Icon className="h-5 w-5 shrink-0" />
                            <span className="text-sm font-medium">
                              {it.label}
                            </span>
                            {active && (
                              <span className="ml-auto h-2 w-2 rounded-full bg-foreground/80" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </nav>

                  <div className="border-t border-border p-2 space-y-1">
                    {mounted && (
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-foreground/5"
                      >
                        {isDark ? (
                          <Moon className="h-5 w-5" />
                        ) : (
                          <Sun className="h-5 w-5" />
                        )}
                        <span className="text-sm font-medium">
                          {isDark ? "Dark" : "Light"}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-foreground/5"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
