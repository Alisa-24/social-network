"use client";

import { useRef, useState, useEffect } from "react";
import { Image as ImageIcon, X, Globe, Users, Lock, ChevronDown } from "lucide-react";
import { API_URL } from "@/lib/config";
import { createPost } from "@/lib/posts";
import type { User } from "@/lib/interfaces";

interface Props {
  user: User;
  onPostCreated: () => void;
}

const PRIVACY_OPTIONS = [
  { value: "public", label: "Public", icon: Globe },
  { value: "followers", label: "Private", icon: Users },
  { value: "selected", label: "Close Friends", icon: Lock },
];

export default function CreatePost({ user, onPostCreated }: Props) {
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image) return;
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

  return (
    <div className="bg-background border border-border rounded-xl p-4 shadow-sm">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="shrink-0">
            {user.avatar ? (
              <img
                src={`${API_URL}${user.avatar}`}
                alt={user.firstName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center border border-border font-semibold text-sm text-foreground/60">
                {user.firstName[0]}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`What's on your mind, ${user.firstName}?`}
              rows={2}
              maxLength={500}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-foreground/40 border-none focus:outline-none focus:ring-0 overflow-hidden"
            />

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

            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}

            {/* Divider */}
            <div className="border-t border-border mt-3 pt-3 flex items-center justify-between">
              {/* Left actions */}
              <div className="flex items-center gap-1">
                {/* Image upload */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="p-2 text-foreground/40 hover:text-primary rounded-full transition-colors"
                  title="Add photo"
                >
                  <ImageIcon className="w-5 h-5" />
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
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground/60 bg-foreground/5 dark:bg-foreground/10 rounded-full hover:bg-foreground/10 transition-colors"
                  >
                    <PrivacyIcon className="w-3.5 h-3.5" />
                    {currentPrivacy.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {privacyOpen && (
                    <div className="absolute top-full left-0 mt-2 w-40 bg-background border border-border rounded-xl shadow-xl z-20 overflow-hidden">
                      {PRIVACY_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setPrivacy(opt.value);
                              setPrivacyOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left hover:bg-foreground/5 transition-colors ${
                              privacy === opt.value
                                ? "text-primary font-medium"
                                : "text-foreground/70"
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
              </div>

              {/* Post button */}
              <button
                type="submit"
                disabled={(!content.trim() && !image) || submitting}
                className="bg-primary text-white px-5 py-1.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {submitting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
