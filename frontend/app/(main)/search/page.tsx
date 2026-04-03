"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchGroups, requestToJoin } from "@/lib/groups/api";
import { searchUsers, fetchSuggestedUsers } from "@/lib/users/search";
import type { UserSearchResult } from "@/lib/users/search";
import type { Group } from "@/lib/groups/interface";
import { getCurrentUser } from "@/lib/auth/auth";
import { ServerError } from "@/lib/errors";

/* ────────────────────────────────────────────────────────── */
/*  Components                                                */
/* ────────────────────────────────────────────────────────── */
import AllGroupsModal from "@/components/search/AllGroupsModal";
import SearchSection from "@/components/search/SearchSection";
import PeopleSection from "@/components/search/PeopleSection";
import GroupsSection from "@/components/search/GroupsSection";

/* ────────────────────────────────────────────────────────── */
/*  Types                                                     */
/* ────────────────────────────────────────────────────────── */

type FilterTab = "all" | "people" | "groups";

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
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── auth guard ── */
  useEffect(() => {
    async function checkAuth() {
      try {
        const u = await getCurrentUser();
        if (!u) router.push("/login");
        else setCurrentUserId(u.userId);
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

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "people", label: "People" },
    { key: "groups", label: "Groups" },
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
            currentUserId={currentUserId}
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


      </div>
    </div>
  );
}
