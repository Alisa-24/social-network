import { useState } from "react";
import { Calendar, Clock, User as UserIcon, XCircle, Trash2 } from "lucide-react";
import { Group, GroupEvent } from "@/lib/groups/interface";
import { respondToEvent, deleteGroupEvent } from "@/lib/groups/api";
import { User as AuthUser } from "@/lib/interfaces";
import ConfirmModal from "@/components/ui/confirm";

interface GroupEventsProps {
  events: GroupEvent[];
  group: Group;
  currentUser: AuthUser | null;
  onCreateEvent: () => void;
  onViewVoters: (eventId: any, title: string) => void;
  onEventDeleted?: (eventId: number) => void;
}

export default function GroupEvents({
  events,
  group,
  currentUser,
  onCreateEvent,
  onViewVoters,
  onEventDeleted,
}: GroupEventsProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<GroupEvent | null>(null);

  const handleDeleteConfirm = async () => {
    if (!eventToDelete) return;
    
    setDeletingId(eventToDelete.id);
    try {
      const res = await deleteGroupEvent(eventToDelete.id);
      if (res.success) {
        onEventDeleted?.(eventToDelete.id);
        setShowDeleteModal(false);
        setEventToDelete(null);
      } else {
        alert(res.message || "Failed to delete event");
      }
    } finally {
      setDeletingId(null);
    }
  };
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
        [...events]
          .sort((a, b) => {
            const now = new Date().getTime();
            const timeA = new Date(a.start_time).getTime();
            const timeB = new Date(b.start_time).getTime();
            
            const isPassedA = timeA < now;
            const isPassedB = timeB < now;

            if (isPassedA && !isPassedB) return 1;
            if (!isPassedA && isPassedB) return -1;
            
            return timeA - timeB;
          })
          .map((event) => {
            const eventDate = new Date(event.start_time);
            const isPassed = eventDate.getTime() < new Date().getTime();
            const eventTime = eventDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            return (
              <div
                key={event.id}
                className={`bg-surface border border-border rounded-xl overflow-hidden transition-opacity ${
                  isPassed ? "opacity-60 grayscale-[0.3]" : ""
                }`}
              >
                {event.image_path && (
                  <div className="relative">
                    <div
                      className="h-48 bg-surface bg-cover bg-center"
                      style={{
                        backgroundImage: `url(http://localhost:8080${event.image_path})`,
                      }}
                    />
                    {isPassed && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="bg-red-500 text-white px-4 py-1.5 rounded-full font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-xl">
                          <XCircle className="w-4 h-4" />
                          Passed
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="p-5">
                  {!event.image_path && isPassed && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-1.5 rounded-lg font-black uppercase text-[10px] tracking-widest flex items-center gap-2 w-fit">
                      <XCircle className="w-3.5 h-3.5" />
                      Passed Event
                    </div>
                  )}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`shrink-0 w-14 h-14 rounded-lg flex flex-col items-center justify-center border ${
                      isPassed ? "bg-muted/10 border-muted/20" : "bg-primary/10 border-primary/20"
                    }`}>
                      <span className={`text-xs font-bold uppercase ${isPassed ? "text-muted" : "text-primary"}`}>
                        {eventDate.toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </span>
                      <span className={`text-xl font-bold ${isPassed ? "text-muted" : "text-foreground"}`}>
                        {eventDate.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className={`text-lg font-bold ${isPassed ? "text-muted" : "text-foreground"} truncate`}>
                          {event.title}
                        </h3>
                        {(group.is_owner || event.creator_id === currentUser?.userId) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEventToDelete(event);
                              setShowDeleteModal(true);
                            }}
                            disabled={deletingId === event.id}
                            className="text-muted hover:text-red-500 transition-colors shrink-0 disabled:opacity-50"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-muted text-xs mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{eventTime}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted">{event.description}</p>
                    {event.creator && (
                      <div className="flex items-center gap-2 mt-3 p-1.5 bg-background rounded-lg border border-border w-fit">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-muted">
                          {event.creator.avatar ? (
                            <img 
                              src={`http://localhost:8080${event.creator.avatar}`} 
                              alt={event.creator.firstName} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-foreground/10 text-foreground/60">
                              <UserIcon className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          By <span className="font-bold text-foreground">{event.creator.firstName} {event.creator.lastName}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!group.is_member) return;
                      const newResponse = event.user_response === "going" ? "" : "going";
                      await respondToEvent(event.id, newResponse);
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
                      const newResponse = event.user_response === "not-going" ? "" : "not-going";
                      await respondToEvent(event.id, newResponse);
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

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (deletingId === null) {
            setShowDeleteModal(false);
            setEventToDelete(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Event"
        message={`Are you sure you want to delete "${eventToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Event"
        confirmVariant="danger"
        isLoading={deletingId !== null}
      />
    </div>
  );
}
