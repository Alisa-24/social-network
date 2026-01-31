import { useState } from "react";
import { X, Search, UserPlus, UserIcon } from "lucide-react";

interface InviteFriendsModalProps {
  groupName: string;
  isOpen: boolean;
  onClose: () => void;
  onInvite: (userIds: number[]) => Promise<void>;
}

// Mock friend type - replace with actual user type
interface Friend {
  id: number;
  firstName: string;
  lastName: string;
  avatar?: string;
  isInvited: boolean;
}

export default function InviteFriendsModal({ 
  groupName, 
  isOpen, 
  onClose, 
  onInvite 
}: InviteFriendsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mock friends data - replace with actual API call
  const [friends] = useState<Friend[]>([]);

  if (!isOpen) return null;

  const handleInvite = async () => {
    if (selectedFriends.length === 0 || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onInvite(selectedFriends);
      setSelectedFriends([]);
      setSearchQuery("");
      onClose();
    } catch (error) {
      console.error("Failed to send invitations:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFriend = (friendId: number) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const filteredFriends = friends.filter(friend =>
    `${friend.firstName} ${friend.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-foreground">Invite Friends</h3>
            <p className="text-sm text-muted mt-1">
              Invite your friends to join {groupName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search friends..."
              className="w-full bg-background text-foreground border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none placeholder:text-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Friends List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredFriends.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-sm text-muted">
                {searchQuery ? "No friends found" : "No friends to invite"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => !friend.isInvited && toggleFriend(friend.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    friend.isInvited
                      ? "border-border bg-background/50 opacity-50 cursor-not-allowed"
                      : selectedFriends.includes(friend.id)
                      ? "border-primary bg-primary/10 cursor-pointer"
                      : "border-border hover:border-primary/50 cursor-pointer"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                    {friend.avatar ? (
                      <div 
                        className="w-full h-full rounded-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${friend.avatar})` }}
                      />
                    ) : (
                        <UserIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {friend.firstName} {friend.lastName}
                    </p>
                    {friend.isInvited && (
                      <p className="text-xs text-muted">Already invited</p>
                    )}
                  </div>
                  {selectedFriends.includes(friend.id) && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 bg-background border border-border text-foreground px-4 py-2 rounded-lg font-bold text-sm hover:bg-surface transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={selectedFriends.length === 0 || isSubmitting}
            className="flex-1 bg-primary text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors disabled:bg-muted disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              `Send Invites (${selectedFriends.length})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
