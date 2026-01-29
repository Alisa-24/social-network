"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Group } from "@/lib/groups/interface";
import { fetchGroups, createGroup, requestToJoin } from "@/lib/groups/api";
import { on, off } from "@/lib/ws/ws";

export default function GroupsPage() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);

  useEffect(() => {
    loadGroups();

    // Listen for join request approval and rejection
    const handleJoinApproval = (data: any) => {
      console.log("Join request approved, refreshing groups...", data);
      loadGroups(); // Refresh groups when request is approved
    };

    const handleJoinRejection = (data: any) => {
      console.log("Join request rejected, refreshing groups...", data);
      loadGroups(); // Refresh groups when request is rejected
    };

    on("join_request_approved", handleJoinApproval);
    on("join_request_rejected", handleJoinRejection);

    return () => {
      off("join_request_approved", handleJoinApproval);
      off("join_request_rejected", handleJoinRejection);
    };
  }, []);

  const loadGroups = async () => {
    const data = await fetchGroups();
    if (data) {
      setUserGroups(data.userGroups);
      setAllGroups(data.allGroups);
    }
    setLoading(false);
  };

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCreating(true);

    const formData = new FormData(e.currentTarget);
    const result = await createGroup(formData);

    if (result.success) {
      setShowCreateModal(false);
      loadGroups(); // Refresh the groups list
      if (result.groupId) {
        router.push(`/groups/${result.groupId}`);
      }
    } else {
      (globalThis as any).addToast({
        id: Date.now().toString(),
        title: "Error",
        message: result.message || "Failed to create group",
        type: "error",
        duration: 5000,
      });
    }

    setIsCreating(false);
  };

  const handleJoinGroup = async (groupId: number) => {
    setJoiningGroupId(groupId);
    const result = await requestToJoin({ groupId });
    
    if (result.success) {
      (globalThis as any).addToast({
        id: Date.now().toString(),
        title: "Request Sent",
        message: "Your join request has been sent to the group owner",
        type: "success",
        duration: 5000,
      });
      loadGroups();
    } else {
      (globalThis as any).addToast({
        id: Date.now().toString(),
        title: "Error",
        message: result.message || "Failed to send join request",
        type: "error",
        duration: 5000,
      });
    }
    
    setJoiningGroupId(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-background text-foreground">
      {/* Page Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-8 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-foreground">Groups</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your communities and discover new ones.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              className="w-full bg-surface text-foreground border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
              placeholder="Search groups..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 text-sm transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>
      </header>

      <div className="p-8 space-y-12 w-full">
        {/* Your Groups Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <span className="w-2 h-6 bg-primary rounded-full"></span>
              Your Groups
            </h2>
            <a className="text-primary text-xs font-bold uppercase tracking-widest hover:underline" href="#">
              View All
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {userGroups.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-muted-foreground text-sm">You haven't joined any groups yet.</p>
              </div>
            ) : (
              userGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => router.push(`/groups/${group.id}`)}
                  className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="h-36 bg-linear-to-br from-primary/20 to-primary/5 relative overflow-hidden">
                    {group.cover_image_path && (
                      <img
                        src={`http://localhost:8080${group.cover_image_path}`}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-base text-foreground mb-2 line-clamp-1">{group.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Discover Groups Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <span className="w-2 h-6 bg-primary rounded-full"></span>
              Discover Groups
            </h2>
            <div className="flex gap-2">
              <select className="bg-surface border border-border rounded-lg text-xs font-bold text-foreground focus:ring-primary outline-none uppercase tracking-widest px-4 py-2">
                <option>Trending</option>
                <option>Newest</option>
                <option>Popular</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground text-sm">Loading groups...</p>
              </div>
            ) : allGroups.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground text-sm">No groups to discover yet.</p>
              </div>
            ) : (
              allGroups
                .filter((group) => {
                  // Exclude groups the user has already joined
                  const isJoined = userGroups.some((userGroup) => userGroup.id === group.id);
                  if (isJoined) return false;
                  
                  // Apply search filter
                  return (
                    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    group.description.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                })
                .map((group) => (
                  <div
                    key={group.id}
                    className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all group"
                  >
                    <div 
                      className="h-48 bg-linear-to-br from-primary/20 to-primary/5 relative overflow-hidden"
                    >
                      {group.cover_image_path && (
                        <img
                          src={`http://localhost:8080${group.cover_image_path}`}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="p-6">
                      <h3 
                        className="font-bold text-lg text-foreground mb-2 line-clamp-1"
                      >
                        {group.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-5">{group.description}</p>
                      <button 
                        onClick={() => handleJoinGroup(group.id)}
                        disabled={joiningGroupId === group.id || group.has_pending_request}
                        className={`w-full font-bold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          group.has_pending_request
                            ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/50"
                            : "bg-primary/10 hover:bg-primary text-primary hover:text-black"
                        }`}
                      >
                        {joiningGroupId === group.id 
                          ? "Requesting..." 
                          : group.has_pending_request 
                            ? "Pending" 
                            : "Request to Join"}
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface text-foreground border border-border w-full max-w-lg rounded-xl shadow-2xl p-8 transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic tracking-tight uppercase">Create New Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Group Title
                </label>
                <input
                  name="name"
                  className="w-full bg-background text-foreground border border-border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-muted-foreground"
                  placeholder="Enter a distinctive name..."
                  type="text"
                  maxLength={20}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  className="w-full bg-background text-foreground border border-border rounded-lg px-4 py-3 focus:ring-1 focus:ring-primary outline-none transition-all resize-none placeholder:text-muted-foreground"
                  placeholder="What is this community about?"
                  rows={4}
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Cover Image (Optional)
                </label>
                <input
                  type="file"
                  name="coverImage"
                  accept="image/*"
                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-border text-foreground hover:bg-muted-foreground/10 font-bold py-3 rounded-lg transition-all"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90 text-black font-black py-3 rounded-lg transition-all uppercase tracking-tighter disabled:opacity-50"
                  disabled={isCreating}
                >
                  {isCreating ? "Creating..." : "Launch Community"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}