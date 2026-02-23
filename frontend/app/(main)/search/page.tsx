"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchGroups, requestToJoin } from "@/lib/groups/api";
import { searchUsers, fetchSuggestedUsers } from "@/lib/users/search";
import type { UserSearchResult } from "@/lib/users/search";
import type { Group, GroupPost } from "@/lib/groups/interface";
import { getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";

/* ────────────────────────────────────────────────────────── */
/*  Components                                                */
/* ────────────────────────────────────────────────────────── */
import AllGroupsModal from "@/components/search/AllGroupsModal";
import SearchSection from "@/components/search/SearchSection";
import PeopleSection from "@/components/search/PeopleSection";
import GroupsSection from "@/components/search/GroupsSection";
import PostsSection from "@/components/search/PostsSection";

/* ────────────────────────────────────────────────────────── */
/*  Types                                                     */
/* ────────────────────────────────────────────────────────── */

type FilterTab = "all" | "people" | "groups" | "posts";

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

  /* ── user search state ── */
  const [suggestedUsers, setSuggestedUsers] = useState<UserSearchResult[]>([]);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  /* ── load 5 suggested users on mount ── */
  useEffect(() => {
    async function load() {
      setLoadingUsers(true);
      const results = await fetchSuggestedUsers();
      setSuggestedUsers(results);
      setUserResults(results);
      setLoadingUsers(false);
    }
    load();
  }, []);

  /* ── debounced API search on type ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setUserResults(suggestedUsers);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const results = await searchUsers(query);
      setUserResults(results);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, suggestedUsers]);

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
        <SearchSection
          query={query}
          setQuery={setQuery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={tabs}
        />

        {showPeople && (
          <PeopleSection
            query={query}
            loadingUsers={loadingUsers}
            userResults={userResults}
          />
        )}

        {showGroups && (
          <GroupsSection
            query={query}
            loadingGroups={loadingGroups}
            previewGroups={previewGroups}
            filteredGroupsCount={filteredGroups.length}
            previewLimit={PREVIEW_LIMIT}
            setShowAllGroups={setShowAllGroups}
            handleJoin={handleJoin}
            joiningId={joiningId}
            handleNavigate={handleNavigate}
            userGroups={userGroups}
          />
        )}

        {showPosts && <PostsSection posts={PLACEHOLDER_POSTS} />}
      </div>
    </div>
  );
}
