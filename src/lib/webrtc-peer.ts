import { useRef, useEffect, useCallback } from "react";
import { getSocket } from "@/lib/socket";

interface SignalData {
  from: string;
  data: {
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
}

interface PeerConnection {
  [id: string]: RTCPeerConnection;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

// Custom hook for WebRTC peer logic - AUDIO ONLY FOCUS
export function useWebRTCPeer({
  meetingId,
  localStream,
  isMuted
}: {
  meetingId: string;
  localStream: MediaStream | null;
  isMuted: boolean;
}) {
  const peers = useRef<PeerConnection>({});
  const socket = getSocket("http://192.168.31.82:5000");
  
  // Audio track reference
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const audioElements = useRef<{ [id: string]: HTMLAudioElement }>({});

  // Initialize audio track from local stream
  useEffect(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTrackRef.current = audioTracks[0];
        console.log("Audio track initialized:", audioTrackRef.current.id);
        
        // Set initial mute state
        if (audioTrackRef.current) {
          audioTrackRef.current.enabled = !isMuted;
        }
      } else {
        console.warn("No audio track found in local stream");
      }
    }
  }, [localStream]);

  // Update mute state
  useEffect(() => {
    if (audioTrackRef.current) {
      audioTrackRef.current.enabled = !isMuted;
      console.log("Audio track enabled:", !isMuted);
    }
  }, [isMuted]);

  // Create a new peer connection - AUDIO FOCUSED
  const createPeerConnection = useCallback((peerId: string, isInitiator = false): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceTransportPolicy: "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require"
    });

    // Add audio track only
    if (localStream && audioTrackRef.current) {
      // Check if audio track is already added
      const hasAudio = pc.getSenders().some(sender => 
        sender.track?.kind === 'audio' && sender.track.id === audioTrackRef.current?.id
      );
      
      if (!hasAudio) {
        try {
          pc.addTrack(audioTrackRef.current, localStream);
          console.log(`[Peer ${peerId}] Added audio track`);
        } catch (error) {
          console.error(`[Peer ${peerId}] Error adding audio track:`, error);
        }
      }
    }

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("signal", {
          meetingId,
          to: peerId,
          data: { candidate: event.candidate.toJSON() }
        });
      }
    };

    // Handle incoming audio tracks
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      
      // Create or update audio element for remote audio
      if (!audioElements.current[peerId]) {
        const audioElem = document.createElement('audio');
        audioElem.id = `remote-audio-${peerId}`;
        audioElem.autoplay = true;
        audioElem.style.display = 'none';
        audioElem.volume = 1.0;
        document.body.appendChild(audioElem);
        audioElements.current[peerId] = audioElem;
      }
      
      if (stream && audioElements.current[peerId]) {
        audioElements.current[peerId].srcObject = stream;
        console.log(`[Peer ${peerId}] Audio stream attached`);
        
        // Log audio track info
        stream.getAudioTracks().forEach(track => {
          console.log(`[Peer ${peerId}] Received audio track:`, track.id, "enabled:", track.enabled);
          // Force audio playback (mobile workaround)
          audioElements.current[peerId].play().catch(e => {
            console.warn(`[Peer ${peerId}] Auto-play prevented:`, e);
          });
        });
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log(`[Peer ${peerId}] Connection state: ${pc.connectionState}`);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setTimeout(() => {
          if (pc.connectionState !== "connected" && pc.connectionState !== "connecting") {
            console.log(`[Peer ${peerId}] Attempting ICE restart`);
            pc.restartIce();
          }
        }, 2000);
      }
    };

    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`[Peer ${peerId}] ICE state: ${pc.iceConnectionState}`);
    };

    // Handle negotiation needed (for audio)
    pc.onnegotiationneeded = async () => {
      if (isInitiator && socket) {
        try {
          // Only create offer if signalingState is 'stable'
          if (pc.signalingState !== 'stable') {
            console.warn(`[Peer ${peerId}] Skipping negotiation: signalingState is ${pc.signalingState}`);
            return;
          }
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false // Audio only focus
          });
          // Defensive: check m-line order and signaling state
          if (pc.signalingState !== 'stable') {
            console.warn(`[Peer ${peerId}] Not setting localDescription, signalingState is ${pc.signalingState}`);
            return;
          }
          await pc.setLocalDescription(offer);
          socket.emit("signal", {
            meetingId,
            to: peerId,
            data: { sdp: pc.localDescription }
          });
          console.log(`[Peer ${peerId}] Sent audio offer`);
        } catch (error) {
          console.error(`[Peer ${peerId}] Error creating offer:`, error);
        }
      }
    };

    return pc;
  }, [meetingId, localStream, socket]);

  // Handle incoming signals
  const handleSignal = useCallback(async ({ from, data }: SignalData) => {
    console.log(`[Signal from ${from}]`, data.sdp?.type || "candidate");
    let pc = peers.current[from];
    if (!pc) {
      pc = createPeerConnection(from, false);
      peers.current[from] = pc;
    }
    try {
      if (data.sdp) {
        const remoteDesc = new RTCSessionDescription(data.sdp);
        // Defensive: only set remoteDescription if possible
        if (
          (data.sdp.type === "offer" && pc.signalingState === "stable") ||
          (data.sdp.type === "answer" && pc.signalingState === "have-local-offer")
        ) {
          await pc.setRemoteDescription(remoteDesc);
        } else {
          console.warn(`[Peer ${from}] Skipping setRemoteDescription: type=${data.sdp.type}, signalingState=${pc.signalingState}`);
          return;
        }
        if (data.sdp.type === "offer") {
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
          });
          if (pc.signalingState === "have-remote-offer") {
            await pc.setLocalDescription(answer);
            if (socket) {
              socket.emit("signal", {
                meetingId,
                to: from,
                data: { sdp: pc.localDescription }
              });
            }
            console.log(`[Peer ${from}] Sent audio answer`);
          } else {
            console.warn(`[Peer ${from}] Skipping setLocalDescription for answer, signalingState=${pc.signalingState}`);
          }
        }
      } else if (data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error(`[Peer ${from}] Error adding ICE candidate:`, error);
        }
      }
    } catch (error) {
      console.error(`[Peer ${from}] Error handling signal:`, error);
    }
  }, [createPeerConnection, meetingId, socket]);

  // Set up socket listener for audio signals
  useEffect(() => {
    if (!socket) return;
    
    socket.on("signal", handleSignal);
    return () => {
      socket.off("signal", handleSignal);
    };
  }, [socket, handleSignal]);

  // Clean up audio elements and connections
  useEffect(() => {
    return () => {
      // Clean up peer connections
      Object.entries(peers.current).forEach(([id, pc]) => {
        pc.close();
        delete peers.current[id];
      });
      
      // Clean up audio elements
      Object.values(audioElements.current).forEach(audioElem => {
        if (audioElem.parentNode) {
          audioElem.parentNode.removeChild(audioElem);
        }
      });
      audioElements.current = {};
    };
  }, []);

  // Create audio offer for new participant
  const createOffer = useCallback(async (peerId: string) => {
    if (!localStream || !socket) {
      console.error("Cannot create offer: No local stream or socket");
      return;
    }

    // Clean up existing connection
    if (peers.current[peerId]) {
      peers.current[peerId].close();
      delete peers.current[peerId];
    }

    const pc = createPeerConnection(peerId, true);
    peers.current[peerId] = pc;

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false // Audio only
      });
      
      await pc.setLocalDescription(offer);
      
      socket.emit("signal", {
        meetingId,
        to: peerId,
        data: { sdp: pc.localDescription }
      });
      
      console.log(`[Peer ${peerId}] Created audio offer`);
    } catch (error) {
      console.error(`[Peer ${peerId}] Error creating audio offer:`, error);
      if (peers.current[peerId]) {
        peers.current[peerId].close();
        delete peers.current[peerId];
      }
    }
  }, [meetingId, localStream, socket, createPeerConnection]);

  // Close audio connection
  const closeConnection = useCallback((peerId: string) => {
    if (peers.current[peerId]) {
      peers.current[peerId].close();
      delete peers.current[peerId];
    }
    
    // Remove audio element
    if (audioElements.current[peerId]) {
      const audioElem = audioElements.current[peerId];
      if (audioElem.parentNode) {
        audioElem.parentNode.removeChild(audioElem);
      }
      delete audioElements.current[peerId];
    }
  }, []);

  // Get active audio peers
  const getActivePeers = useCallback(() => {
    return Object.keys(peers.current);
  }, []);

  // Audio-specific mute control
  const setMicMuted = useCallback((muted: boolean) => {
    if (audioTrackRef.current) {
      audioTrackRef.current.enabled = !muted;
      
      // Also update all peer connections
      Object.values(peers.current).forEach(pc => {
        const senders = pc.getSenders();
        const audioSender = senders.find(s => s.track?.kind === 'audio');
        if (audioSender && audioSender.track) {
          audioSender.track.enabled = !muted;
        }
      });
    }
  }, []);

  return {
    createOffer,
    closeConnection,
    getActivePeers,
    setMicMuted,
    audioTrack: audioTrackRef.current
  };
}