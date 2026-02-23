"use client";

import { Search, X } from "lucide-react";

type FilterTab = "all" | "people" | "groups" | "posts";

interface SearchSectionProps {
  query: string;
  setQuery: (q: string) => void;
  activeTab: FilterTab;
  setActiveTab: (t: FilterTab) => void;
  tabs: { key: FilterTab; label: string }[];
}

export default function SearchSection({
  query,
  setQuery,
  activeTab,
  setActiveTab,
  tabs,
}: SearchSectionProps) {
  return (
    <section className="flex flex-col gap-6">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="text-primary" size={16} />
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-10 pr-4 py-2.5 bg-surface border-2 border-transparent focus:border-primary/50 focus:ring-0 rounded-xl text-sm transition-all placeholder:text-muted-foreground outline-none"
          placeholder="Search people, groups, or posts…"
          type="text"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl px-6 text-sm font-bold transition-colors ${
              activeTab === t.key
                ? "bg-primary text-black"
                : "bg-surface text-muted-foreground hover:bg-muted border border-border"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </section>
  );
}
