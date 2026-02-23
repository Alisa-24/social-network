"use client";

import { API_URL } from "@/lib/config";
import type { Group } from "@/lib/groups/interface";

export default function GroupCard({
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
