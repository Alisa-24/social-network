"use client";

import { useState, useRef } from "react";
import { X, Calendar, Clock, MapPin, Image as ImageIcon, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { createGroupEvent } from "@/lib/groups/events";

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  onSuccess: () => void;
}

// Simple inline calendar component
function CalendarPicker({ 
  selectedDate, 
  onDateSelect, 
  onClose 
}: { 
  selectedDate: Date | null; 
  onDateSelect: (date: Date) => void;
  onClose: () => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());
  
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };
  
  const handleDateClick = (day: number) => {
    const selected = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (selected >= today) {
      onDateSelect(selected);
      onClose();
    }
  };
  
  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="aspect-square" />
      );
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      date.setHours(0, 0, 0, 0);
      const isToday = date.getTime() === today.getTime();
      const isSelected = selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
      const isPast = date < today;
      
      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          disabled={isPast}
          className={`
            aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
            ${isSelected 
              ? 'bg-primary text-black font-bold shadow-md' 
              : isToday
              ? 'border-2 border-primary text-primary hover:bg-primary/10'
              : isPast
              ? 'text-muted/30 cursor-not-allowed'
              : 'text-foreground hover:bg-background hover:border hover:border-border'
            }
          `}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };
  
  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-background rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="font-bold text-foreground">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </div>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-2 hover:bg-background rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-bold text-muted py-2">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>
    </div>
  );
}

export default function CreateEventModal({
  isOpen,
  onClose,
  groupId,
  onSuccess,
}: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [time, setTime] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
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

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!selectedDate) {
      setError("Please select a date");
      setLoading(false);
      return;
    }

    try {
      const result = await createGroupEvent({
        groupId,
        title,
        description,
        date: formatDate(selectedDate),
        time,
        imageFile: selectedImage || undefined,
      });

      if (result.success) {
        // Reset form
        setTitle("");
        setDescription("");
        setSelectedDate(null);
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
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none z-10" />
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-left text-foreground focus:ring-1 focus:ring-primary outline-none hover:bg-background/80 transition-colors"
                >
                  {selectedDate ? formatDisplayDate(selectedDate) : "Select date"}
                </button>
                {showCalendar && (
                  <CalendarPicker
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    onClose={() => setShowCalendar(false)}
                  />
                )}
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