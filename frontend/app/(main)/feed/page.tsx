"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User as UserIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";
import { User, OnlineUser } from "@/lib/interfaces";
import { API_URL } from "@/lib/config";
import * as ws from "@/lib/ws/ws";
import WebSocketErrorPage from "@/components/layout/WebSocketErrorPage";

export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [showErrorPage, setShowErrorPage] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

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

  useEffect(() => {
    if (!user) return;

    const handleOnlineUsers = (data: { users: OnlineUser[] }) => {
      setOnlineUsers(
        (data.users || []).filter(
          (onlineUser) => onlineUser.userId !== user.userId && onlineUser.online,
        ),
      );
    };

    const handleConnect = () => {
      setWsConnected(true);
      setShowErrorPage(false);
      setReconnectAttempts(0);

      ws.requestOnlineUsers(); //once per connection
    };

    const handleDisconnect = () => {
      setWsConnected(false);
      setReconnectAttempts(ws.getReconnectAttempts());
    };

    const handleMaxRetries = () => {
      setShowErrorPage(true);
    };

    ws.on("online_users", handleOnlineUsers);
    ws.onConnect(handleConnect);
    ws.onDisconnect(handleDisconnect);
    ws.onMaxRetriesReached(handleMaxRetries);

    setWsConnected(ws.isConnected());
    
    // Request online users when component mounts (if already connected)
    if (ws.isConnected()) {
      ws.requestOnlineUsers();
    }

    return () => {
      ws.off("online_users", handleOnlineUsers);
    };
  }, [user]);

  // Handle reload when user clicks retry
  const handleReload = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  // Show error page if max retries reached
  if (showErrorPage) {
    return (
      <WebSocketErrorPage
        onRetry={handleReload}
        isReconnecting={false}
        reconnectAttempts={reconnectAttempts}
        maxAttempts={ws.getMaxReconnectAttempts()}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2">
          <div className="border border-border rounded-lg bg-background p-8 text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Welcome, {user.firstName}!
            </h2>
            <p className="text-foreground/60">Your feed will appear here.</p>
          </div>
        </div>

        {/* Online Users Sidebar */}
        <div className="lg:col-span-1">
          <div className="border border-border rounded-lg bg-background p-6 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Online Users
              </h3>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    wsConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-xs text-foreground/60">
                  {wsConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>

            {/* Reconnecting Warning */}
            {!wsConnected && reconnectAttempts > 0 && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 text-center">
                  Reconnecting... ({reconnectAttempts}/
                  {ws.getMaxReconnectAttempts()})
                </p>
              </div>
            )}

            {onlineUsers.length === 0 ? (
              <p className="text-sm text-foreground/60 text-center py-8">
                No users online
              </p>
            ) : (
              <div className="space-y-3">
                {onlineUsers.map((onlineUser) => (
                  <div
                    key={onlineUser.userId}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-foreground/5 transition-colors"
                  >
                    <div className="relative">
                      {onlineUser.avatar ? (
                        <img
                          src={`${API_URL}${onlineUser.avatar}`}
                          alt={onlineUser.firstName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center border border-border shrink-0">
                          <UserIcon className="h-5 w-5 text-foreground/60" />
                        </div>
                      )}
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${onlineUser.online ? "bg-green-500" : "bg-foreground/20"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {onlineUser.nickname ||
                          `${onlineUser.firstName} ${onlineUser.lastName}`}
                      </p>
                      <p className="text-xs text-foreground/60 truncate">
                        {onlineUser.nickname &&
                          `${onlineUser.firstName} ${onlineUser.lastName}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-foreground/60 text-center">
                {onlineUsers.length} user{onlineUsers.length !== 1 ? "s" : ""}{" "}
                online
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
