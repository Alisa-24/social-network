"use client";

import { ChevronRight } from "lucide-react";
import type { Group } from "@/lib/groups/interface";
import GroupCard from "../groups/GroupCard";

interface GroupsSectionProps {
  query: string;
  loadingGroups: boolean;
  previewGroups: Group[];
  filteredGroupsCount: number;
  previewLimit: number;
  setShowAllGroups: (show: boolean) => void;
  handleJoin: (group: Group) => void;
  joiningId: number | null;
  handleNavigate: (id: number) => void;
  userGroups: Group[];
}

export default function GroupsSection({
  query,
  loadingGroups,
  previewGroups,
  filteredGroupsCount,
  previewLimit,
  setShowAllGroups,
  handleJoin,
  joiningId,
  handleNavigate,
  userGroups,
}: GroupsSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-tight">
          {query ? "Groups" : "Trending Groups"}
        </h2>
        {filteredGroupsCount > previewLimit && (
          <button
            onClick={() => setShowAllGroups(true)}
            className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
          >
            View All ({filteredGroupsCount}) <ChevronRight size={14} />
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
  );
}
