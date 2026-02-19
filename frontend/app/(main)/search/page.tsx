"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, ChevronRight, X } from "lucide-react";
import { fetchGroups, requestToJoin } from "@/lib/groups/api";
import type { Group, GroupPost } from "@/lib/groups/interface";
import { API_URL } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";
import PostCard from "@/components/groups/PostCard";

/* ────────────────────────────────────────────────────────── */
/*  Types                                                     */
/* ────────────────────────────────────────────────────────── */

type FilterTab = "all" | "people" | "groups" | "posts";

/* ────────────────────────────────────────────────────────── */
/*  Sub-components                                            */
/* ────────────────────────────────────────────────────────── */

function GroupCard({
  group,
  onJoin,
  joiningId,
  onNavigate,
  userGroups,
}: {
  group: Group;
  onJoin: (g: Group) => void;
  joiningId: number | null;
  onNavigate: (id: number) => void;
  userGroups: Group[];
}) {
  const cover = group.cover_image_path
    ? `${API_URL}${group.cover_image_path}`
    : null;
  const isJoining = joiningId === group.id;
  const isMember = userGroups.some((g) => g.id === group.id);

  return (
    <div
      className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all group cursor-pointer"
      onClick={() => onNavigate(group.id)}
    >
      {/* Cover image */}
      <div className="h-36 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
        {cover && (
          <img
            src={cover}
            alt={group.name}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <h3 className="font-bold text-base text-foreground mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {group.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {group.description || "No description provided."}
        </p>
        {!isMember && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!group.has_pending_request && !isJoining) {
                onJoin(group);
              }
            }}
            disabled={
              isJoining ||
              group.has_pending_request ||
              group.has_pending_invitation
            }
            className={`w-full font-bold py-2.5 rounded-lg text-sm transition-all disabled:cursor-not-allowed ${
              group.has_pending_invitation
                ? "bg-primary/10 text-primary border border-primary/30"
                : group.has_pending_request
                  ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/50"
                  : "bg-primary/10 hover:bg-primary text-primary hover:text-black"
            }`}
          >
            {isJoining
              ? "Requesting…"
              : group.has_pending_invitation
                ? "Invitation Pending"
                : group.has_pending_request
                  ? "Request Pending"
                  : "Request to Join"}
          </button>
        )}
      </div>
    </div>
  );
}

/* placeholder person card */
function PersonCard({ name, info }: { name: string; info: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col items-center text-center gap-4 hover:border-primary/30 transition-all">
      <div className="size-20 rounded-full bg-primary/10 ring-2 ring-primary/20 flex items-center justify-center">
        <Users size={28} className="text-primary/60" />
      </div>
      <div>
        <p className="font-bold text-base text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{info}</p>
      </div>
      <button className="w-full py-2 bg-primary/10 hover:bg-primary text-primary hover:text-black font-bold rounded-lg text-sm transition-all border border-primary/30">
        Follow
      </button>
    </div>
  );
}

const PLACEHOLDER_POSTS: GroupPost[] = [
  {
    id: -1,
    content:
      "How to build scalable apps — exploring the principles of building apps that scale well under heavy load with modern architecture patterns.",
    user_id: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    likes: 24,
    comments: 8,
    is_liked: false,
    author: {
      ID: 0,
      Email: "",
      Username: "alex_m",
      FirstName: "Alex",
      LastName: "Morgan",
      Nickname: "",
      Avatar: "",
      AboutMe: "",
      IsPublic: true,
      CreatedAt: "",
    },
  },
  {
    id: -2,
    content:
      "Design systems 101 — a design system is a collection of reusable components, guided by clear standards, that can be assembled to build any number of applications.",
    user_id: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    likes: 41,
    comments: 15,
    is_liked: false,
    author: {
      ID: 0,
      Email: "",
      Username: "jordan_s",
      FirstName: "Jordan",
      LastName: "Smith",
      Nickname: "",
      Avatar: "",
      AboutMe: "",
      IsPublic: true,
      CreatedAt: "",
    },
  },
  {
    id: -3,
    content:
      "Getting started with Go — Go is an open source programming language that makes it easy to build simple, reliable and efficient software at scale.",
    user_id: 0,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    likes: 17,
    comments: 6,
    is_liked: false,
    author: {
      ID: 0,
      Email: "",
      Username: "sam_c",
      FirstName: "Sam",
      LastName: "Chen",
      Nickname: "",
      Avatar: "",
      AboutMe: "",
      IsPublic: true,
      CreatedAt: "",
    },
  },
];

function AllGroupsModal({
  groups,
  userGroups,
  query,
  onClose,
  onJoin,
  joiningId,
  onNavigate,
}: {
  groups: Group[];
  userGroups: Group[];
  query: string;
  onClose: () => void;
  onJoin: (g: Group) => void;
  joiningId: number | null;
  onNavigate: (id: number) => void;
}) {
  const filtered = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(query.toLowerCase()) ||
      (g.description ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-16 overflow-y-auto">
      <div className="w-full max-w-4xl bg-surface rounded-2xl border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">All Groups</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {/* Search */}
        <div className="px-6 py-4 border-b border-border">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-primary"
              size={16}
            />
            <input
              defaultValue={query}
              readOnly
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none"
              placeholder="Groups shown for your search query"
            />
          </div>
        </div>
        {/* Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <p className="col-span-3 text-center text-muted-foreground py-8">
              No groups found.
            </p>
          ) : (
            filtered.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                onJoin={onJoin}
                joiningId={joiningId}
                onNavigate={onNavigate}
                userGroups={userGroups}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const PREVIEW_LIMIT = 6;

export default function SearchPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const [showAllGroups, setShowAllGroups] = useState(false);

  /* ── auth guard ── */
  useEffect(() => {
    async function checkAuth() {
      try {
        const u = await getCurrentUser();
        if (!u) router.push("/login");
      } catch (e) {
        if (e instanceof ServerError) router.push("/error/500");
        else router.push("/login");
      }
    }
    checkAuth();
  }, [router]);

  /* ── fetch groups ── */
  useEffect(() => {
    async function load() {
      setLoadingGroups(true);
      const data = await fetchGroups();
      if (data) {
        setAllGroups(data.allGroups ?? []);
        setUserGroups(data.userGroups ?? []);
      }
      setLoadingGroups(false);
    }
    load();
  }, []);

  /* ── navigate to group ── */
  const handleNavigate = useCallback(
    (id: number) => router.push(`/groups/${id}`),
    [router],
  );

  /* ── join handler ── */
  const handleJoin = useCallback(async (group: Group) => {
    setJoiningId(group.id);
    const result = await requestToJoin({ groupId: group.id });
    if (result.success) {
      const wasAutoAccepted = result.message?.includes("added to the group");
      (globalThis as any).addToast({
        id: crypto.randomUUID(),
        title: wasAutoAccepted ? "Welcome to the Group!" : "Request Sent",
        message: wasAutoAccepted
          ? "You had a pending invitation and were automatically added!"
          : "Your join request has been sent to the group owner",
        type: "success",
        duration: 5000,
      });
      setAllGroups((prev) =>
        prev.map((g) =>
          g.id === group.id
            ? {
                ...g,
                has_pending_request: !wasAutoAccepted,
                is_member: wasAutoAccepted,
              }
            : g,
        ),
      );
    } else {
      (globalThis as any).addToast({
        id: crypto.randomUUID(),
        title: "Error",
        message: result.message || "Failed to send join request",
        type: "error",
        duration: 5000,
      });
    }
    setJoiningId(null);
  }, []);

  /* ── filtered groups ── */
  const filteredGroups = allGroups.filter(
    (g) =>
      g.name.toLowerCase().includes(query.toLowerCase()) ||
      (g.description ?? "").toLowerCase().includes(query.toLowerCase()),
  );

  const previewGroups = filteredGroups.slice(0, PREVIEW_LIMIT);

  /* ── show/hide sections ── */
  const showGroups = activeTab === "all" || activeTab === "groups";
  const showPeople = activeTab === "all" || activeTab === "people";
  const showPosts = activeTab === "all" || activeTab === "posts";

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "people", label: "People" },
    { key: "groups", label: "Groups" },
    { key: "posts", label: "Posts" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-background text-foreground">
      {/* All-groups modal */}
      {showAllGroups && (
        <AllGroupsModal
          groups={allGroups}
          userGroups={userGroups}
          query={query}
          onClose={() => setShowAllGroups(false)}
          onJoin={handleJoin}
          joiningId={joiningId}
          onNavigate={(id) => {
            setShowAllGroups(false);
            handleNavigate(id);
          }}
        />
      )}

      <div className="flex flex-col gap-8 px-4 md:px-8 py-8 w-full">
        {/* ── Search Bar + Filter Chips ── */}
        <section className="flex flex-col gap-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-primary" size={16} />
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 bg-surface border-2 border-transparent focus:border-primary/50 focus:ring-0 rounded-xl text-sm transition-all placeholder:text-muted-foreground outline-none"
              placeholder="Search people, groups, or posts…"
              type="text"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl px-6 text-sm font-bold transition-colors ${
                  activeTab === t.key
                    ? "bg-primary text-black"
                    : "bg-surface text-muted-foreground hover:bg-muted border border-border"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── People section (placeholder) ── */}
        {showPeople && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight">
                Suggested People
              </h2>
              <button className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <PersonCard name="Alex Rivera" info="12 mutual followers" />
              <PersonCard name="Jordan Smith" info="8 mutual followers" />
              <PersonCard name="Sam Chen" info="15 mutual followers" />
              <PersonCard name="Taylor Vane" info="5 mutual followers" />
            </div>
            {/* note */}
            <p className="mt-3 text-xs text-muted-foreground italic">
              People search will be available soon.
            </p>
          </section>
        )}

        {/* ── Groups section ── */}
        {showGroups && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight">
                {query ? "Groups" : "Trending Groups"}
              </h2>
              {filteredGroups.length > PREVIEW_LIMIT && (
                <button
                  onClick={() => setShowAllGroups(true)}
                  className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
                >
                  View All ({filteredGroups.length}) <ChevronRight size={14} />
                </button>
              )}
            </div>

            {loadingGroups ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-muted rounded-2xl h-52 animate-pulse"
                  />
                ))}
              </div>
            ) : previewGroups.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">
                {query
                  ? `No groups match "${query}".`
                  : "No groups available yet."}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {previewGroups.map((g) => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    onJoin={handleJoin}
                    joiningId={joiningId}
                    onNavigate={handleNavigate}
                    userGroups={userGroups}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Posts section (placeholder) ── */}
        {showPosts && (
          <section className="pb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight">Recent Posts</h2>
              <button className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {PLACEHOLDER_POSTS.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground italic">
              Posts search will be available soon.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
