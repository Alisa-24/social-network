import Link from "next/link";
import { UserIcon } from "lucide-react";
import JoinRequests from "@/components/groups/JoinRequests";
import { Group, GroupEvent } from "@/lib/groups/interface";
import { API_URL } from "@/lib/config";

interface Creator {
  ID: number;
  Username: string;
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
    <aside className="w-full lg:w-80 space-y-6 shrink-0 h-fit">
      {/* Join Requests */}
      {group.is_owner && (
        <JoinRequests
          groupId={group.id}
          isOwner={true}
          onRequestHandled={onRefresh}
        />
      )}

      {/* About Group */}
      <div className="p-6 glass rounded-3xl space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          About Group
        </h4>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {group.description || "No description provided."}
        </p>
      </div>

      {/* Group Creator */}
      {creator && (
        <div className="p-6 glass rounded-3xl space-y-4">
          <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Group Creator
          </h4>
          <div className="p-3 bg-muted/10 rounded-2xl border border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
              {creator.Avatar ? (
                <img
                  src={`${API_URL}${creator.Avatar}`}
                  alt="Creator"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-muted-foreground font-bold text-sm">
                <UserIcon className="h-6 w-6 text-muted-foreground" />
                </span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold shrink-0">
                  {creator.FirstName} {creator.LastName}
                </span>
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-[8px] font-black rounded uppercase shrink-0">
                  Owner
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">Group Founder</span>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {activeTab === "feed" && events.length > 0 && (
        <div className="p-6 glass rounded-3xl space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              Upcoming Event
            </h4>
            <button
              onClick={onViewAllEvents}
              className="text-[10px] text-primary font-bold uppercase hover:underline"
            >
              View All
            </button>
          </div>
          <div className="bg-muted/10 border border-border rounded-2xl overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group">
            {events[0].image_path && (
              <div className="h-24 overflow-hidden">
                <img
                  src={`${ API_URL }${events[0].image_path}`}
                  alt="Event"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}
            <div className="p-4">
              <p className="text-[10px] text-primary font-black uppercase mb-1">
                {new Date(events[0].start_time).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })} • {new Date(events[0].start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm font-bold text-foreground mb-3 truncate">
                {events[0].title}
              </p>
              <div className="flex gap-2">
                <button className="flex-1 bg-primary text-black text-[10px] font-black py-2 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform">
                  GOING
                </button>
                <button className="flex-1 bg-muted/10 border border-border text-muted-foreground text-[10px] font-black py-2 rounded-xl hover:bg-muted/20 transition-colors">
                  MAYBE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
