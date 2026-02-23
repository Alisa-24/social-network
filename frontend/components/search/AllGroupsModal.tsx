"use client";

import { X, Search } from "lucide-react";
import type { Group } from "@/lib/groups/interface";
import GroupCard from "../groups/GroupCard";

interface AllGroupsModalProps {
  groups: Group[];
  userGroups: Group[];
  query: string;
  onClose: () => void;
  onJoin: (g: Group) => void;
  joiningId: number | null;
  onNavigate: (id: number) => void;
}

export default function AllGroupsModal({
  groups,
  userGroups,
  query,
  onClose,
  onJoin,
  joiningId,
  onNavigate,
}: AllGroupsModalProps) {
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
