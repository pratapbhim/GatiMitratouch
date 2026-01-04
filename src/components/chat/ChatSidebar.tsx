"use client";
import { MoreVertical, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

import { getSocket } from "@/lib/socket";
import { useMeetingStore } from "@/context/meetingContext";

interface ChatMessage {
  meetingId: string;
  user: string;
  avatar?: string;
  email?: string;
  message: string;
  time: string;
  from: string;
}

interface ChatSidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

// Generate unique ID for chat messages
const generateMessageId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export default function ChatSidebar({ isOpen, setIsOpen }: ChatSidebarProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const userName = user?.name || "Chat";
  const userAvatar = user?.image || undefined;
  const isCollapsed = !isOpen;
  const toggleSidebar = () => setIsOpen(!isOpen);
  const chat = useMeetingStore((s) => s.chat);
  const addChat = useMeetingStore((s) => s.addChat);
  const pinnedMessage = useMeetingStore((s) => s.pinnedMessage);
  const setPinnedMessage = useMeetingStore((s) => s.setPinnedMessage);
  const [message, setMessage] = useState("");
  const chatListRef = useRef<HTMLDivElement>(null);
  const [lastMessageId, setLastMessageId] = useState<string>("");

  // Auto-scroll to bottom when chat changes
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chat]);

  // Use shared socket instance
  const socket = getSocket("http://localhost:5000");
  const meetingId = typeof window !== "undefined" ? window.location.pathname.split("/").pop() : undefined;

  // Listen for incoming chat messages and pin/unpin events
  useEffect(() => {
    if (!socket) return;
    const chatHandler = (msg: any) => {
      // Add unique ID to incoming message
      const messageWithId = { ...msg, id: generateMessageId() };
      addChat(messageWithId);
    };
    const pinHandler = (msg: any) => {
      setPinnedMessage(msg);
    };
    const unpinHandler = () => {
      setPinnedMessage(null);
    };
    socket.on("chat", chatHandler);
    socket.on("pin-message", pinHandler);
    socket.on("unpin-message", unpinHandler);
    return () => {
      socket.off("chat", chatHandler);
      socket.off("pin-message", pinHandler);
      socket.off("unpin-message", unpinHandler);
    };
  }, [addChat, setPinnedMessage, socket]);

  // Pin/unpin handlers
  function handlePinMessage(msg: any) {
    setPinnedMessage(msg);
    if (socket && meetingId) {
      socket.emit("pin-message", { meetingId, msg });
    }
  }

  function handleUnpinMessage() {
    setPinnedMessage(null);
    if (socket && meetingId) {
      socket.emit("unpin-message", { meetingId });
    }
  }

  // Send message to server
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || !socket || !session?.user) return;
    
    // Generate unique ID for the message
    const messageId = generateMessageId();
    
    // Check if this is exactly the same as last message (same user, same content)
    // If so, we still send it but ensure it has a unique ID
    const chatMsg = {
      id: messageId,
      meetingId: window.location.pathname.split("/").pop(),
      user: session.user.name || "",
      avatar: session.user.image ?? undefined,
      email: session.user.email ?? undefined,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      from: socket.id || "",
      timestamp: Date.now() // Add timestamp for additional uniqueness
    };
    
    // Update last message ID
    setLastMessageId(messageId);
    
    // Show own message instantly in UI
    addChat(chatMsg);
    socket.emit("chat", chatMsg);
    setMessage("");
    
    // Reset textarea height
    const textarea = document.getElementById('chat-message') as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.style.height = 'auto';
    }
  };

  // When collapsed, show a minimal version
  if (isCollapsed) {
    return (
      <aside className="fixed right-0 top-0 h-full w-16 bg-gradient-to-b from-white via-[#f7f9fb] to-[#f2f6f8] shadow-2xl flex flex-col z-30 border-l border-gray-100 transition-all duration-300">
        {/* Toggle Button */}
        <div className="flex items-center justify-center p-4 border-b border-gray-100">
          <button 
            onClick={toggleSidebar}
            className="text-gray-600 hover:text-gray-900 p-2 rounded-full transition hover:bg-gray-100"
          >
            <ChevronLeft size={22} />
          </button>
        </div>
        {/* Chat Icon */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <MessageCircle size={24} className="text-gray-600 mb-2" />
          <span className="text-xs text-gray-500 font-medium rotate-90 mt-4 whitespace-nowrap">
            Chat
          </span>
        </div>
        {/* Unread count badge */}
        <div className="p-4 flex justify-center">
          <div className="w-8 h-8 rounded-full bg-[#4DC591] text-white flex items-center justify-center text-sm font-bold">
            {chat.length > 99 ? '99+' : chat.length}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed right-0 top-0 h-full w-[300px] bg-gradient-to-b from-white via-[#f7f9fb] to-[#f2f6f8] shadow-2xl rounded-l-3xl flex flex-col z-30 border-l border-gray-100 transition-all duration-300">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-7 py-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition hover:bg-gray-100"
          >
            <ChevronRight size={20} />
          </button>
          <span className="font-bold text-2xl text-gray-900 tracking-tight">{userName}</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-2 rounded-full transition hover:bg-gray-100">
          <MoreVertical size={22} />
        </button>
      </div>
      {/* Pinned Message */}
      {pinnedMessage && (
        <div className="mx-4 my-2 p-4 rounded-2xl bg-yellow-100 border-l-4 border-yellow-400 flex items-start gap-3 shadow">
          <img 
            src={pinnedMessage.avatar || "/logo.png"} 
            alt={pinnedMessage.user}
            className="w-9 h-9 rounded-full object-cover border-2 border-white shadow" 
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-yellow-900 text-base truncate">{pinnedMessage.user}</span>
              <span className="text-xs text-yellow-600 font-medium ml-2 whitespace-nowrap">{pinnedMessage.time}</span>
            </div>
            <div className="text-yellow-800 text-[15px] mt-1">{pinnedMessage.message}</div>
          </div>
          <button
            className="ml-2 text-yellow-600 hover:text-yellow-900 p-1 rounded transition"
            title="Unpin message"
            onClick={handleUnpinMessage}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Chat List */}
      <div ref={chatListRef} className="flex-1 overflow-y-auto px-2 py-4 space-y-1 bg-transparent scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
        {chat.length === 0 ? (
          <div className="text-gray-400 text-center mt-10">No chat messages yet</div>
        ) : (
          chat.map((msg, idx) => {
            const isSender = session?.user?.email === msg.email;
            
            // Use message.id if it exists, otherwise fall back to index with timestamp
            const messageKey = msg.id || `${msg.user}-${msg.timestamp || idx}-${msg.message}`;
            
            return (
              <div
                key={messageKey}
                className={`flex items-end gap-2 px-3 py-2 rounded-xl bg-white/90 hover:bg-green-50 transition shadow-sm mb-2 max-w-[90%] ${isSender ? 'ml-auto flex-row-reverse' : 'mr-auto'} `}
                style={{ minHeight: 48 }}
              >
                <img
                  src={msg.avatar || "/logo.png"}
                  alt={msg.user}
                  className="w-8 h-8 rounded-full object-cover border border-white shadow"
                  style={{ marginLeft: isSender ? 0 : 4, marginRight: isSender ? 4 : 0 }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-[12px] truncate whitespace-nowrap max-w-[110px]">{msg.user}</span>
                    <span className="text-[11px] text-gray-400 font-medium ml-2 whitespace-nowrap">{msg.time}</span>
                  </div>
                  <div className="text-gray-700 text-[13px] mt-0.5 break-words whitespace-pre-line">
                    {msg.message.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                      /^https?:\/\//.test(part) ? (
                        <a key={`${messageKey}-part-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{part}</a>
                      ) : (
                        <span key={`${messageKey}-part-${i}`}>{part}</span>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Message Input */}
      <form className="px-7 py-5 border-t border-gray-100 bg-white/90" style={{marginBottom: 5}} onSubmit={handleSend}>
        <div className="flex items-center gap-2 rounded-xl bg-[#f7f9fb] px-3 py-2 shadow-inner">
          <textarea
            id="chat-message"
            name="chat-message"
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none outline-none text-gray-800 text-base placeholder-gray-400 resize-none min-h-[36px] max-h-32 overflow-y-auto"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={1}
            onInput={e => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button 
            type="submit" 
            className="p-2 bg-[#4DC591] hover:bg-[#3bb17a] text-white rounded-lg font-medium flex items-center justify-center transition"
            disabled={!message.trim()}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor" 
              className="w-6 h-6"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M3 12l18-6-6 18-2-8-8-2z" 
              />
            </svg>
          </button>
        </div>
      </form>
    </aside>
  );
}