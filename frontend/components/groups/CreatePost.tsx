import { useState } from "react";
import { Send } from "lucide-react";

interface CreatePostProps {
  onSubmit: (content: string, imagePath?: string, location?: string) => Promise<void>;
  placeholder?: string;
}

export default function CreatePost({ 
  onSubmit, 
  placeholder = "Share something with the group..." 
}: CreatePostProps) {
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(content, undefined, location || undefined);
      setContent("");
      setLocation("");
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <textarea
        className="w-full bg-background text-foreground border border-border rounded-lg p-3 text-sm resize-none focus:ring-1 focus:ring-primary outline-none placeholder:text-muted"
        placeholder={placeholder}
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isSubmitting}
      />
      
      <div className="flex items-center gap-3 mt-3">
        <input
          type="text"
          placeholder="Add location (optional)"
          className="flex-1 bg-background text-foreground border border-border rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary outline-none placeholder:text-muted"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={isSubmitting}
        />
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-black px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Post
            </>
          )}
        </button>
      </div>
    </div>
  );
}
