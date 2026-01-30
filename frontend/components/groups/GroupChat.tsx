import { Send } from "lucide-react";

export default function GroupChat() {
  return (
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
              <span className="text-sm font-bold text-foreground">
                Julian Voss
              </span>
              <span className="text-xs text-muted">2 hours ago</span>
            </div>
            <div className="bg-background rounded-lg p-3 text-sm text-foreground">
              Welcome to the group chat! Feel free to discuss anything related
              to our projects.
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <span className="text-foreground font-bold text-xs">SC</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-foreground">
                Sarah Chen
              </span>
              <span className="text-xs text-muted">1 hour ago</span>
            </div>
            <div className="bg-background rounded-lg p-3 text-sm text-foreground">
              Thanks! Looking forward to collaborating with everyone.
            </div>
          </div>
        </div>

        <div className="text-center py-4">
          <p className="text-xs text-muted">
            Chat functionality will be implemented soon
          </p>
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
  );
}
