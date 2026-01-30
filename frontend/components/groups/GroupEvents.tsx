import { Calendar, Clock } from "lucide-react";
import { Group, GroupEvent } from "@/lib/groups/interface";
import { respondToEvent } from "@/lib/groups/api";

interface GroupEventsProps {
  events: GroupEvent[];
  group: Group;
  onCreateEvent: () => void;
  onViewVoters: (eventId: number, title: string) => void;
}

export default function GroupEvents({
  events,
  group,
  onCreateEvent,
  onViewVoters,
}: GroupEventsProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-surface border border-border p-4 rounded-xl">
        <h3 className="text-lg font-bold text-foreground">Upcoming Events</h3>
        {group.is_member && (
          <button
            onClick={onCreateEvent}
            className="bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Create Event
          </button>
        )}
      </div>
      {events.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <Calendar className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-muted">No upcoming events</p>
        </div>
      ) : (
        events.map((event) => {
          const eventDate = new Date(event.start_time);
          const eventTime = eventDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
          return (
            <div
              key={event.id}
              className="bg-surface border border-border rounded-xl overflow-hidden"
            >
              {event.image_path && (
                <div
                  className="h-48 bg-surface bg-cover bg-center"
                  style={{
                    backgroundImage: `url(http://localhost:8080${event.image_path})`,
                  }}
                />
              )}
              <div className="p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="shrink-0 w-14 h-14 bg-primary/10 rounded-lg flex flex-col items-center justify-center border border-primary/20">
                    <span className="text-primary text-xs font-bold uppercase">
                      {eventDate.toLocaleDateString("en-US", {
                        month: "short",
                      })}
                    </span>
                    <span className="text-foreground text-xl font-bold">
                      {eventDate.getDate()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-3 text-muted text-xs mb-2">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{eventTime}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted">{event.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!group.is_member) return;
                      await respondToEvent(event.id, "going");
                    }}
                    disabled={!group.is_member}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      event.user_response === "going"
                        ? "bg-primary text-black shadow-lg shadow-primary/20"
                        : "bg-background border border-border text-foreground hover:border-primary/50"
                    } ${!group.is_member ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    Going ({event.going_count || 0})
                  </button>
                  <button
                    onClick={async () => {
                      if (!group.is_member) return;
                      await respondToEvent(event.id, "not-going");
                    }}
                    disabled={!group.is_member}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                      event.user_response === "not-going"
                        ? "bg-red-500/20 text-red-500 border border-red-500/50"
                        : "bg-background border border-border text-muted hover:text-foreground"
                    } ${!group.is_member ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    Not Going ({event.not_going_count || 0})
                  </button>
                </div>
                <button
                  onClick={() => onViewVoters(event.id, event.title)}
                  className="w-full mt-2 py-1.5 text-xs text-muted hover:text-primary transition-colors hover:underline"
                >
                  See who voted
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
