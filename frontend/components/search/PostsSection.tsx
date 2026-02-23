"use client";

import { ChevronRight } from "lucide-react";
import type { GroupPost } from "@/lib/groups/interface";
import PostCard from "@/components/groups/PostCard";

interface PostsSectionProps {
  posts: GroupPost[];
}

export default function PostsSection({ posts }: PostsSectionProps) {
  return (
    <section className="pb-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-tight">Recent Posts</h2>
        <button className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
          View All <ChevronRight size={14} />
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground italic">
        Posts search will be available soon.
      </p>
    </section>
  );
}
