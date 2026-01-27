import { useState } from "react";
import { X, Calendar as CalendarIcon, Clock } from "lucide-react";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, date: string, time: string) => Promise<void>;
}

export default function CreateEventModal({ isOpen, onClose, onSubmit }: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !date || !time || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(title, description, date, time);
      // Reset form
      setTitle("");
      setDescription("");
      setDate("");
      setTime("");
      onClose();
    } catch (error) {
      console.error("Failed to create event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl max-w-lg w-full">
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-foreground">Create Event</h3>
            <p className="text-sm text-muted mt-1">
              Plan an event for your group members
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
              Event Title
            </label>
            <input
              type="text"
              placeholder="e.g., Monthly Meetup"
              className="w-full bg-background text-foreground border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none placeholder:text-muted"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
              Description
            </label>
            <textarea
              placeholder="What's this event about?"
              className="w-full bg-background text-foreground border border-border rounded-lg px-4 py-2 text-sm resize-none focus:ring-1 focus:ring-primary outline-none placeholder:text-muted"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
                <CalendarIcon className="w-3 h-3 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                className="w-full bg-background text-foreground border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-widest mb-2">
                <Clock className="w-3 h-3 inline mr-1" />
                Time
              </label>
              <input
                type="time"
                className="w-full bg-background text-foreground border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-background border border-border text-foreground px-4 py-2 rounded-lg font-bold text-sm hover:bg-surface transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors disabled:bg-muted disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create Event"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
