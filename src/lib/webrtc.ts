import { getSession } from "next-auth/react";
import { connectSocket } from "@/lib/socket";
import { isSocketConnected, getSocketError } from "@/lib/socket";
import { useMeetingStore } from "@/context/meetingContext";
import { useEffect } from "react";

export function useMeetingSocket(meetingId: string, serverUrl: string) {
  const addParticipant = useMeetingStore((s) => s.addParticipant);
  const removeParticipant = useMeetingStore((s) => s.removeParticipant);
  const addChat = useMeetingStore((s) => s.addChat);
  const setParticipants = useMeetingStore((s) => s.setParticipants);
  const muteParticipant = useMeetingStore((s) => s.muteParticipant);
  const kickParticipant = useMeetingStore((s) => s.kickParticipant);
  const requestAccess = useMeetingStore((s) => s.requestAccess);
  const admitParticipant = useMeetingStore((s) => s.admitParticipant);

  useEffect(() => {
    let socket = connectSocket(serverUrl.replace("localhost", "192.168.31.82"));
    let user: any = null;
    let joined = false;

    // All join logic and event listeners must be set up after socket connects
    const handleConnect = () => {
      getSession().then((session) => {
        user = session?.user;
        if (!user) return;
        // Device detection: persist deviceType in localStorage to prevent changes on Desktop View
        let deviceType: 'desktop' | 'mobile' = 'desktop';
        if (typeof window !== 'undefined') {
          const persisted = window.localStorage.getItem('gatitouch_deviceType');
          if (persisted === 'mobile' || persisted === 'desktop') {
            deviceType = persisted;
          } else {
            const ua = navigator.userAgent || '';
            if (/Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
              deviceType = 'mobile';
            }
            window.localStorage.setItem('gatitouch_deviceType', deviceType);
          }
        }
        if (!joined) {
          console.log('[Socket] Emitting join-room:', {
            meetingId,
            user: {
              id: socket.id || '',
              name: user?.name,
              avatar: user?.image,
              email: user?.email,
              deviceType,
            },
          });
          socket.emit("join-room", {
            meetingId,
            user: {
              id: socket.id || '',
              name: user?.name,
              avatar: user?.image,
              email: user?.email,
              deviceType,
            },
          });
          // Add local user to Zustand immediately after join
          addParticipant({
            id: socket.id || '',
            name: user?.name,
            avatar: user?.image,
            email: user?.email,
            deviceType,
            isMuted: false,
          });
          console.log('[Zustand] Added local participant:', {
            id: socket.id || '',
            name: user?.name,
            avatar: user?.image,
            email: user?.email,
            deviceType,
            isMuted: false,
          });
          joined = true;
        }
      });

      // Robust event listeners with error handling
      const onParticipantJoined = (p: any) => {
        addParticipant({ ...p, isMuted: false });
        console.log('[Socket] participant-joined event:', p);
      };
      const onParticipantLeft = ({ id }: any) => {
        console.log('[Socket] participant-left event:', id);
        removeParticipant(id);
      };
      const onRoomParticipants = (ps: any[]) => {
        // Always update Zustand with all participants received from server
        setParticipants(ps.map(p => ({
          ...p,
          isMuted: typeof p.isMuted === 'boolean' ? p.isMuted : false,
          deviceType: p.deviceType || 'desktop',
        })));
        console.log('[Socket] room-participants event:', ps);
      };
      const onChat = (msg: any) => {
        addChat(msg);
      };
      const onMuted = () => { if (user && typeof socket.id === 'string') muteParticipant(socket.id); };
      const onKicked = () => { if (user && typeof socket.id === 'string') kickParticipant(socket.id); };
      const onAccessRequest = (p: any) => requestAccess(p);
      const onAdmitted = () => { if (user && typeof socket.id === 'string') admitParticipant(socket.id); };

      socket.on("participant-joined", onParticipantJoined);
      socket.on("participant-left", onParticipantLeft);
      socket.on("room-participants", onRoomParticipants);
      socket.on("chat", onChat);
      socket.on("muted", onMuted);
      socket.on("kicked", onKicked);
      socket.on("access-request", onAccessRequest);
      socket.on("admitted", onAdmitted);

      // Clean up listeners on unmount
      return () => {
        socket.off("participant-joined", onParticipantJoined);
        socket.off("participant-left", onParticipantLeft);
        socket.off("room-participants", onRoomParticipants);
        socket.off("chat", onChat);
        socket.off("muted", onMuted);
        socket.off("kicked", onKicked);
        socket.off("access-request", onAccessRequest);
        socket.off("admitted", onAdmitted);
      };
    };

    // Listen for socket connect event
    socket.on('connect', handleConnect);

    // If already connected, run immediately
    if (socket.connected) {
      handleConnect();
    }

    // Clean up on unmount
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [meetingId, serverUrl]);

  // Emitters for controls
  return {
    mute: (target: string) => {
      const socket = connectSocket(serverUrl);
      if (isSocketConnected()) {
        socket.emit("mute", { meetingId, target });
      } else {
        console.warn("Socket not connected, cannot mute.", getSocketError());
      }
    },
    kick: (target: string) => {
      const socket = connectSocket(serverUrl);
      if (isSocketConnected()) {
        socket.emit("kick", { meetingId, target });
      } else {
        console.warn("Socket not connected, cannot kick.", getSocketError());
      }
    },
    requestAccess: (user: any, org: string) => {
      const socket = connectSocket(serverUrl);
      if (isSocketConnected()) {
        socket.emit("request-access", { meetingId, user, org });
      } else {
        console.warn("Socket not connected, cannot request access.", getSocketError());
      }
    },
    admit: (target: string) => {
      const socket = connectSocket(serverUrl);
      if (isSocketConnected()) {
        socket.emit("admit", { meetingId, target });
      } else {
        console.warn("Socket not connected, cannot admit participant.", getSocketError());
      }
    },
    sendChat: (user: any, message: string) => {
      if (!user || !user.name) return;
      const socket = connectSocket(serverUrl);
      if (isSocketConnected()) {
        socket.emit("chat", {
          meetingId,
          user: user.name,
          avatar: user.image,
          email: user.email,
          message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        console.warn("Socket not connected, cannot send chat.", getSocketError());
      }
    },
  };
}
