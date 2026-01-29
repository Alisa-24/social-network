"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Home, Users, Compass, MessageSquare, Settings, 
  MoreHorizontal, Heart, Share2, UserPlus, LogOut,
  Calendar, MapPin, Clock, Send, ArrowLeft, Image as ImageIcon, X
} from "lucide-react";
import { fetchGroupDetail, createGroupPost, fetchGroupPosts, leaveGroup, deleteGroup } from "@/lib/groups/api";
import { GroupPost, GroupEvent } from "@/lib/groups/interface";
import PostCard from "@/components/groups/PostCard";
import JoinRequests from "@/components/groups/JoinRequests";
import { getCurrentUser } from "@/lib/auth/auth";
import { User } from "@/lib/interfaces";
import ConfirmModal from "@/components/ui/confirm";

interface Group {
  id: number;
  name: string;
  description: string;
  cover_image_path: string;
  owner_id: number;
  created_at: string;
  members_count?: number;
  is_public?: boolean;
  is_member?: boolean;
  is_owner?: boolean;
}

interface Creator {
  ID: number;
  FirstName: string;
  LastName: string;
  Avatar: string;
  Role: "owner";
  JoinedAt: string;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [activeTab, setActiveTab] = useState<"feed" | "events" | "chat">("feed");
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPost, setNewPost] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadGroupData();
    loadCurrentUser();
  }, [groupId]);

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const loadGroupData = async () => {
    try {
      setError(null);
      console.log("Fetching group with ID:", groupId);
      const data = await fetchGroupDetail(parseInt(groupId));
      console.log("Received data:", data);
      
      // Check for specific error responses
      if (data && (data as any).error) {
        setError((data as any).error);
        return;
      }
      
      if (data && data.group) {
        console.log("Group data:", data.group);
        const groupData = data.group;
        
        // Set group without posts/events (those are set separately)
        setGroup({
          id: groupData.id,
          name: groupData.name,
          description: groupData.description,
          cover_image_path: groupData.cover_image_path,
          owner_id: groupData.owner_id,
          created_at: groupData.created_at,
          members_count: groupData.members_count,
          is_member: groupData.is_member,
          is_owner: groupData.is_owner,
        });

        // Set creator details from API response
        if (groupData.owner) {
          setCreator({
            ID: groupData.owner.userId,
            FirstName: groupData.owner.firstName,
            LastName: groupData.owner.lastName,
            Avatar: groupData.owner.avatar || "",
            Role: "owner",
            JoinedAt: groupData.created_at,
          });
        } else {
          // Fallback if owner data not available
          setCreator({
            ID: groupData.owner_id,
            FirstName: "Group",
            LastName: "Owner",
            Avatar: "",
            Role: "owner",
            JoinedAt: groupData.created_at,
          });
        }

        // Set events from API with defaults
        const eventsWithDefaults = (groupData.events || []).map(event => ({
          ...event,
          going_count: event.going_count || 0,
          not_going_count: event.not_going_count || 0,
        }));
        setEvents(eventsWithDefaults);

        // Fetch posts separately
        const postsData = await fetchGroupPosts(parseInt(groupId));
        if (postsData && postsData.posts) {
          setPosts(postsData.posts);
        }
      } else {
        setError("Failed to load group. You may not have access or the group doesn't exist.");
      }
    } catch (error) {
      console.error("Error loading group data:", error);
      setError("An error occurred while loading the group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;
    
    setIsCreatingPost(true);
    try {
      const result = await createGroupPost(
        parseInt(groupId),
        newPost,
        selectedImage || undefined
      );
      
      if (result.success) {
        setNewPost("");
        setSelectedImage(null);
        setImagePreview(null);
        // Reload group data to show new post
        await loadGroupData();
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

  const handleLeaveGroup = () => {
    setShowLeaveConfirm(true);
  };

  const confirmLeaveGroup = async () => {
    setIsLeavingGroup(true);
    try {
      const result = await leaveGroup(parseInt(groupId));
      if (result.success) {
        router.push("/groups");
      } else {
        alert(result.message || "Failed to leave group");
      }
    } catch (error) {
      console.error("Error leaving group:", error);
      alert("Failed to leave group");
    } finally {
      setIsLeavingGroup(false);
      setShowLeaveConfirm(false);
    }
  };

  const handleDeleteGroup = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteGroup = async () => {
    setIsDeletingGroup(true);
    try {
      const result = await deleteGroup(parseInt(groupId));
      if (result.success) {
        router.push("/groups");
      } else {
        alert(result.message || "Failed to delete group");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group");
    } finally {
      setIsDeletingGroup(false);
      setShowDeleteConfirm(false);
    }
  };

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

  if (loading || !group) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background min-h-screen">
        <div className="text-center">
          {error ? (
            <>
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-foreground font-bold text-lg mb-2">{error}</p>
              <button
                onClick={() => router.push("/groups")}
                className="mt-4 bg-primary hover:bg-primary/90 text-black px-6 py-2 rounded-lg font-bold text-sm transition-all"
              >
                Back to Groups
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted">Loading group...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header Image */}
      <div className="relative min-h-80 bg-linear-to-b from-surface to-background flex flex-col justify-end overflow-hidden">
        {group.cover_image_path && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(http://localhost:8080${group.cover_image_path})` }}
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent" />
        
        {/* Back Button Overlay */}
        <button
          onClick={() => router.push("/groups")}
          className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-md border border-border rounded-lg text-foreground hover:bg-background transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Back</span>
        </button>

        <div className="relative z-10 p-8">
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
            {group.name}
          </h2>
          <p className="text-muted text-sm">
            {group.is_member ? "Member" : "Public"} Group • {group.members_count?.toLocaleString() || 0} Members
          </p>
        </div>
      </div>

      {/* Group Header / Actions */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-4 items-center">
            <div 
              className="w-20 h-20 rounded-xl bg-surface border-2 border-border shadow-lg flex items-center justify-center overflow-hidden"
            >
              {group.cover_image_path ? (
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(http://localhost:8080${group.cover_image_path})` }}
                />
              ) : (
                <Users className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="flex flex-col">
              <p className="text-xl font-bold text-foreground">{group.name}</p>
              <p className="text-sm text-muted">
                Est. {new Date(group.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex min-w-30 items-center justify-center rounded-lg h-10 px-5 bg-primary hover:bg-primary/90 text-black text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Friends
            </button>
            {group.is_owner ? (
              <button
                onClick={handleDeleteGroup}
                className="flex min-w-30 items-center justify-center rounded-lg h-10 px-5 border border-red-500/50 bg-red-900/20 text-red-500 text-sm font-bold hover:bg-red-900/30 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Delete Group
              </button>
            ) : (
              <button
                onClick={handleLeaveGroup}
                className="flex min-w-30 items-center justify-center rounded-lg h-10 px-5 border border-border bg-surface text-foreground text-sm font-bold hover:bg-red-900/20 hover:border-red-500/50 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Group
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border px-6 gap-8">
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex items-center justify-center pb-3 pt-4 px-2 border-b-2 transition-colors ${
              activeTab === "feed"
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span className="text-sm font-bold tracking-wide">Feed</span>
          </button>
          <button
            onClick={() => setActiveTab("events")}
            className={`flex items-center justify-center pb-3 pt-4 px-2 border-b-2 transition-colors ${
              activeTab === "events"
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span className="text-sm font-bold tracking-wide">Events</span>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center justify-center pb-3 pt-4 px-2 border-b-2 transition-colors ${
              activeTab === "chat"
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <span className="text-sm font-bold tracking-wide">Chat</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full">
            <div className="flex flex-col lg:flex-row gap-6 p-6">
              {/* Main Content */}
              <div className="flex-1 space-y-6">
                {activeTab === "feed" && (
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
                        groupOwnerId={group?.owner_id}
                        onDelete={async (postId) => {
                          // Remove post from state
                          setPosts(posts.filter(p => p.id !== postId));
                        }}
                      />
                    ))}
                  </>
                )}

                {activeTab === "events" && (
                  <div className="space-y-4">
                    {events.length === 0 ? (
                      <div className="bg-surface border border-border rounded-xl p-8 text-center">
                        <Calendar className="w-12 h-12 text-muted mx-auto mb-3" />
                        <p className="text-muted">No upcoming events</p>
                      </div>
                    ) : (
                      events.map((event) => {
                        const eventDate = new Date(event.start_time);
                        const eventTime = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        return (
                        <div key={event.id} className="bg-surface border border-border rounded-xl overflow-hidden">
                          {event.image_path && (
                            <div 
                              className="h-48 bg-surface bg-cover bg-center"
                              style={{ backgroundImage: `url(http://localhost:8080${event.image_path})` }}
                            />
                          )}
                          <div className="p-5">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="shrink-0 w-14 h-14 bg-primary/10 rounded-lg flex flex-col items-center justify-center border border-primary/20">
                                <span className="text-primary text-xs font-bold uppercase">
                                  {eventDate.toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                                <span className="text-foreground text-xl font-bold">
                                  {eventDate.getDate()}
                                </span>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-bold text-foreground mb-2">{event.title}</h3>
                                <div className="flex items-center gap-3 text-muted text-xs mb-2">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{eventTime}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-muted">{event.description}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                  event.user_response === "going"
                                    ? "bg-primary text-black shadow-lg shadow-primary/20"
                                    : "bg-background border border-border text-foreground hover:border-primary/50"
                                }`}
                              >
                                Going ({event.going_count || 0})
                              </button>
                              <button 
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                  event.user_response === "not-going"
                                    ? "bg-red-500/20 text-red-500 border border-red-500/50"
                                    : "bg-background border border-border text-muted hover:text-foreground"
                                }`}
                              >
                                Not Going ({event.not_going_count || 0})
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                      })
                    )}
                  </div>
                )}

                {activeTab === "chat" && (
                  <div className="flex flex-col h-150 bg-surface border border-border rounded-xl overflow-hidden">
                    {/* Chat Header */}
                    <div className="p-4 border-b border-border bg-background">
                      <h3 className="text-lg font-bold text-foreground">Group Chat</h3>
                      <p className="text-xs text-muted">Real-time messaging coming soon</p>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Static messages for now */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                          <span className="text-foreground font-bold text-xs">JV</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-foreground">Julian Voss</span>
                            <span className="text-xs text-muted">2 hours ago</span>
                          </div>
                          <div className="bg-background rounded-lg p-3 text-sm text-foreground">
                            Welcome to the group chat! Feel free to discuss anything related to our projects.
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                          <span className="text-foreground font-bold text-xs">SC</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-foreground">Sarah Chen</span>
                            <span className="text-xs text-muted">1 hour ago</span>
                          </div>
                          <div className="bg-background rounded-lg p-3 text-sm text-foreground">
                            Thanks! Looking forward to collaborating with everyone.
                          </div>
                        </div>
                      </div>

                      <div className="text-center py-4">
                        <p className="text-xs text-muted">Chat functionality will be implemented soon</p>
                      </div>
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 border-t border-border bg-background">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type a message... (coming soon)"
                          disabled
                          className="flex-1 bg-surface text-foreground border border-border rounded-lg px-4 py-2 text-sm outline-none placeholder:text-muted opacity-50 cursor-not-allowed"
                        />
                        <button
                          disabled
                          className="bg-primary/50 text-black px-4 py-2 rounded-lg font-bold text-sm cursor-not-allowed opacity-50"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Sidebar */}
              <aside className="w-full lg:w-80 space-y-6">
                {/* Join Requests (only visible to group owner) */}
                {group.is_owner && (
                  <JoinRequests 
                    groupId={group.id} 
                    isOwner={true}
                    onRequestHandled={loadGroupData}
                  />
                )}

                {/* About Group */}
                <div className="bg-surface border border-border rounded-xl p-5">
                  <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">About Group</h3>
                  <p className="text-sm text-foreground leading-relaxed">{group.description}</p>
                </div>

                {/* Group Creator */}
                {creator && (
                  <div className="bg-surface border border-border rounded-xl p-5">
                    <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-3">Group Creator</h3>
                    <div className="flex items-center gap-3 bg-background p-3 rounded-lg border border-border">
                      <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                        {creator.Avatar ? (
                          <div 
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url(http://localhost:8080${creator.Avatar})` }}
                          />
                        ) : (
                          <span className="text-foreground font-bold text-sm">
                            {creator.FirstName[0]}{creator.LastName[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">
                            {creator.FirstName} {creator.LastName}
                          </p>
                          <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                            Owner
                          </span>
                        </div>
                        <p className="text-muted text-[11px]">Group Founder</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upcoming Events (if on Feed tab) */}
                {activeTab === "feed" && events.length > 0 && (
                  <div className="bg-surface border border-border rounded-xl p-5">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold text-muted uppercase tracking-widest">Upcoming Event</h3>
                      <button
                        onClick={() => setActiveTab("events")}
                        className="text-[10px] text-primary font-bold uppercase hover:underline"
                      >
                        View All
                      </button>
                    </div>
                    <div className="bg-background border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors cursor-pointer">
                      {events[0].image_path && (
                        <div 
                          className="h-24 bg-surface bg-cover bg-center"
                          style={{ backgroundImage: `url(http://localhost:8080${events[0].image_path})` }}
                        />
                      )}
                      <div className="p-4">
                        <p className="text-xs text-primary font-bold mb-2">
                          {new Date(events[0].start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()} • {new Date(events[0].start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        <p className="text-sm font-bold text-foreground mb-3">{events[0].title}</p>
                        <div className="flex gap-2">
                          <button className="flex-1 bg-primary text-black text-[11px] font-bold py-1.5 rounded-lg shadow-lg shadow-primary/20">
                            Going
                          </button>
                          <button className="flex-1 bg-background border border-border text-muted text-[11px] font-bold py-1.5 rounded-lg hover:text-foreground">
                            Not Going
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-foreground">Invite Friends</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-muted hover:text-foreground"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted mb-4">
              Invite your friends to join {group.name}
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search friends..."
                className="w-full bg-background text-foreground border border-border rounded-lg px-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none placeholder:text-muted"
              />
              <div className="text-center text-sm text-muted py-8">
                Friend list will appear here
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 bg-background border border-border text-foreground px-4 py-2 rounded-lg font-bold text-sm hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-primary text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                Send Invites
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Group Confirmation */}
      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={confirmLeaveGroup}
        title="Leave Group"
        message={`Are you sure you want to leave ${group.name}? You will need to request to join again.`}
        confirmText="Leave Group"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isLeavingGroup}
      />

      {/* Delete Group Confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDeleteGroup}
        title="Delete Group"
        message={`Are you sure you want to permanently delete ${group.name}? This action cannot be undone. All posts, events, and members will be removed.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isDeletingGroup}
      />
    </div>
  );
}
