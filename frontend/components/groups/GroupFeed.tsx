import { useState, useRef } from "react";
import { Send, Image as ImageIcon, X } from "lucide-react";
import PostCard from "@/components/groups/PostCard";
import { GroupPost, Group } from "@/lib/groups/interface";
import { User } from "@/lib/interfaces";
import { createGroupPost } from "@/lib/groups/api";

interface GroupFeedProps {
  group: Group;
  posts: GroupPost[];
  currentUser: User | null;
  onPostCreated: () => void;
  onPostDeleted: (postId: number) => void;
}

export default function GroupFeed({
  group,
  posts,
  currentUser,
  onPostCreated,
  onPostDeleted,
}: GroupFeedProps) {
  const [newPost, setNewPost] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    setIsCreatingPost(true);
    try {
      const result = await createGroupPost(
        group.id,
        newPost,
        selectedImage || undefined,
      );

      if (result.success) {
        setNewPost("");
        setSelectedImage(null);
        setImagePreview(null);
        onPostCreated();
      } else {
        alert(result.message || "Failed to create post");
      }
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post");
    } finally {
      setIsCreatingPost(false);
    }
  };

  return (
    <>
      {/* Create Post */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <textarea
          className="w-full bg-background text-foreground border border-border rounded-lg p-3 text-sm resize-none focus:ring-1 focus:ring-primary outline-none placeholder:text-muted"
          placeholder="Share something with the group..."
          rows={3}
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
        />

        {/* Image Preview */}
        {imagePreview && (
          <div className="mt-3 relative">
            <div
              className="w-full h-64 bg-surface bg-cover bg-center rounded-lg border border-border"
              style={{ backgroundImage: `url(${imagePreview})` }}
            />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background text-foreground p-2 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mt-3">
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-muted hover:text-primary transition-colors text-sm"
            >
              <ImageIcon className="w-5 h-5" />
              {selectedImage ? "Change Image" : "Add Image"}
            </button>
          </div>
          <button
            onClick={handleCreatePost}
            disabled={!newPost.trim() || isCreatingPost}
            className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-black px-6 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isCreatingPost ? "Posting..." : "Post"}
          </button>
        </div>
      </div>

      {/* Posts Feed */}
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUser?.userId}
          groupOwnerId={group.owner_id}
          onDelete={async (postId) => {
            onPostDeleted(postId);
          }}
        />
      ))}
    </>
  );
}
