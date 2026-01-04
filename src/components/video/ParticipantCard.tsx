"use client";
import React, { useState } from "react";
import { MicOff, UserX, Laptop, Smartphone, Mic } from "lucide-react";
import { useSpeakingIndicator } from "./useSpeakingIndicator";
import { useSession } from "next-auth/react";

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted?: boolean;
  deviceType?: 'desktop' | 'mobile';
  audioStream?: MediaStream | null;
  email?: string;
  isSpeaking?: boolean;
}

interface ParticipantCardProps {
  participant: Participant;
  showOverflow?: boolean;
  overflowCount?: number;
}

export default function ParticipantCard({ participant, showOverflow = false, overflowCount = 0 }: ParticipantCardProps) {
  const [hovered, setHovered] = useState(false);
  const { data: session } = useSession();
  
  // Defensive: always boolean
  const isMuted = !!participant.isMuted;
  
  // Only use local speaking detection for the local participant
  const isLocal = session?.user?.email && participant?.email && session.user.email === participant.email;
  const isSpeaking = isLocal
    ? useSpeakingIndicator(participant.audioStream ?? null, isMuted)
    : !!participant.isSpeaking;

  // Mic icon logic: only one at a time, always correct
  let micIcon = null;
  if (isMuted) {
    micIcon = (
      <div className="absolute top-3 right-3 z-30 bg-white rounded-full p-1 shadow-md flex items-center justify-center">
        <MicOff size={18} className="text-red-500" />
      </div>
    );
  } else if (isSpeaking) {
    micIcon = (
      <div className="absolute top-3 right-3 z-30 bg-white rounded-full p-1 shadow-md flex items-center justify-center animate-pulse">
        <Mic size={18} className="text-green-500" />
      </div>
    );
  }

  return (
    <div
      className="relative group rounded-3xl overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#f2f7fa] to-[#e6f9f1] flex flex-col items-center justify-start border border-white/80 shadow-xl hover:shadow-2xl transition-all w-[180px] h-[210px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ boxShadow: hovered ? '0 8px 32px 0 #4DC59133, 0 1.5px 8px 0 #b6e7d6' : '0 2px 16px 0 #e0e0e0', transition: 'box-shadow 0.3s' }}
    >
      {/* Device Type Icon (top-left) */}
      <div className="absolute top-3 left-3 z-20 bg-white/80 rounded-full p-1 shadow-md flex items-center justify-center">
        {participant.deviceType === 'mobile' ? (
          <Smartphone size={18} className="text-gray-400" />
        ) : (
          <Laptop size={18} className="text-gray-400" />
        )}
      </div>
      {/* Mic Icon (top-right, bulletproof) */}
      {micIcon}

      {/* Avatar with border, glow, and status dot */}
      <div className="relative flex flex-col items-center justify-center mt-4 mb-1">
        <div className="relative">
          <img
            src={participant.avatar || "/logo.png"}
            alt={participant.name}
            className={`w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-[#4DC59133] group-hover:ring-[#4DC591] transition-all duration-300 ${isSpeaking ? 'ring-4 ring-green-400 animate-pulse' : ''}`}
            style={{ boxShadow: hovered ? '0 0 0 6px #e6f9f1, 0 0 24px 4px #4DC59133' : '0 0 0 4px #e6f9f1', transition: 'box-shadow 0.3s' }}
          />
          
          {/* Online Dot */}
          <span className="absolute bottom-1 right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
            <span className="w-3 h-3 rounded-full bg-green-400 shadow" />
          </span>
        </div>
        
        {/* Animated Hover Actions: Mute/Remove (horizontal) */}
        <div className={`flex flex-row items-center justify-center gap-3 mt-4 transition-all duration-300 ${hovered && !showOverflow ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`}>
          <button className="bg-white/90 hover:bg-green-100 text-gray-700 hover:text-green-600 rounded-full p-2.5 shadow transition-all duration-200">
            <MicOff size={18} />
          </button>
          <button className="bg-white/90 hover:bg-red-100 text-gray-700 hover:text-red-600 rounded-full p-2.5 shadow transition-all duration-200">
            <UserX size={18} />
          </button>
        </div>
      </div>
      
      {/* Name & Status below avatar */}
      <div className="flex flex-col items-center justify-center w-full mt-0">
        <div className="flex items-center justify-center w-full relative">
          <span className="font-semibold text-gray-900 text-lg truncate max-w-[120px] text-center tracking-tight" style={{letterSpacing: '-0.5px', marginTop: 0}}>
            {participant.name}
          </span>
          
          {/* Add a small muted indicator near the name for clarity */}
          {isMuted && (
            <div className="absolute -right-6 bg-red-100 rounded-full p-1">
              <MicOff size={14} className="text-red-500" />
            </div>
          )}
        </div>
        <span className="mt-1 text-green-500 text-base font-medium tracking-wide">Online</span>
      </div>
      
      {/* Overflow Badge */}
      {showOverflow && overflowCount > 0 && (
        <div className="absolute top-3 right-3 z-30">
          <span className="inline-block bg-[#4DC591] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
            +{overflowCount}
          </span>
        </div>
      )}
    </div>
  );
}