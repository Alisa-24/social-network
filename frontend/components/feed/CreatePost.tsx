"use client";

import { useRef, useState, useEffect } from "react";
import { Send, Image as ImageIcon, X, Globe, Users, Lock, ChevronDown, Video, Check } from "lucide-react";
import { createPost, getMyFollowers, type Follower } from "@/lib/posts";
import { API_URL } from "@/lib/config";
import type { User } from "@/lib/interfaces";

interface Props {
  user: User;
  onPostCreated: () => void;
}

const PRIVACY_OPTIONS = [
  { value: "public",    label: "Public",        icon: Globe,  desc: "Everyone can see" },
  { value: "followers", label: "Private",       icon: Users,  desc: "Only your followers" },
  { value: "selected",  label: "Close Friends", icon: Lock,   desc: "Select specific people" },
];

const IMAGE_MAX = 10 * 1024 * 1024;
const VIDEO_MAX = 25 * 1024 * 1024;
const MAX_ASPECT_RATIO = 3.0;

function isVideoFile(file: File) { return file.type.startsWith("video/"); }

function checkAspectRatio(w: number, h: number): boolean {
  if (w === 0 || h === 0) return true;
  const r = w / h;
  return r <= MAX_ASPECT_RATIO && r >= 1 / MAX_ASPECT_RATIO;
}

function getImageDimensions(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ w: 1, h: 1 }); };
    img.src = url;
  });
}

function getVideoDimensions(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve({ w: video.videoWidth, h: video.videoHeight }); };
    video.onerror = () => { URL.revokeObjectURL(url); resolve({ w: 1, h: 1 }); };
    video.src = url;
  });
}

export default function CreatePost({ user, onPostCreated }: Props) {
  const [content, setContent]         = useState("");
  const [privacy, setPrivacy]         = useState("public");
  const [media, setMedia]             = useState<File | null>(null);
  const [preview, setPreview]         = useState<string | null>(null);
  const [mediaIsVideo, setMediaIsVideo] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  // Close-friends selector
  const [followers, setFollowers]         = useState<Follower[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [selectedFriends, setSelectedFriends]   = useState<Set<number>>(new Set());
  const [friendSearch, setFriendSearch]   = useState("");

  const fileRef     = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content]);

  // Load followers when "Close Friends" is selected
  useEffect(() => {
    if (privacy !== "selected") return;
    if (followers.length > 0) return;
    setLoadingFollowers(true);
    getMyFollowers().then(setFollowers).finally(() => setLoadingFollowers(false));
  }, [privacy, followers.length]);

  const currentPrivacy = PRIVACY_OPTIONS.find((o) => o.value === privacy)!;
  const PrivacyIcon = currentPrivacy.icon;

  const filteredFollowers = followers.filter((f) => {
    const q = friendSearch.toLowerCase();
    return (
      f.firstName.toLowerCase().includes(q) ||
      f.lastName.toLowerCase().includes(q) ||
      f.username.toLowerCase().includes(q)
    );
  });

  const toggleFriend = (id: number) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleMediaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVid = isVideoFile(file);
    if (file.size > (isVid ? VIDEO_MAX : IMAGE_MAX)) {
      setError(isVid ? "Video must be at most 25 MB" : "Photo/GIF must be at most 10 MB");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const { w, h } = isVid ? await getVideoDimensions(file) : await getImageDimensions(file);
    if (!checkAspectRatio(w, h)) {
      setError("Unsupported aspect ratio — please use a standard ratio (e.g. 16:9, 9:16, 4:3, 1:1). Max ratio is 3:1.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setError(null);
    setMedia(file);
    setMediaIsVideo(isVid);
    setPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMedia(null); setPreview(null); setMediaIsVideo(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const isPostDisabled =
    !media ||
    content.length > 500 ||
    submitting ||
    (privacy === "selected" && selectedFriends.size === 0);

  const handleSubmit = async () => {
    if (isPostDisabled) return;
    setSubmitting(true);
    setError(null);
    try {
      await createPost(
        content.trim(),
        privacy,
        media!,
        privacy === "selected" ? Array.from(selectedFriends) : undefined
      );
      setContent("");
      removeMedia();
      setSelectedFriends(new Set());
      setFriendSearch("");
      setPrivacy("public");
      onPostCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`What's on your mind, ${user.firstName}? (optional)`}
        rows={3}
        disabled={submitting}
        className={`w-full bg-background text-foreground border rounded-lg p-3 text-sm resize-none overflow-hidden outline-none placeholder:text-muted transition-colors ${
          content.length > 500
            ? "border-red-500 focus:ring-1 focus:ring-red-500"
            : "border-border focus:ring-1 focus:ring-primary"
        }`}
      />

      {/* Char counter */}
      {content.length > 0 && (
        <div className="flex justify-end mt-1 px-1">
          <p className={`text-xs ${content.length > 500 ? "text-red-500" : "text-foreground/30"}`}>
            {content.length}/500
          </p>
        </div>
      )}

      {/* Media preview */}
      {preview && (
        <div className="relative w-fit mt-2">
          {mediaIsVideo
            ? <video src={preview} controls className="max-h-40 rounded-lg border border-border" />
            : <img src={preview} alt="preview" className="max-h-40 rounded-lg object-cover border border-border" />}
          <button type="button" onClick={removeMedia}
            className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 border border-border hover:bg-background">
            <X className="w-3 h-3 text-foreground" />
          </button>
        </div>
      )}

      {!media && (
        <p className="text-xs text-foreground/40 mt-2">
          A photo, GIF, or video is required · Max 10 MB for images/GIFs, 25 MB for videos
        </p>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {/* ── Close Friends selector ── */}
      {privacy === "selected" && (
        <div className="mt-3 border border-border rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-foreground/5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-semibold text-foreground">Choose Close Friends</p>
            </div>
            {selectedFriends.size > 0 && (
              <span className="text-xs font-medium text-primary">{selectedFriends.size} selected</span>
            )}
          </div>
          {/* Search */}
          <div className="px-3 py-2 border-b border-border">
            <input
              type="text"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
              placeholder="Search followers..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
            />
          </div>
          {/* List */}
          <div className="max-h-44 overflow-y-auto">
            {loadingFollowers ? (
              <div className="flex justify-center py-5">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : followers.length === 0 ? (
              <p className="text-xs text-foreground/30 text-center py-5">You have no followers yet</p>
            ) : filteredFollowers.length === 0 ? (
              <p className="text-xs text-foreground/30 text-center py-5">No results</p>
            ) : (
              filteredFollowers.map((f) => {
                const selected = selectedFriends.has(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleFriend(f.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-foreground/5 transition-colors"
                  >
                    {f.avatar ? (
                      <img src={`${API_URL}${f.avatar}`} alt={f.username}
                        className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-semibold text-foreground/60 shrink-0">
                        {f.firstName[0]}
                      </div>
                    )}
                    <span className="flex-1 text-left text-sm font-medium text-foreground">
                      {f.firstName} {f.lastName}
                      <span className="ml-1.5 text-xs text-foreground/40 font-normal">@{f.username}</span>
                    </span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected ? "bg-primary border-primary" : "border-foreground/30"
                    }`}>
                      {selected && <Check className="w-3 h-3 text-black" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {privacy === "selected" && selectedFriends.size === 0 && !loadingFollowers && followers.length > 0 && (
            <p className="text-xs text-amber-500 px-3 py-2 border-t border-border">
              Select at least one person to post for Close Friends
            </p>
          )}
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center gap-3 mt-3">
        {/* Add Media */}
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium transition-colors">
          {mediaIsVideo ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
          {media ? "Change Media" : <><span className="text-red-500 mr-0.5">*</span>Add Photo / Video</>}
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime"
          className="hidden" onChange={handleMediaChange} />

        {/* Privacy dropdown */}
        <div className="relative">
          <button type="button" onClick={() => setPrivacyOpen((o) => !o)}
            className="flex items-center gap-1.5 text-muted hover:text-foreground text-sm transition-colors">
            <PrivacyIcon className="w-4 h-4" />
            {currentPrivacy.label}
            <ChevronDown className="w-3 h-3" />
          </button>
          {privacyOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-52 bg-background border border-border rounded-xl shadow-xl z-20 overflow-hidden py-1">
              {PRIVACY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => { setPrivacy(opt.value); setPrivacyOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-foreground/5 transition-colors ${
                      privacy === opt.value ? "text-primary" : "text-foreground/70"
                    }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <div>
                      <p className={`font-medium leading-tight ${privacy === opt.value ? "text-primary" : ""}`}>{opt.label}</p>
                      <p className="text-[11px] text-foreground/40 leading-tight mt-0.5">{opt.desc}</p>
                    </div>
                    {privacy === opt.value && <Check className="w-4 h-4 ml-auto text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Post button */}
        <button type="button" onClick={handleSubmit} disabled={isPostDisabled}
          className="ml-auto bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2">
          {submitting ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Posting...</>
          ) : (
            <><Send className="w-4 h-4" />Post</>
          )}
        </button>
      </div>
    </div>
  );
}
