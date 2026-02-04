"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchGroupDetail,
  fetchGroupPosts,
  leaveGroup,
  deleteGroup,
  fetchEventVoters,
} from "@/lib/groups/api";
import { GroupPost, GroupEvent, EventVoter, Group } from "@/lib/groups/interface";
import { getCurrentUser } from "@/lib/auth/auth";
import { User } from "@/lib/interfaces";
import ConfirmModal from "@/components/ui/confirm";
import GroupMembers from "@/components/groups/GroupMembers";
import CreateEventModal from "@/components/groups/CreateEventModal";
import UserListModal from "@/components/groups/UserListModal";
import { on, off } from "@/lib/ws/ws";

import GroupHeader from "@/components/groups/GroupHeader";
import GroupFeed from "@/components/groups/GroupFeed";
import GroupEvents from "@/components/groups/GroupEvents";
import GroupChat from "@/components/groups/GroupChat";
import GroupSidebar from "@/components/groups/GroupSidebar";
import GroupInviteModal from "@/components/groups/GroupInviteModal";

interface Creator {
  ID: number;
  Username: string;
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

  const [activeTab, setActiveTab] = useState<
    "feed" | "events" | "members" | "chat"
  >("feed");
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);
  const [isCreateEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [votersList, setVotersList] = useState<EventVoter[]>([]);
  const [votersLoading, setVotersLoading] = useState(false);
  const [votersModalTitle, setVotersModalTitle] = useState("");

  useEffect(() => {
    loadGroupData();
    loadCurrentUser();
  }, [groupId]);

  // WebSocket listener for new events
  useEffect(() => {
    if (!groupId) return;
    const id = parseInt(groupId, 10);

    const handleNewEvent = (data: any) => {
      if (
        data.type === "new_group_event" &&
        data.data.groupId === id &&
        data.data.event
      ) {
        const newEvent = data.data.event;
        const mappedEvent: GroupEvent = {
          ...newEvent,
          going_count: 0,
          not_going_count: 0,
          user_response: null,
          id: newEvent.id,
          group_id: newEvent.group_id,
          image_path: newEvent.image_path,
          start_time: newEvent.start_time,
          created_at: newEvent.created_at,
        };
        
        setEvents((prev) => {
          if (prev.some((e) => e.id === mappedEvent.id)) return prev;
          const updated = [...prev, mappedEvent].sort(
            (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );
          return updated;
        });
      }

      if (
        data.type === "event_response_update" &&
        data.data.groupId === id &&
        data.data.eventId
      ) {
        const { eventId, goingCount, notGoingCount, userId, response } = data.data;
        setEvents((prev) =>
          prev.map((e) => {
            if (e.id === eventId) {
               // Update counts
               const updated = {
                 ...e,
                 going_count: goingCount,
                 not_going_count: notGoingCount,
                 user_response: e.user_response 
               };
               // If the update is from current user, update their response status
               if (currentUser?.userId === userId) {
                 updated.user_response = response;
               }
               return updated;
            }
            return e;
          })
        );
      }
      if (data.type === "event_deleted" && data.data.groupId === id) {
        setEvents((prev) => prev.filter((e) => e.id !== data.data.eventId));
      }
    };

    on("new_group_event", handleNewEvent);
    on("event_response_update", handleNewEvent);
    on("event_deleted", handleNewEvent);
    
    return () => {
      off("new_group_event", handleNewEvent);
      off("event_response_update", handleNewEvent);
      off("event_deleted", handleNewEvent);
    };
  }, [groupId, currentUser]);

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

      const data = await fetchGroupDetail(parseInt(groupId));

      if (data && (data as any).error) {
        setError((data as any).error);
        return;
      }

      if (data && data.group) {
        const groupData = data.group;

        // Set group without posts/events
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

        if (groupData.owner) {
          setCreator({
            ID: groupData.owner.userId,
            Username: groupData.owner.username,
            FirstName: groupData.owner.firstName,
            LastName: groupData.owner.lastName,
            Avatar: groupData.owner.avatar || "",
            Role: "owner",
            JoinedAt: groupData.created_at,
          });
        } else {
          setCreator({
            ID: groupData.owner_id,
            Username: "group_owner",
            FirstName: "Group",
            LastName: "Owner",
            Avatar: "",
            Role: "owner",
            JoinedAt: groupData.created_at,
          });
        }

        const eventsWithDefaults = (groupData.events || []).map((event) => ({
          ...event,
          going_count: event.going_count || 0,
          not_going_count: event.not_going_count || 0,
        }));
        setEvents(eventsWithDefaults);

        const postsData = await fetchGroupPosts(parseInt(groupId));
        if (postsData && postsData.posts) {
          setPosts(postsData.posts);
        }
      } else {
        setError(
          "Failed to load group. You may not have access or the group doesn't exist.",
        );
      }
    } catch (error) {
      console.error("Error loading group data:", error);
      setError("An error occurred while loading the group. Please try again.");
    } finally {
      setLoading(false);
    }
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

  const handleViewVoters = async (eventId: number | undefined, title: string) => {
    if (!eventId) return;
    setVotersModalTitle(title);
    setVotersLoading(true);
    setShowVotersModal(true);
    setVotersList([]);

    try {
      const result = await fetchEventVoters(eventId);
      if (result.success && result.voters) {
        setVotersList(result.voters);
      }
    } catch (err) {
      console.error("Failed to fetch voters", err);
    } finally {
      setVotersLoading(false);
    }
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
    <div className="flex-1 flex flex-col overflow-y-auto bg-background">
      <GroupHeader
        group={group}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onInvite={() => setShowInviteModal(true)}
        onLeave={() => setShowLeaveConfirm(true)}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      <div className="max-w-7xl mx-auto w-full px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 min-h-[60vh]">
          {activeTab === "feed" && (
            <div className="space-y-6">
              <GroupFeed
                group={group}
                posts={posts}
                currentUser={currentUser}
                onPostCreated={loadGroupData}
                onPostDeleted={(postId) => setPosts(posts.filter((p) => p.id !== postId))}
              />
            </div>
          )}

          {activeTab === "events" && (
            <GroupEvents
              events={events}
              group={group}
              currentUser={currentUser}
              onCreateEvent={() => setCreateEventModalOpen(true)}
              onViewVoters={handleViewVoters}
              onEventDeleted={(eventId: number) => setEvents(events.filter((e) => e.id !== eventId))}
            />
          )}

          {activeTab === "chat" && (
            <GroupChat 
              groupId={group.id} 
              currentUser={currentUser} 
            />
          )}

          {activeTab === "members" && (
            <div className="space-y-4">
              <GroupMembers
                groupId={group.id}
                isOwner={group.is_owner || false}
                currentUserId={currentUser?.userId}
                onMemberKicked={loadGroupData}
              />
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <GroupSidebar
          group={group}
          creator={creator}
          events={events}
          activeTab={activeTab}
          onViewAllEvents={() => setActiveTab("events")}
          onRefresh={loadGroupData}
        />
      </div>

      <GroupInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        group={group}
        onSuccess={loadGroupData}
      />

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

      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setCreateEventModalOpen(false)}
        groupId={group ? group.id : 0}
        onSuccess={() => {
          loadGroupData();
        }}
      />

      <UserListModal
        isOpen={showVotersModal}
        onClose={() => setShowVotersModal(false)}
        title={`Attendees for ${votersModalTitle}`}
        users={votersList}
        loading={votersLoading}
      />
    </div>
  );
}
