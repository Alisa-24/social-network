import { Heart, MessageSquare, Share2, MoreHorizontal, Trash2, UserIcon } from "lucide-react";
import { GroupPost } from "@/lib/groups/interface";
import { useState, useEffect, useRef } from "react";
import { togglePostLike, deletePost } from "@/lib/groups/posts";
import ConfirmModal from "@/components/ui/confirm";
import { API_URL } from "@/lib/config";

interface PostCardProps {
  post: GroupPost;
  onLike?: (postId: number) => void;
  onComment?: (postId: number) => void;
  onShare?: (postId: number) => void;
  onDelete?: (postId: number) => void;
  currentUserId?: number; // To check if user can delete
  groupOwnerId?: number; // To check if user is group owner
}

export default function PostCard({ 
  post, 
  onLike, 
  onComment, 
  onShare,
  onDelete,
  currentUserId,
  groupOwnerId
}: PostCardProps) {
  const [imageError, setImageError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(post.is_liked ?? false);
  const [likesCount, setLikesCount] = useState(post.likes ?? 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside or ESC key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showMenu]);

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (hours < 1) return "Just now";
      if (hours === 1) return "1 hour ago";
      if (hours < 24) return `${hours} hours ago`;
      const days = Math.floor(hours / 24);
      if (days === 1) return "1 day ago";
      if (days < 7) return `${days} days ago`;
      const weeks = Math.floor(days / 7);
      if (weeks === 1) return "1 week ago";
      if (weeks < 4) return `${weeks} weeks ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return "Recently";
    }
  };


  const getAuthorFullName = () => {
    // Handle both old (capitalized) and new (lowercase) field names
    const firstName = post.author?.firstName || post.author?.FirstName || 'User';
    const lastName = post.author?.lastName || post.author?.LastName || '';
    return `${firstName} ${lastName}`.trim();
  };

  const getAuthorUsername = () => {
    return post.author?.username || post.author?.Username || 'user';
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleAvatarError = () => {
    setAvatarError(true);
  };

  const getAuthorAvatar = () => {
    return post.author?.avatar || post.author?.Avatar || '';
  };

  const handleLike = async () => {
    if (isLiking) return; // Prevent multiple clicks

    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likesCount;
    
    setIsLiked(!previousLiked);
    setLikesCount(previousLiked ? previousCount - 1 : previousCount + 1);
    setIsLiking(true);

    try {
      // Send to server
      const response = await togglePostLike(post.id);
      
      if (response.success) {
        // Update with server response
        setIsLiked(response.is_liked ?? !previousLiked);
        setLikesCount(response.likes ?? (previousLiked ? previousCount - 1 : previousCount + 1));
        
        // Call parent callback if provided
        onLike?.(post.id);
      } else {
        // Revert on failure
        setIsLiked(previousLiked);
        setLikesCount(previousCount);
      }
    } catch (error) {
      // Revert on error
      console.error('Failed to like post:', error);
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      
      // Optional: Show error notification
      // toast.error('Failed to like post');
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Post by ${getAuthorFullName()}`,
      text: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
      url: `${window.location.origin}/groups/${post.group_id}/posts/${post.id}`
    };

    try {
      // Try native share API first (works on mobile and some desktop browsers)
      if (navigator.share) {
        await navigator.share(shareData);
        onShare?.(post.id);
      } else {
        // Fallback to copying link to clipboard
        await navigator.clipboard.writeText(shareData.url);
        onShare?.(post.id);
        
        // Show success notification
        (globalThis as any).addToast({
          id: Date.now().toString(),
          title: "Link Copied",
          message: "Post link copied to clipboard",
          type: "success",
          duration: 3000,
        });
      }
    } catch (error) {
      // User cancelled share or clipboard failed
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await deletePost(post.id);
      
      if (response.success) {
        onDelete?.(post.id);
        (globalThis as any).addToast({
          id: Date.now().toString(),
          title: "Post Deleted",
          message: "The post has been deleted successfully",
          type: "success",
          duration: 3000,
        });
      } else {
        (globalThis as any).addToast({
          id: Date.now().toString(),
          title: "Error",
          message: "Failed to delete post. Please try again.",
          type: "error",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      (globalThis as any).addToast({
        id: Date.now().toString(),
        title: "Error",
        message: "Failed to delete post. Please try again.",
        type: "error",
        duration: 5000,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Check if current user can delete this post (post author or group owner)
  const canDelete = currentUserId && (
    currentUserId === post.user_id || 
    currentUserId === post.author?.ID ||
    (groupOwnerId && currentUserId === groupOwnerId)
  );

  return (
    <article className="bg-surface border border-border rounded-xl overflow-hidden hover:border-border/80 transition-colors">
      {/* Post Header */}
      <header className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 overflow-hidden">
          {getAuthorAvatar() && !avatarError ? (
            <img
              src={`${API_URL}${getAuthorAvatar()}`}
              alt={`${getAuthorFullName()}'s avatar`}
              className="w-full h-full object-cover"
              onError={handleAvatarError}
            />
          ) : (
            <UserIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-sm font-bold text-foreground shrink-0">
              {getAuthorFullName()}
            </h3>
            <span className="text-[11px] text-muted shrink-0 italic">
              @{getAuthorUsername()}
            </span>
          </div>
          <p className="text-muted text-[11px]">
            {formatTimeAgo(post.created_at)}
            {post.location && ` • ${post.location}`}
          </p>
        </div>
        {canDelete && (
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              aria-label="More options"
              className="text-muted hover:text-foreground transition-colors shrink-0 p-1 rounded-lg hover:bg-surface-hover"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-10 min-w-37.5">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Deleting...' : 'Delete Post'}
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Post Content */}
      <div className="px-4 pb-4">
        {post.content && (
          <p className="text-foreground text-sm leading-relaxed mb-4 whitespace-pre-wrap wrap-break-words">
            {post.content}
          </p>
        )}
        {post.image_path && !imageError && (
          <div className="relative w-full rounded-lg overflow-hidden border border-border bg-surface">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img
              src={`${ API_URL }${post.image_path}`}
              alt="Post image"
              className={`w-full h-auto max-h-125 object-cover transition-opacity ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Post Actions */}
      <footer className="border-t border-border p-3 flex gap-4">
        <button 
          onClick={handleLike}
          disabled={isLiking}
          aria-label={isLiked ? "Unlike post" : "Like post"}
          aria-pressed={isLiked}
          className="flex items-center gap-2 text-muted hover:text-primary transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Heart 
            className={`w-5 h-5 transition-all ${
              isLiked 
                ? 'fill-primary text-primary' 
                : 'group-hover:scale-110'
            }`} 
          />
          <span className="text-xs font-bold">
            {likesCount > 0 ? likesCount : ''}
          </span>
        </button>
        <button 
          onClick={() => onComment?.(post.id)}
          aria-label={`View ${post.comments ?? 0} comments`}
          className="flex items-center gap-2 text-muted hover:text-primary transition-colors group"
        >
          <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold">
            {(post.comments ?? 0) > 0 ? `${post.comments ?? 0}` : '0'}
          </span>
        </button>
        <button 
          onClick={handleShare}
          aria-label="Share post"
          className="ml-auto flex items-center gap-2 text-muted hover:text-foreground transition-colors group"
        >
          <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </footer>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </article>
  );
}