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

type CurrentUser = {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  createdAt: string;
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

  useEffect(() => {
    setMounted(true);

    // Get theme from memory state on mount
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);

    // Get user data from localStorage
    try {
      const userStr = localStorage.getItem("currentUser");
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
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

  const getInitials = () => {
    if (!currentUser) return "U";
    const first = currentUser.firstName?.charAt(0)?.toUpperCase() || "";
    const last = currentUser.lastName?.charAt(0)?.toUpperCase() || "";
    return `${first}${last}` || "U";
  };

  const getFullName = () => {
    if (!currentUser) return "User";
    return (
      `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
      "User"
    );
  };

  const AvatarComponent = () => {
    const avatar = (currentUser as any)?.avatar;

    if (avatar) {
      return (
        <img
          src={`http://localhost:8080${avatar}`}
          alt={getFullName()}
          className="h-9 w-9 rounded-full object-cover"
          onError={(e) => {
            console.error("Failed to load avatar:", avatar);
            e.currentTarget.style.display = "none";
          }}
        />
      );
    }

    return (
      <div className="h-9 w-9 rounded-full bg-foreground/10 flex items-center justify-center border border-border">
        <User className="h-5 w-5 text-foreground/60" />
      </div>
    );
  };

  const SidebarContent = (
    <aside
      className={[
        "h-full border-r border-border bg-background text-foreground",
        "flex flex-col",
        open ? "w-64" : "w-18",
        "transition-[width] duration-200 ease-out",
      ].join(" ")}
    >
      <div
        className={`flex items-center gap-2 px-3 py-3 border-b border-border ${
          open ? "justify-between" : "justify-center flex-col"
        }`}
      >
        <div className={`flex items-center gap-2 ${!open ? "flex-col" : ""}`}>
          <AvatarComponent />
          {open && (
            <div className="leading-tight">
              <div className="text-sm font-semibold">{getFullName()}</div>
            </div>
          )}
        </div>

        {open && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-foreground/5"
            aria-label="Collapse sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {!open && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-foreground/5 mt-2"
            aria-label="Expand sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
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
            <div
              className="absolute inset-0 bg-background/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Close sidebar overlay"
            />
            <div className="absolute left-0 top-0 h-full w-[80%] max-w-xs shadow-2xl">
              <div className="h-full">
                <aside className="h-full border-r border-border bg-background text-foreground flex flex-col w-full">
                  <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <AvatarComponent />
                      <div className="leading-tight">
                        <div className="text-sm font-semibold">
                          {getFullName()}
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
