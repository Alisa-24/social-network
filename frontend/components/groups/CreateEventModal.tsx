"use client";

import { useState, useRef } from "react";
import { X, Calendar, Clock, MapPin, Image as ImageIcon, Loader2 } from "lucide-react";
import { createGroupEvent } from "@/lib/groups/events";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  onSuccess: () => void;
}

export default function CreateEventModal({
  isOpen,
  onClose,
  groupId,
  onSuccess,
}: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createGroupEvent({
        groupId,
        title,
        description,
        date,
        time,
        imageFile: selectedImage || undefined,
      });

      if (result.success) {
        // Reset form
        setTitle("");
        setDescription("");
        setDate("");
        setTime("");
        removeImage();
        onSuccess();
        onClose();
      } else {
        setError(result.message || "Failed to create event");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
          <h2 className="text-xl font-bold text-foreground">Create Event</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-full transition-colors text-muted hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-foreground mb-1">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g., Weekly Coding Session"
              required
              maxLength={20}
            />
            <p className="text-xs text-muted mt-1 text-right">
              {title.length}/20
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none resize-none"
              placeholder="What is this event about?"
              rows={3}
              required
              maxLength={150}
            />
            <p className="text-xs text-muted mt-1 text-right">
              {description.length}/150
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-1">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none"
                  required
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-foreground mb-1">
                Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-foreground focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground mb-1">
              Cover Image (Optional)
            </label>
            
            {imagePreview ? (
              <div className="relative mt-2">
                <div
                  className="w-full h-40 bg-cover bg-center rounded-lg border border-border"
                  style={{ backgroundImage: `url(${imagePreview})` }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full transition-colors backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-background/50 transition-all group"
              >
                <ImageIcon className="w-8 h-8 text-muted group-hover:text-primary transition-colors mb-2" />
                <span className="text-sm text-muted group-hover:text-foreground">
                  Click to upload cover image
                </span>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground font-bold hover:bg-background transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary text-black rounded-lg font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
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
