"use client";

import type { UserSearchResult } from "@/lib/users/search";
import UserCard from "./UserCard";

interface PeopleSectionProps {
  query: string;
  loadingUsers: boolean;
  userResults: UserSearchResult[];
}

export default function PeopleSection({
  query,
  loadingUsers,
  userResults,
}: PeopleSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-tight">
          {query ? "People" : "Suggested People"}
        </h2>
      </div>

      {loadingUsers ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-muted rounded-2xl h-52 animate-pulse"
            />
          ))}
        </div>
      ) : userResults.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">
          No people found for &quot;{query}&quot;.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {userResults.map((u) => (
            <UserCard key={u.userId} user={u} />
          ))}
        </div>
      )}
    </section>
  );
}
