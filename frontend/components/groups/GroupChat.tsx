import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { User } from "@/lib/interfaces";
import { GroupChatMessage } from "@/lib/groups/interface";
import { fetchGroupMessages } from "@/lib/groups/api";
import { send, on, off } from "@/lib/ws/ws";

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
    <div className="flex flex-col h-150 bg-surface border border-border rounded-xl overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-background">
        <h3 className="text-lg font-bold text-foreground">Group Chat</h3>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
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
            const showAvatar = index === 0 || messages[index - 1].user_id !== msg.user_id;

            return (
              <div key={msg.id || index} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ${!showAvatar ? "invisible" : ""}`}>
                   {msg.user?.Avatar ? (
                     <img src={`http://localhost:8080${msg.user.Avatar}`} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                   ) : (
                     <span className="text-foreground font-bold text-xs">
                       {msg.user?.FirstName?.[0]}{msg.user?.LastName?.[0]}
                     </span>
                   )}
                </div>
                <div className={`flex-1 max-w-[80%] ${isMe ? "text-right" : ""}`}>
                  {showAvatar && (
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? "justify-end" : ""}`}>
                      <span className="text-xs font-bold text-foreground">
                        {isMe ? "You" : `${msg.user?.FirstName} ${msg.user?.LastName}`}
                      </span>
                      <span className="text-[10px] text-muted">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <div 
                    className={`rounded-lg p-3 text-sm inline-block text-left ${
                      isMe 
                        ? "bg-primary text-black font-medium" 
                        : "bg-background text-foreground"
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
      <div className="p-4 border-t border-border bg-background">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-surface text-foreground border border-border rounded-lg px-4 py-2 text-sm outline-none placeholder:text-muted focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-black px-4 py-2 rounded-lg font-bold text-sm transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
