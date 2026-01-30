import Link from "next/link";
import JoinRequests from "@/components/groups/JoinRequests";
import { Group, GroupEvent } from "@/lib/groups/interface";

interface Creator {
  ID: number;
  FirstName: string;
  LastName: string;
  Avatar: string;
  Role: "owner";
  JoinedAt: string;
}

interface GroupSidebarProps {
  group: Group;
  creator: Creator | null;
  events: GroupEvent[];
  activeTab: string;
  onViewAllEvents: () => void;
  onRefresh: () => void;
}

export default function GroupSidebar({
  group,
  creator,
  events,
  activeTab,
  onViewAllEvents,
  onRefresh,
}: GroupSidebarProps) {
  return (
    <aside className="w-full lg:w-80 space-y-6">
      {/* Join Requests (only visible to group owner) */}
      {group.is_owner && (
        <JoinRequests
          groupId={group.id}
          isOwner={true}
          onRequestHandled={onRefresh}
        />
      )}

      {/* About Group */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
          About Group
        </h3>
        <p className="text-sm text-foreground leading-relaxed">
          {group.description}
        </p>
      </div>

      {/* Group Creator */}
      {creator && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">
            Group Creator
          </h3>
          <div className="flex items-center gap-3 bg-background p-3 rounded-lg border border-border">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
              {creator.Avatar ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(http://localhost:8080${creator.Avatar})`,
                  }}
                />
              ) : (
                <span className="text-foreground font-bold text-sm">
                  {creator.FirstName[0]}
                  {creator.LastName[0]}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">
                  {creator.FirstName} {creator.LastName}
                </p>
                <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                  Owner
                </span>
              </div>
              <p className="text-muted text-[11px]">Group Founder</p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Events (if on Feed tab) */}
      {activeTab === "feed" && events.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-muted uppercase tracking-widest">
              Upcoming Event
            </h3>
            <button
              onClick={onViewAllEvents}
              className="text-[10px] text-primary font-bold uppercase hover:underline"
            >
              View All
            </button>
          </div>
          <div className="bg-background border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors cursor-pointer">
            {events[0].image_path && (
              <div
                className="h-24 bg-surface bg-cover bg-center"
                style={{
                  backgroundImage: `url(http://localhost:8080${events[0].image_path})`,
                }}
              />
            )}
            <div className="p-4">
              <p className="text-xs text-primary font-bold mb-2">
                {new Date(events[0].start_time)
                  .toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                  .toUpperCase()}{" "}
                •{" "}
                {new Date(events[0].start_time).toLocaleTimeString(
                  "en-US",
                  { hour: "numeric", minute: "2-digit" },
                )}
              </p>
              <p className="text-sm font-bold text-foreground mb-3">
                {events[0].title}
              </p>
              <div className="flex gap-2">
                <button className="flex-1 bg-primary text-black text-[11px] font-bold py-1.5 rounded-lg shadow-lg shadow-primary/20">
                  Going
                </button>
                <button className="flex-1 bg-background border border-border text-muted text-[11px] font-bold py-1.5 rounded-lg hover:text-foreground">
                  Not Going
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
