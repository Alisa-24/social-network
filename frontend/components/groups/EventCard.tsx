import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { GroupEvent } from "@/lib/groups/interface";

interface EventCardProps {
  event: GroupEvent;
  onResponseChange?: (eventId: number, response: "going" | "not-going") => void;
}

export default function EventCard({ event, onResponseChange }: EventCardProps) {
  const eventDate = new Date(event.start_time);
  const eventTime = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden hover:border-border/80 transition-colors">
      {/* Event Image */}
      {event.image_path && (
        <div 
          className="h-48 bg-surface bg-cover bg-center"
          style={{ backgroundImage: `url(${event.image_path})` }}
        />
      )}

      {/* Event Details */}
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="shrink-0 w-14 h-14 bg-primary/10 rounded-lg flex flex-col items-center justify-center border border-primary/20">
            <span className="text-primary text-xs font-bold uppercase">
              {eventDate.toLocaleDateString('en-US', { month: 'short' })}
            </span>
            <span className="text-foreground text-xl font-bold">
              {eventDate.getDate()}
            </span>
          </div>

          {/* Event Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2">
              {event.title}
            </h3>
            <div className="flex items-center gap-3 text-muted text-xs mb-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{eventTime}</span>
              </div>
            </div>
            <p className="text-sm text-muted line-clamp-2">{event.description}</p>
          </div>
        </div>

        {/* Response Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={() => onResponseChange?.(event.id, "going")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              event.user_response === "going"
                ? "bg-primary text-black shadow-lg shadow-primary/20"
                : "bg-background border border-border text-foreground hover:border-primary/50"
            }`}
          >
            Going ({event.going_count || 0})
          </button>
          <button 
            onClick={() => onResponseChange?.(event.id, "not-going")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              event.user_response === "not-going"
                ? "bg-red-500/20 text-red-500 border border-red-500/50"
                : "bg-background border border-border text-muted hover:text-foreground hover:border-red-500/30"
            }`}
          >
            Not Going ({event.not_going_count || 0})
          </button>
        </div>
      </div>
    </div>
  );
}
