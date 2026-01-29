"use client";

import { useState, useEffect } from "react";
import { Check, X, UserPlus, User } from "lucide-react";
import { GroupJoinRequest } from "@/lib/groups/interface";
import { fetchJoinRequests, handleJoinRequest } from "@/lib/groups/api";
import { on, off } from "@/lib/ws/ws";

interface JoinRequestsProps {
  groupId: number;
  isOwner: boolean;
  onRequestHandled?: () => void;
}

export default function JoinRequests({ groupId, isOwner, onRequestHandled }: JoinRequestsProps) {
  const [requests, setRequests] = useState<GroupJoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    if (isOwner) {
      loadRequests();

      // Listen for new join requests via WebSocket
      const handleNewRequest = (data: any) => {
        console.log("Received WebSocket message:", data);
        if (data.type === "group_join_request" && data.data.group_id === groupId) {
          // Show notification toast
          (globalThis as any).addToast({
            id: Date.now().toString(),
            title: "New Join Request",
            message: `${data.data.user?.firstName || "Someone"} wants to join ${data.data.group_name}`,
            type: "info",
            duration: 6000,
          });
          
          // Reload requests when a new one arrives
          loadRequests();
        }
      };

      on("group_join_request", handleNewRequest);

      return () => {
        off("group_join_request", handleNewRequest);
      };
    }
  }, [groupId, isOwner]);

  const loadRequests = async () => {
    if (!isOwner) return;

    setLoading(true);
    try {
      const data = await fetchJoinRequests(groupId);
      if (data && data.success) {
        console.log("Join requests loaded:", data.requests);
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error loading join requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: number, action: "approve" | "reject") => {
    console.log(`Handling request ${requestId} with action: ${action}`);
    setProcessingId(requestId);
    try {
      const result = await handleJoinRequest(requestId, action);
      console.log("Handle request result:", result);
      
      if (result.success) {
        // Show success toast
        (globalThis as any).addToast({
          id: Date.now().toString(),
          message: result.message || `Request ${action}d successfully`,
          type: "success",
        });
        
        // Refresh group data if callback provided
        onRequestHandled?.();
        
        // Reload requests to ensure we're in sync with backend
        console.log("Reloading join requests...");
        await loadRequests();
        console.log("Join requests reloaded");
      } else {
        (globalThis as any).addToast({
          id: Date.now().toString(),
          message: result.message || `Failed to ${action} request`,
          type: "error",
        });
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      (globalThis as any).addToast({
        id: Date.now().toString(),
        message: `Failed to ${action} request`,
        type: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOwner || requests.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="w-5 h-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Join Requests</h3>
        <span className="ml-auto bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-full">
          {requests.length}
        </span>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center border border-border shrink-0 overflow-hidden">
                {request.user?.avatar ? (
                  <img
                    src={`http://localhost:8080${request.user.avatar}`}
                    alt={`${request.user.firstName}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-foreground/60" />
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {request.user?.firstName} {request.user?.lastName}
                </p>
                <p className="text-xs text-muted">
                  {new Date(request.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleRequest(request.id, "approve")}
                  disabled={processingId === request.id}
                  className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                  title="Approve"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRequest(request.id, "reject")}
                  disabled={processingId === request.id}
                  className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  title="Reject"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
