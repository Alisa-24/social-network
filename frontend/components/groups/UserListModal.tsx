"use client";

import { X } from "lucide-react";
import { User } from "@/lib/interfaces"; // or EventVoter?
import { EventVoter } from "@/lib/groups/interface";

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  users: EventVoter[];
  loading?: boolean;
}

export default function UserListModal({
  isOpen,
  onClose,
  title,
  users,
  loading,
}: UserListModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background rounded-full transition-colors text-muted hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted">No users found</div>
          ) : (
            <div className="space-y-1">
              {users.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 p-2 hover:bg-background rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-surface border border-border overflow-hidden flex-shrink-0">
                    {user.avatar ? (
                      <img
                        src={`http://localhost:8080${user.avatar}`}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                        {user.firstName[0]}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">
                      {user.firstName} {user.lastName}
                    </h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        user.response === "going"
                          ? "bg-primary/20 text-primary"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {user.response === "going" ? "Going" : "Not Going"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
