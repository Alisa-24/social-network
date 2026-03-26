"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Globe, Users, Lock } from "lucide-react";
import { API_URL } from "@/lib/config";
import { createPost } from "@/lib/posts";
import type { User } from "@/lib/interfaces";

interface Props {
  user: User;
  onPostCreated: () => void;
}

const PRIVACY_OPTIONS = [
  { value: "public", label: "Everyone", icon: Globe },
  { value: "followers", label: "Followers", icon: Users },
  { value: "selected", label: "Only me", icon: Lock },
];

export default function CreatePost({ user, onPostCreated }: Props) {
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    if (!content.trim()) return;
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

  const currentPrivacy = PRIVACY_OPTIONS.find((o) => o.value === privacy)!;
  const PrivacyIcon = currentPrivacy.icon;

  return (
    <div className="border border-border rounded-lg bg-background p-4">
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
              <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center border border-border text-foreground/60 font-semibold text-sm">
                {user.firstName[0]}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex-1 flex flex-col gap-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`What's on your mind, ${user.firstName}?`}
              rows={3}
              maxLength={500}
              className="w-full resize-none bg-foreground/5 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 border border-transparent focus:border-border focus:outline-none"
            />

            {/* Image preview */}
            {preview && (
              <div className="relative w-fit">
                <img
                  src={preview}
                  alt="preview"
                  className="max-h-48 rounded-lg object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-background border border-border"
                >
                  <X className="w-3.5 h-3.5 text-foreground" />
                </button>
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            {/* Actions row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Image upload */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-foreground/5"
                >
                  <ImagePlus className="w-4 h-4" />
                  Photo
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />

                {/* Privacy selector */}
                <div className="relative">
                  <select
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value)}
                    className="appearance-none flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground bg-transparent pl-6 pr-2 py-1 rounded-md hover:bg-foreground/5 cursor-pointer focus:outline-none"
                  >
                    {PRIVACY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <PrivacyIcon className="w-3.5 h-3.5 text-foreground/60 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground/40">
                  {content.length}/500
                </span>
                <button
                  type="submit"
                  disabled={!content.trim() || submitting}
                  className="px-4 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-40 hover:opacity-80 transition-opacity"
                >
                  {submitting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
