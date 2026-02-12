import { useState, useEffect } from "react";
import { MoreHorizontal, X, Search, UserIcon } from "lucide-react"; // Added missing imports
import {
  fetchPotentialInvitees,
  inviteUserToGroup,
  type PotentialInvitee,
} from "@/lib/groups/api";
import { Group } from "@/lib/groups/interface";
import { API_URL } from "@/lib/config";

interface GroupInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  onSuccess: () => void;
}

export default function GroupInviteModal({
  isOpen,
  onClose,
  group,
  onSuccess,
}: GroupInviteModalProps) {
  const [invitees, setInvitees] = useState<PotentialInvitee[]>([]);
  const [inviteSearchQuery, setInviteSearchQuery] = useState("");
  const [inviteesLoading, setInviteesLoading] = useState(false);
  const [selectedInvitees, setSelectedInvitees] = useState<number[]>([]);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    if (!isOpen || !group?.id) return;
    const id = group.id;
    if (id <= 0) return;

    setSelectedInvitees([]);
    setInviteSearchQuery("");

    const loadInvitees = async () => {
      setInviteesLoading(true);
      try {
        const data = await fetchPotentialInvitees(id);
        if (data.success && data.users) setInvitees(data.users);
        else setInvitees([]);
      } catch (err) {
        console.error("Failed to fetch invitees", err);
        setInvitees([]);
      } finally {
        setInviteesLoading(false);
      }
    };
    loadInvitees();
  }, [isOpen, group?.id]);

  if (!isOpen || !group) return null;

  const handleInvite = async () => {
    if (selectedInvitees.length === 0 || !group) return;
    const groupIdNum = group.id;
    if (!groupIdNum || groupIdNum <= 0) return;

    setIsInviting(true);
    try {
      let lastError: string | null = null;
      let autoAcceptedCount = 0;
      let invitedCount = 0;

      for (const id of selectedInvitees) {
        const result = await inviteUserToGroup(groupIdNum, id);
        if (!result.success) {
          lastError = result.message ?? "Failed to send invite";
        } else if (result.message?.includes("automatically added")) {
          autoAcceptedCount++;
        } else {
          invitedCount++;
        }
      }

      if (lastError) {
        alert(lastError);
        return;
      }

      // Trigger event to refresh join requests list if any were auto-accepted
      if (autoAcceptedCount > 0) {
        console.log(
          "Dispatching joinRequestAutoAccepted event for",
          autoAcceptedCount,
          "users",
        );
        window.dispatchEvent(new CustomEvent("joinRequestAutoAccepted"));
        // Small delay to ensure event is processed
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Show success message
      if (autoAcceptedCount > 0 && invitedCount > 0) {
        (globalThis as any).addToast({
          id: crypto.randomUUID(),
          title: "Success",
          message: `${autoAcceptedCount} user(s) automatically added (had pending requests), ${invitedCount} invitation(s) sent`,
          type: "success",
          duration: 6000,
        });
      } else if (autoAcceptedCount > 0) {
        (globalThis as any).addToast({
          id: crypto.randomUUID(),
          title: "Users Automatically Added",
          message: `${autoAcceptedCount} user(s) had pending join requests and were automatically added to the group`,
          type: "success",
          duration: 6000,
        });
      } else {
        (globalThis as any).addToast({
          id: crypto.randomUUID(),
          title: "Invitations Sent",
          message: `${invitedCount} invitation(s) sent successfully`,
          type: "success",
          duration: 5000,
        });
      }

      setSelectedInvitees([]);
      onClose();
      onSuccess();
    } catch (err) {
      console.error("Error sending invites", err);
      alert("Failed to send invites");
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-foreground">Invite Users</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-muted mb-4">
          Invite users to join {group.name}
        </p>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full bg-background text-foreground border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none placeholder:text-muted"
              value={inviteSearchQuery}
              onChange={(e) => setInviteSearchQuery(e.target.value)}
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {inviteesLoading ? (
              <div className="text-center py-8 text-sm text-muted">
                Loading users...
              </div>
            ) : (
              (() => {
                const q = inviteSearchQuery.trim().toLowerCase();
                const filtered = q
                  ? invitees.filter((u) =>
                      `${u.first_name} ${u.last_name}`
                        .toLowerCase()
                        .includes(q),
                    )
                  : invitees;
                return filtered.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted">
                    {invitees.length === 0
                      ? "No users available to invite"
                      : "No users match your search"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((u) => (
                      <div
                        key={u.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${selectedInvitees.includes(u.id) ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 cursor-pointer"}`}
                        onClick={() => {
                          setSelectedInvitees((prev) =>
                            prev.includes(u.id)
                              ? prev.filter((id) => id !== u.id)
                              : [...prev, u.id],
                          );
                        }}
                      >
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                          {u.avatar ? (
                            <div
                              className="w-full h-full rounded-full bg-cover bg-center"
                              style={{
                                backgroundImage: `url(${API_URL}${u.avatar})`,
                              }}
                            />
                          ) : (
                            <UserIcon className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {u.first_name} {u.last_name}
                          </p>
                        </div>
                        {selectedInvitees.includes(u.id) && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <svg
                              className="w-3 h-3 text-black"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isInviting}
            className="flex-1 bg-background border border-border text-foreground px-4 py-2 rounded-lg font-bold text-sm hover:bg-surface transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={selectedInvitees.length === 0 || isInviting}
            className="flex-1 bg-primary text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors disabled:bg-muted disabled:cursor-not-allowed"
          >
            {isInviting
              ? "Sending..."
              : `Send Invites (${selectedInvitees.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
