import { useState, useEffect } from "react";
import { Users, UserMinus, ExternalLink, UserIcon} from "lucide-react";
import { fetchGroupMembers, kickGroupMember, GroupMember } from "@/lib/groups/members";
import ConfirmModal from "@/components/ui/confirm";
import Link from "next/link";

interface GroupMembersProps {
  groupId: number;
  isOwner: boolean;
  currentUserId?: number;
  onMemberKicked?: () => void;
}

export default function GroupMembers({ 
  groupId, 
  isOwner, 
  currentUserId,
  onMemberKicked 
}: GroupMembersProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKickConfirm, setShowKickConfirm] = useState(false);
  const [memberToKick, setMemberToKick] = useState<GroupMember | null>(null);
  const [isKicking, setIsKicking] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [groupId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await fetchGroupMembers(groupId);
      if (response.success && response.members) {
        setMembers(response.members);
      }
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKickClick = (member: GroupMember) => {
    setMemberToKick(member);
    setShowKickConfirm(true);
  };

  const confirmKick = async () => {
    if (!memberToKick) return;

    setIsKicking(true);
    try {
      const response = await kickGroupMember(groupId, memberToKick.ID);
      if (response.success) {
        // Remove member from list
        setMembers(members.filter(m => m.ID !== memberToKick.ID));
        setShowKickConfirm(false);
        setMemberToKick(null);
        onMemberKicked?.();
      } else {
        alert(response.message || "Failed to kick member");
      }
    } catch (error) {
      console.error("Error kicking member:", error);
      alert("Failed to kick member");
    } finally {
      setIsKicking(false);
    }
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const displayedMembers = showAll ? members : members.slice(0, 5);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-muted" />
          <h3 className="text-sm font-bold text-muted uppercase tracking-widest">Members</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted" />
            <h3 className="text-sm font-bold text-muted uppercase tracking-widest">
              Members ({members.length})
            </h3>
          </div>
          {members.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-primary font-bold uppercase hover:underline"
            >
              {showAll ? "Show Less" : "View All"}
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-10 h-10 text-muted mx-auto mb-2" />
            <p className="text-sm text-muted">No members yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedMembers.map((member) => (
              <div
                key={member.ID}
                className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border hover:border-border/80 transition-colors group"
              >
                {/* Avatar */}
                <Link 
                  href={`/profile/${member.ID}`}
                  className="shrink-0"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-primary/50 transition-all">
                    {member.Avatar ? (
                      <img
                        src={`http://localhost:8080${member.Avatar}`}
                        alt={`${member.FirstName} ${member.LastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center border border-border shrink-0">
                          <UserIcon className="h-5 w-5 text-foreground/60" />
                        </div>
                      )}
                  </div>
                </Link>

                {/* Member Info */}
                <div className="flex-1 min-w-0">
                  <Link 
                    href={`/profile/${member.ID}`}
                    className="group/link"
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground truncate group-hover/link:text-primary transition-colors">
                        {member.FirstName} {member.LastName}
                      </p>
                      <ExternalLink className="w-3 h-3 text-muted opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      {member.Role === "owner" && (
                        <span className="bg-primary/20 text-primary text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-muted text-[11px]">
                      Joined {formatJoinDate(member.JoinedAt)}
                    </p>
                  </Link>
                </div>

                {/* Kick Button (only for owner, and not for themselves) */}
                {isOwner && member.Role !== "owner" && member.ID !== currentUserId && (
                  <button
                    onClick={() => handleKickClick(member)}
                    className="shrink-0 p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove member"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kick Confirmation Modal */}
      <ConfirmModal
        isOpen={showKickConfirm}
        onClose={() => {
          setShowKickConfirm(false);
          setMemberToKick(null);
        }}
        onConfirm={confirmKick}
        title="Remove Member"
        message={
          memberToKick
            ? `Are you sure you want to remove ${memberToKick.FirstName} ${memberToKick.LastName} from this group? They will need to request to join again.`
            : ""
        }
        confirmText="Remove Member"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={isKicking}
      />
    </>
  );
}