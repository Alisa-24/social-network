"use client";

import { useState, useEffect } from "react";
import { Users, Check, X } from "lucide-react";
import { fetchGroupInvitations, handleGroupInvitation } from "@/lib/groups/api";
import { on, off } from "@/lib/ws/ws";

interface Invitation {
  id: number;
  group_id: number;
  group_name: string;
  inviter_id: number;
  inviter_name: string;
  created_at: string;
}

export default function GroupInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    loadInvitations();

    // Listen for new invitations via WebSocket
    const handleNewInvitation = (data: any) => {
      if (data.type === "group_invitation") {
        loadInvitations(); // Refresh invitations list
      }
    };

    // Listen for custom event when user auto-joins via "Request to Join"
    const handleAutoAccept = () => {
      loadInvitations();
    };

    on("group_invitation", handleNewInvitation);
    window.addEventListener("groupInvitationAccepted", handleAutoAccept);

    return () => {
      off("group_invitation", handleNewInvitation);
      window.removeEventListener("groupInvitationAccepted", handleAutoAccept);
    };
  }, []);

  const loadInvitations = async () => {
    const data = await fetchGroupInvitations();
    if (data && data.success) {
      setInvitations(data.invitations || []);
    }
    setLoading(false);
  };

  const handleAccept = async (invitationId: number) => {
    setProcessingId(invitationId);
    const result = await handleGroupInvitation(invitationId, "accept");

    if (result.success) {
      (globalThis as any).addToast({
        id: Date.now().toString(),
        title: "Invitation Accepted",
        message: "You have joined the group!",
        type: "success",
        duration: 4000,
      });
      loadInvitations(); // Refresh list
    } else {
      (globalThis as any).addToast({
        id: Date.now().toString(),
        title: "Error",
        message: result.message || "Failed to accept invitation",
        type: "error",
        duration: 5000,
      });
    }
    setProcessingId(null);
  };

  const handleDecline = async (invitationId: number) => {
    setProcessingId(invitationId);
    const result = await handleGroupInvitation(invitationId, "decline");

    if (result.success) {
      (globalThis as any).addToast({
        id: Date.now().toString(),
        title: "Invitation Declined",
        message: "The invitation has been declined",
        type: "info",
        duration: 3000,
      });
      loadInvitations(); // Refresh list
    } else {
      (globalThis as any).addToast({
        id: Date.now().toString(),
        title: "Error",
        message: result.message || "Failed to decline invitation",
        type: "error",
        duration: 5000,
      });
    }
    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <p className="text-sm text-muted">Loading invitations...</p>
      </div>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show if no invitations
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-foreground">Group Invitations</h3>
        <span className="ml-auto text-xs font-bold bg-primary/20 text-primary px-2 py-1 rounded-full">
          {invitations.length}
        </span>
      </div>

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-4 bg-foreground/5 border border-border rounded-lg hover:border-primary/30 transition-colors"
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {invitation.group_name}
              </p>
              <p className="text-xs text-muted mt-1">
                Invited by {invitation.inviter_name}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(invitation.id)}
                disabled={processingId === invitation.id}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-3.5 h-3.5" />
                Accept
              </button>
              <button
                onClick={() => handleDecline(invitation.id)}
                disabled={processingId === invitation.id}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-3.5 h-3.5" />
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
