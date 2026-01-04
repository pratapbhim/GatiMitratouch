"use client";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useMeetingSocket } from "@/lib/webrtc";
import MeetingSkeleton from "./MeetingSkeleton";
import { useMeetingStore } from "@/context/meetingContext";
import { useWebRTCPeer } from "@/lib/webrtc-peer";
import { Search, Mic, MicOff, Video, VideoOff, MoreVertical, Phone, ScreenShare } from "lucide-react";
import ChatSidebar from "../chat/ChatSidebar";
import ParticipantSidebar from "./ParticipantSidebar";
import { connectSocket } from "@/lib/socket";
import ParticipantGrid from "./ParticipantGrid";

export default function MeetingRoom({ meetingId }: { meetingId: string }) {
  const { data: session } = useSession();
  
  // Fixed: Only declare participants once
  const participants = useMeetingStore((s) => s.participants);
  const chat = useMeetingStore((s) => s.chat);
  
  // Debug: Log Zustand participants on every change
  useEffect(() => {
    console.log('Current participants in MeetingRoom:', participants);
  }, [participants]);
  
  // --- Screen Wake Lock ---
  useEffect(() => {
    let wakeLock: any = null;
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.warn('Wake Lock not available:', err);
      }
    }
    requestWakeLock();
    return () => {
      if (wakeLock && typeof wakeLock.release === 'function') {
        wakeLock.release();
      }
    };
  }, []);
  
  // Ensure socket connection is established once at the top level
  useEffect(() => {
    connectSocket("http://192.168.31.82:5000");
  }, []);
  
  const controls = useMeetingSocket(meetingId, "http://192.168.31.82:5000");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [participantSidebarOpen, setParticipantSidebarOpen] = useState(false);
  const [accessRequested, setAccessRequested] = useState(false);
  const [admitted, setAdmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRefs = useRef<{ [id: string]: HTMLVideoElement | null }>({});
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  
  // WebRTC peer connection for audio
  const { createOffer, setMicMuted, closeConnection } = useWebRTCPeer({ 
    meetingId, 
    localStream, 
    isMuted 
  });
  
  const [chatInput, setChatInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize media stream with audio focus
  useEffect(() => {
    setLoading(true);
    
    const initMediaStream = async () => {
      try {
        console.log("Initializing audio stream...");
        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn("mediaDevices.getUserMedia is not available on this device/browser.");
          setHasPermissions(false);
          setLocalStream(null);
          setLoading(false);
          setError("Microphone not supported on this device or browser.");
          return;
        }
        // First try to get only audio (better compatibility)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1
          },
          video: false // Start with audio only
        });
        // Log audio track details
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          console.error("No audio tracks found!");
          throw new Error("No audio device available");
        }
        
        console.log("Audio track initialized:", {
          id: audioTracks[0].id,
          label: audioTracks[0].label,
          enabled: audioTracks[0].enabled,
          muted: audioTracks[0].muted
        });
        
        // Set initial mute state
        audioTracks[0].enabled = !isMuted;
        
        // Try to add video if available (optional)
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user"
            }
          });
          
          videoStream.getVideoTracks()[0].enabled = !isVideoOff;
          
          // Combine audio and video tracks
          const combinedStream = new MediaStream([
            ...audioTracks,
            ...videoStream.getVideoTracks()
          ]);
          
          setLocalStream(combinedStream);
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = combinedStream;
          }
        } catch (videoError) {
          // If video fails, just use audio
          console.log("Video not available, using audio only");
          setLocalStream(stream);
        }
        
        setHasPermissions(true);
        setLoading(false);
        
      } catch (err: any) {
        console.error("Error accessing media devices:", err);
        setHasPermissions(false);
        setLocalStream(null);
        setLoading(false);
        
        // Specific error handling
        if (err.name === 'NotAllowedError') {
          setError("Microphone permission denied. Please allow microphone access.");
        } else if (err.name === 'NotFoundError') {
          setError("No microphone found. Please connect a microphone.");
        } else {
          setError("Unable to access microphone. Please check your device permissions.");
        }
      }
    };

    initMediaStream();

    // Cleanup on unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => {
          track.stop();
          console.log("Stopped track:", track.kind);
        });
      }
    };
  }, []);

  // Listen for access/admit events
  useEffect(() => {
    if (!controls) return;
    const socket = require("@/lib/socket").getSocket("http://192.168.31.82:5000");
    if (!socket) return;
    const onAccessRequest = () => setAccessRequested(true);
    const onAdmitted = () => {
      setAdmitted(true);
      setAccessRequested(false);
    };
    socket.on("access-request", onAccessRequest);
    socket.on("admitted", onAdmitted);
    return () => {
      socket.off("access-request", onAccessRequest);
      socket.off("admitted", onAdmitted);
    };
  }, [controls]);

  // When a new participant joins, create audio offer
  useEffect(() => {
    if (!localStream || participants.length <= 1) return;
    
    // Get all participant IDs except local
    const remoteParticipants = participants.filter(p => p.id !== "local");
    
    remoteParticipants.forEach((participant) => {
      if (!videoRefs.current[participant.id]) {
        console.log(`Creating audio offer for participant: ${participant.id} (${participant.name})`);
        createOffer(participant.id);
      }
    });
  }, [participants, localStream, createOffer]);

  // Handle participant leaving - close audio connection
  useEffect(() => {
    // This would need to track previous participants state
    // For simplicity, we'll rely on socket events to trigger closeConnection
  }, [participants]);

  // Screen sharing
  const handleScreenShare = async () => {
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: true,
          audio: true 
        });
        
        // Get current audio track
        const audioTracks = localStream?.getAudioTracks() || [];
        
        // Combine screen video with existing audio
        const combinedStream = new MediaStream([
          ...audioTracks,
          ...screenStream.getVideoTracks()
        ]);
        
        setLocalStream(combinedStream);
        setScreenSharing(true);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = combinedStream;
        }
        
        // Handle when screen sharing stops
        screenStream.getVideoTracks()[0].onended = () => {
          handleStopScreenShare();
        };
        
      } catch (err) {
        console.error("Screen sharing error:", err);
      }
    } else {
      handleStopScreenShare();
    }
  };

  const handleStopScreenShare = async () => {
    try {
      // Revert to camera
      const userStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      setLocalStream(userStream);
      setScreenSharing(false);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = userStream;
      }
    } catch (err) {
      console.error("Error reverting to camera:", err);
    }
  };

  // Robust mic toggle - updates audio track on all peer connections
  const handleMuteToggle = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Update audio track
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !newMutedState;
        console.log(`Audio track ${track.id} enabled: ${track.enabled}`);
      });
    }
    
    // Update WebRTC connections
    setMicMuted(newMutedState);
    
    console.log(`Mic ${newMutedState ? 'muted' : 'unmuted'}`);
  };

  const handleVideoToggle = () => {
    const newVideoState = !isVideoOff;
    setIsVideoOff(newVideoState);
    
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !newVideoState;
        console.log(`Video track ${track.id} enabled: ${!newVideoState}`);
      });
    }
  };

  // Controls
  const handleMute = (id: string) => controls?.mute(id);
  const handleKick = (id: string) => controls?.kick(id);
  const handleAdmit = (id: string) => controls?.admit(id);
  
  const handleSendChat = () => {
    if (chatInput.trim() && controls) {
      controls.sendChat({
        name: session?.user?.name || "You",
        image: session?.user?.image,
        email: session?.user?.email
      }, chatInput);
      setChatInput("");
    }
  };

  if (loading) {
    return <MeetingSkeleton />;
  }
  

  // If permissions are denied, allow join in listen-only mode (non-blocking)
  const isMobile = typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const listenOnlyBanner = (!hasPermissions && error && !isMobile) ? (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-300 text-yellow-800 px-6 py-3 rounded-lg shadow-lg flex flex-col items-center max-w-lg">
      <div className="text-2xl mb-2">🔇</div>
      <div className="font-semibold mb-1">Microphone permission is off</div>
      <div className="text-sm mb-2">You can listen to the meeting, but cannot speak until you enable the mic.</div>
      <button
        onClick={() => {
          navigator.mediaDevices.getUserMedia({ audio: true }).then(() => window.location.reload());
        }}
        className="bg-[#4DC591] text-white px-4 py-1 rounded hover:bg-[#3daa7d] mt-1"
      >
        Enable Microphone
      </button>
    </div>
  ) : null;

  if (accessRequested && !admitted) {
    return (
      <div className="flex items-center justify-center h-screen text-yellow-600">
        Access requested. Waiting for approval...
      </div>
    );
  }

  // Filter participants based on search
  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  // Ensure every participant has all required fields for ParticipantCard
  const participantCards = participants.map((p: any) => ({
    id: p.id,
    name: p.name || 'Unknown',
    avatar: p.avatar || '/logo.png',
    isMuted: typeof p.isMuted === 'boolean' ? p.isMuted : false,
    deviceType: p.deviceType || 'desktop',
    role: p.role || 'participant',
  }));

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-[#f7f9fb] via-[#eaf3f7] to-[#e0f7ef]">
      {listenOnlyBanner}
      {/* Top Header */}
      <header
        className={`sticky top-0 z-40 flex items-center bg-white shadow-sm transition-all duration-300 ${sidebarOpen || participantSidebarOpen ? 'w-[calc(100%-300px)] px-8' : 'w-[calc(100%-4rem)] px-4'}`}
        style={{ minHeight: 72 }}
      >
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Gatimitra Touch" className="h-10 w-10" />
          <span className="text-2xl font-bold text-[#F37021]">
            Gatimitra <span className="text-[#4DC591]">Touch</span>
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <button
            className="text-base font-semibold text-gray-700 bg-gray-100 rounded-xl px-4 py-1 focus:outline-none focus:ring-2 focus:ring-green-300"
            onClick={() => {
              if (participantSidebarOpen) {
                setParticipantSidebarOpen(false);
                setSidebarOpen(true);
              } else if (sidebarOpen) {
                setSidebarOpen(false);
                setParticipantSidebarOpen(true);
              } else {
                setParticipantSidebarOpen(true);
              }
            }}
          >
            {participants.length} Active
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative flex flex-1 w-full max-w-[1600px] mx-auto pt-4 pb-24 px-8 gap-0 transition-all duration-300">
        {/* Participant Card Grid */}
        <div className={`flex-1 min-w-0 transition-all duration-300 ${(sidebarOpen || participantSidebarOpen) ? 'pr-[300px]' : 'pr-16'}`} style={{height: '100%'}}>
          {/* Hidden video element for local stream */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ display: 'none' }}
          />
          
          <ParticipantGrid
            participants={participantCards}
            sidebarOpen={sidebarOpen || participantSidebarOpen}
          />
        </div>
        
        {/* Chat Sidebar (Premium) */}
        <div className="absolute top-0 right-0 h-full z-30">
          <ChatSidebar 
            isOpen={sidebarOpen && !participantSidebarOpen} 
            setIsOpen={setSidebarOpen} 
          />
          <ParticipantSidebar 
            isOpen={participantSidebarOpen} 
            setIsOpen={setParticipantSidebarOpen} 
          />
        </div>
      </div>

      {/* Unified Controls & Chat Input Bar (Bottom Left) */}
      <div className="fixed left-16 z-20 flex items-end" style={{ bottom: 5 }}>
        <div className="flex gap-3 bg-white/90 rounded-full shadow-lg px-4 py-2 items-center border border-gray-200" style={{borderWidth:1}}>
          {/* Mic/Mute */}
          <button
            onClick={handleMuteToggle}
            className={`w-9 h-9 rounded-full flex items-center justify-center ${isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff size={19} /> : <Mic size={19} />}
          </button>
          
          {/* Video/Camera */}
          <button
            onClick={handleVideoToggle}
            className={`w-9 h-9 rounded-full flex items-center justify-center ${isVideoOff ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            title={isVideoOff ? 'Turn camera on' : 'Turn camera off'}
          >
            {isVideoOff ? <VideoOff size={19} /> : <Video size={19} />}
          </button>
          
          {/* Screen Share */}
          <button
            onClick={handleScreenShare}
            className={`w-9 h-9 rounded-full flex items-center justify-center ${screenSharing ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            title={screenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <ScreenShare size={19} />
          </button>
          
          {/* Bell/Notification (no-op, placeholder) */}
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Notifications (not implemented)"
            disabled
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          
          {/* Phone/Leave */}
          <button
            onClick={() => {
              // Stop all local media tracks
              if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
              }
              // Close all WebRTC connections
              participants.forEach(p => {
                if (p.id !== "local") {
                  closeConnection(p.id);
                }
              });
              // Redirect to home
              window.location.href = '/';
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-red-600 text-white hover:bg-red-700"
            title="Leave call"
          >
            <Phone size={19} />
          </button>
        </div>
      </div>

      {/* Audio status indicator */}
      {localStream && (
        <div className="fixed bottom-24 left-4 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
          Audio: {isMuted ? 'Muted' : 'Active'}
        </div>
      )}
    </div>
  );
}