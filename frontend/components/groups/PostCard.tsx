import { Heart, MessageSquare, Share2, MoreHorizontal } from "lucide-react";
import { GroupPost } from "@/lib/groups/interface";

interface PostCardProps {
  post: GroupPost;
  onLike?: (postId: number) => void;
  onComment?: (postId: number) => void;
  onShare?: (postId: number) => void;
}

export default function PostCard({ post, onLike, onComment, onShare }: PostCardProps) {
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (hours < 1) return "Just now";
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden hover:border-border/80 transition-colors">
      {/* Post Header */}
      <div className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
          {post.author?.Avatar ? (
            <div 
              className="w-full h-full rounded-full bg-cover bg-center"
              style={{ backgroundImage: `url(http://localhost:8080${post.author.Avatar})` }}
            />
          ) : (
            <span className="text-foreground font-bold text-sm">
              {post.author?.FirstName?.[0] || 'U'}{post.author?.LastName?.[0] || 'U'}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground truncate">
              {post.author?.FirstName || 'User'} {post.author?.LastName || ''}
            </span>
          </div>
          <span className="text-muted text-[11px]">
            {formatTimeAgo(post.created_at)}
            {post.location && ` • ${post.location}`}
          </span>
        </div>
        <button className="text-muted hover:text-foreground transition-colors shrink-0">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-4">
        <p className="text-foreground text-sm leading-relaxed mb-4 whitespace-pre-wrap">
          {post.content}
        </p>
        {post.image_path && (
          <div 
            className="w-full h-80 bg-surface bg-cover bg-center rounded-lg border border-border"
            style={{ backgroundImage: `url(http://localhost:8080${post.image_path})` }}
          />
        )}
      </div>

      {/* Post Actions */}
      <div className="border-t border-border p-3 flex gap-4">
        <button 
          onClick={() => onLike?.(post.id)}
          className="flex items-center gap-2 text-muted hover:text-primary transition-colors group"
        >
          <Heart 
            className={`w-5 h-5 transition-all ${
              post.is_liked 
                ? 'fill-primary text-primary' 
                : 'group-hover:scale-110'
            }`} 
          />
          <span className="text-xs font-bold">{post.likes || 0}</span>
        </button>
        <button 
          onClick={() => onComment?.(post.id)}
          className="flex items-center gap-2 text-muted hover:text-primary transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs font-bold">{post.comments || 0} Comments</span>
        </button>
        <button 
          onClick={() => onShare?.(post.id)}
          className="ml-auto flex items-center gap-2 text-muted hover:text-foreground transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
