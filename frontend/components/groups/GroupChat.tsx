import { useState, useEffect, useRef } from "react";
import { Send, Loader2, UserIcon } from "lucide-react";
import { User } from "@/lib/interfaces";
import { GroupChatMessage } from "@/lib/groups/interface";
import { fetchGroupMessages } from "@/lib/groups/api";
import { send, on, off } from "@/lib/ws/ws";
import { API_URL } from "@/lib/config";

interface GroupChatProps {
  groupId: number;
  currentUser: User | null;
}

export default function GroupChat({ groupId, currentUser }: GroupChatProps) {
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const LIMIT = 10;

  useEffect(() => {
    loadInitialMessages();
  }, [groupId]);

  useEffect(() => {
    // Listen for new messages
    const handleNewMessage = (data: any) => {
      if (data.type === "new_group_message" && data.data && data.data.group_id === groupId) {
        setMessages((prev) => [...prev, data.data]);
        scrollToBottom();
      }
    };

    on("new_group_message", handleNewMessage);
    return () => {
      off("new_group_message", handleNewMessage);
    };
  }, [groupId]);

  const loadInitialMessages = async () => {
    setLoading(true);
    const result = await fetchGroupMessages(groupId, LIMIT, 0);
    if (result.success && result.messages) {
      // API returns newest first (DESC), so we reverse to show oldest at top for chat
      setMessages(result.messages.reverse());
      setOffset(result.messages.length);
      setHasMore(result.messages.length === LIMIT);
      scrollToBottom();
    }
    setLoading(false);
  };

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    
    // Remember scroll position
    const container = chatContainerRef.current;
    const oldScrollHeight = container?.scrollHeight || 0;

    const result = await fetchGroupMessages(groupId, LIMIT, offset);
    if (result.success && result.messages) {
      if (result.messages.length < LIMIT) {
        setHasMore(false);
      }
      setOffset((prev) => prev + result.messages.length);
      setMessages((prev) => [...result.messages.reverse(), ...prev]);
      
      // Restore scroll position
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - oldScrollHeight;
        }
      });
    }
    setLoadingMore(false);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !currentUser) return;

    // Send via WebSocket
    send({
      type: "group_message",
      group_id: groupId,
      content: newMessage.trim(),
    });

    setNewMessage("");
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop } = chatContainerRef.current;
      if (scrollTop === 0 && hasMore) {
        loadMoreMessages();
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-surface rounded-3xl border border-border overflow-hidden glass relative h-[600px]">
      {/* Group Chat Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-bold">Group Chat</h3>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {loadingMore && (
          <div className="flex justify-center p-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
        
        {loading && messages.length === 0 ? (
           <div className="flex justify-center items-center h-full">
             <Loader2 className="w-8 h-8 animate-spin text-muted" />
           </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = currentUser?.userId === msg.user_id;
            const showDetails = index === 0 || messages[index - 1].user_id !== msg.user_id;
            
            // Handle both capitalized and lowercase field names
            const user = msg.user as any;
            const avatar = user?.Avatar || user?.avatar;
            const firstName = user?.FirstName || user?.firstName || 'User';

            return (
              <div key={msg.id || index} className={`flex gap-3 max-w-[85%] ${isMe ? "flex-row-reverse ml-auto" : ""}`}>
                <div className={`shrink-0 ${!showDetails ? "w-10" : ""}`}>
                  {showDetails && (
                    <div className="w-10 h-10 rounded-xl bg-muted/20 border border-border flex items-center justify-center overflow-hidden">
                      {avatar ? (
                        <img src={`${API_URL}${avatar}`} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-muted-foreground font-bold text-xs uppercase">
                        <UserIcon className="h-6 w-6 text-muted-foreground" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className={`flex flex-col ${isMe ? "items-end" : ""}`}>
                  {showDetails && (
                    <div className="flex items-baseline gap-2 mb-1">
                      {isMe ? (
                        <>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-sm font-bold">You</span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-bold shrink-0">{firstName}</span>
                          <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <div 
                    className={`p-4 text-sm leading-relaxed ${
                      isMe 
                        ? "bg-primary text-black font-semibold rounded-2xl rounded-tr-none shadow-lg shadow-primary/20" 
                        : "bg-muted/10 text-foreground rounded-2xl rounded-tl-none border border-border"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <div className="p-6 bg-transparent">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-muted/5 border border-border rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary placeholder-muted-foreground text-sm transition-all text-foreground"
          />
          <div className="absolute inset-y-0 right-3 flex items-center">
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-md shadow-primary/10"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
