"use client";

import { useRef, useState, useEffect } from "react";
import { Send, Image as ImageIcon, X, Globe, Users, Lock, ChevronDown } from "lucide-react";
import { createPost } from "@/lib/posts";
import type { User } from "@/lib/interfaces";

interface Props {
  user: User;
  onPostCreated: () => void;
}

const PRIVACY_OPTIONS = [
  { value: "public",    label: "Public",        icon: Globe  },
  { value: "followers", label: "Private",       icon: Users  },
  { value: "selected",  label: "Close Friends", icon: Lock   },
];

export default function CreatePost({ user, onPostCreated }: Props) {
  const [content, setContent]     = useState("");
  const [privacy, setPrivacy]     = useState("public");
  const [image, setImage]         = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const fileRef     = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  const currentPrivacy = PRIVACY_OPTIONS.find((o) => o.value === privacy)!;
  const PrivacyIcon = currentPrivacy.icon;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !image) || content.length > 500 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createPost(content.trim(), privacy, image ?? undefined);
      setContent("");
      removeImage();
      onPostCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setSubmitting(false);
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
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`What's on your mind, ${user.firstName}?`}
        rows={3}
        disabled={submitting}
        className={`w-full bg-background text-foreground border rounded-lg p-3 text-sm resize-none overflow-hidden outline-none placeholder:text-muted transition-colors ${
          content.length > 500
            ? "border-red-500 focus:ring-1 focus:ring-red-500"
            : "border-border focus:ring-1 focus:ring-primary"
        }`}
      />

      {/* Char counter + error for post */}
      {content.length > 0 && (
        <div className="flex items-center justify-between mt-1 px-1">
          {content.length > 500 ? (
            <p className="text-xs text-red-500">Content must be at most 500 characters</p>
          ) : content.length >= 400 ? (
            <p className="text-xs text-foreground/40">{500 - content.length} characters remaining</p>
          ) : (
            <span />
          )}
          <p className={`text-xs ml-auto ${content.length > 500 ? "text-red-500" : "text-foreground/30"}`}>
            {content.length}/500
          </p>
        </div>
      )}

      {/* Image preview */}
      {preview && (
        <div className="relative w-fit mt-2">
          <img
            src={preview}
            alt="preview"
            className="max-h-40 rounded-lg object-cover border border-border"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 border border-border hover:bg-background"
          >
            <X className="w-3 h-3 text-foreground" />
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {/* Bottom row */}
      <div className="flex items-center gap-3 mt-3">
        {/* Add Image */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 text-muted hover:text-foreground text-sm transition-colors"
        >
          <ImageIcon className="w-4 h-4" />
          Add Image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />

        {/* Privacy dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setPrivacyOpen((o) => !o)}
            className="flex items-center gap-1.5 text-muted hover:text-foreground text-sm transition-colors"
          >
            <PrivacyIcon className="w-4 h-4" />
            {currentPrivacy.label}
            <ChevronDown className="w-3 h-3" />
          </button>

          {privacyOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-44 bg-background border border-border rounded-xl shadow-xl z-20 overflow-hidden py-1">
              {PRIVACY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setPrivacy(opt.value); setPrivacyOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-foreground/5 transition-colors ${
                      privacy === opt.value ? "text-primary font-medium" : "text-foreground/70"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Post button — pushed to the right */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={(!content.trim() && !image) || content.length > 500 || submitting}
          className="ml-auto bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-black px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
        >
          {submitting ? (
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
