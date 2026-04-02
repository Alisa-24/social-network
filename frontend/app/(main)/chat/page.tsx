"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search,
  MessageSquarePlus,
  UserIcon,
  Wifi,
  WifiOff,
  MessagesSquare,
  Users,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";
import { User, OnlineUser } from "@/lib/interfaces";
import { fetchContacts, getOrCreatePrivateChat, fetchPrivateMessages } from "@/lib/chat/api";
import { UserSearchResult } from "@/lib/users/search";
import PrivateChat from "@/components/chat/PrivateChat";
import * as ws from "@/lib/ws/ws";
import { API_URL } from "@/lib/config";

interface ContactWithConversation extends UserSearchResult {
  conversationId?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  isOnline?: boolean;
}

const formatTime = (isoDate?: string): string => {
  if (!isoDate) return "";
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

export default function ChatPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<ContactWithConversation[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactWithConversation | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const initDoneRef = useRef(false);

  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    async function init() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setCurrentUser(user);

        // Fetch contacts (followers + following)
        const contactList = await fetchContacts();

        // For each contact, try to get last message preview if conversation exists
        const enriched: ContactWithConversation[] = await Promise.all(
          contactList.map(async (c) => {
            try {
              const convId = await getOrCreatePrivateChat(c.userId!);
              const msgs = await fetchPrivateMessages(convId, 1, 0);
              const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
              return {
                ...c,
                conversationId: convId,
                lastMessage: last ? last.content.substring(0, 40) + (last.content.length > 40 ? "…" : "") : undefined,
                lastMessageTime: last?.created_at,
              };
            } catch {
              return { ...c };
            }
          })
        );

        // Sort: contacts with last message first, then alphabetically
        enriched.sort((a, b) => {
          if (a.lastMessageTime && b.lastMessageTime) {
            return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
          }
          if (a.lastMessageTime) return -1;
          if (b.lastMessageTime) return 1;
          return 0;
        });

        setContacts(enriched);
        setLoading(false);
      } catch (error) {
        if (error instanceof ServerError) {
          router.push("/error/500");
          return;
        }
        router.push("/login");
      }
    }

    init();
  }, [router]);

  // WebSocket setup
  useEffect(() => {
    const handleOnlineUsers = (data: { users: OnlineUser[] }) => {
      const ids = new Set<number>((data.users ?? []).map((u) => u.userId));
      setOnlineUserIds(ids);
    };

    const handleNewPrivateMessage = (data: any) => {
      if (!data?.conversation_id) return;
      setContacts((prev) => {
        const idx = prev.findIndex((c) => c.conversationId === data.conversation_id);
        if (idx === -1) return prev;
        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.lastMessage = data.content?.substring(0, 40) + (data.content?.length > 40 ? "…" : "");
        conv.lastMessageTime = data.created_at;
        updated.splice(idx, 1);
        return [conv, ...updated];
      });
    };

    const handleConnect = () => {
      setWsConnected(true);
      ws.requestOnlineUsers();
    };
    const handleDisconnect = () => setWsConnected(false);

    ws.on("online_users", handleOnlineUsers);
    ws.on("new_private_message", handleNewPrivateMessage);
    ws.onConnect(handleConnect);
    ws.onDisconnect(handleDisconnect);

    setWsConnected(ws.isConnected());
    if (ws.isConnected()) ws.requestOnlineUsers();

    return () => {
      ws.off("online_users", handleOnlineUsers);
      ws.off("new_private_message", handleNewPrivateMessage);
    };
  }, []);

  const handleSelectContact = async (contact: ContactWithConversation) => {
    if (contact.conversationId) {
      setSelectedContact(contact);
      setActiveConversationId(contact.conversationId);
      return;
    }
    // Start or get conversation
    setStartingChat(true);
    try {
      const convId = await getOrCreatePrivateChat(contact.userId!);
      const updated = { ...contact, conversationId: convId };
      setContacts((prev) =>
        prev.map((c) => (c.userId === contact.userId ? updated : c))
      );
      setSelectedContact(updated);
      setActiveConversationId(convId);
    } catch (err) {
      console.error("Cannot start chat:", err);
    } finally {
      setStartingChat(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const name = `${c.firstName} ${c.lastName}`.toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || c.username.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden bg-background">
      {/* ── Left Sidebar: Contacts ── */}
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-hidden">

        {/* Sidebar Header */}
        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessagesSquare className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Messages</h2>
            </div>
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <div className="flex items-center gap-1 text-[10px] text-green-500 font-semibold">
                  <Wifi className="w-3 h-3" />
                  <span>Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </div>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="w-full pl-10 pr-4 py-2.5 bg-muted/10 dark:bg-foreground/5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-muted-foreground text-foreground transition-all"
            />
          </div>
        </div>

        {/* Contacts list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4 py-12">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">No contacts yet</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Follow people or get followers to start chatting with them.
              </p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No results for "{searchQuery}"
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isActive = activeConversationId === contact.conversationId && selectedContact?.userId === contact.userId;
              const isOnline = onlineUserIds.has(contact.userId!);
              const displayName = `${contact.firstName} ${contact.lastName}`.trim();

              return (
                <button
                  key={contact.userId}
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group ${
                    isActive
                      ? "bg-primary/10 ring-1 ring-primary/20"
                      : "hover:bg-muted/5 dark:hover:bg-foreground/5"
                  }`}
                >
                  {/* Avatar + online dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                      {contact.avatar ? (
                        <img
                          src={`${API_URL}${contact.avatar}`}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>

                  {/* Name + last message */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-sm font-semibold truncate ${isActive ? "text-primary" : "text-foreground group-hover:text-primary transition-colors"}`}>
                        {displayName}
                      </p>
                      {contact.lastMessageTime && (
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                          {formatTime(contact.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    {contact.lastMessage ? (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{contact.lastMessage}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground/60 truncate mt-0.5 italic">No messages yet</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {startingChat ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Opening conversation...</p>
            </div>
          </div>
        ) : selectedContact && activeConversationId ? (
          <PrivateChat
            key={activeConversationId}
            conversationId={activeConversationId}
            currentUser={currentUser}
            otherUserName={`${selectedContact.firstName} ${selectedContact.lastName}`.trim()}
            otherUserId={selectedContact.userId}
            otherUserAvatar={selectedContact.avatar}
            otherUserUsername={selectedContact.username}
            isOnline={selectedContact.userId ? onlineUserIds.has(selectedContact.userId) : false}
          />
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquarePlus className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                <span className="text-white text-[9px] font-bold">✓</span>
              </div>
            </div>

            <div className="text-center max-w-xs">
              <h3 className="text-xl font-bold text-foreground mb-2">
                {contacts.length === 0 ? "No contacts yet" : "Select a conversation"}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {contacts.length === 0
                  ? "Follow people or get followers to unlock private messaging. Once connected, you can chat in real time."
                  : "Choose someone from your contacts to start a conversation. Your messages are delivered instantly."}
              </p>
            </div>

            {contacts.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {contacts.slice(0, 5).map((c) => (
                  <button
                    key={c.userId}
                    onClick={() => handleSelectContact(c)}
                    className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-full text-xs font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-all"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/10 overflow-hidden flex-shrink-0">
                      {c.avatar ? (
                        <img src={`${API_URL}${c.avatar}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-3 h-3 text-primary m-auto mt-1" />
                      )}
                    </div>
                    {c.firstName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
