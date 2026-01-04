import { io, Socket } from "socket.io-client";

/**
 * Single socket instance (singleton)
 */
let socket: Socket | null = null;
let socketError: string | null = null;

/**
 * Connect socket with full configuration
 */
export function connectSocket(
  serverUrl: string,
  options?: {
    token?: string;
    userId?: string;
  }
) {
  if (!socket) {
    socket = io(serverUrl, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
      auth: {
        token: options?.token,
        userId: options?.userId,
      },
    });

    /* ---------------- Connection lifecycle ---------------- */

    socket.on("connect", () => {
      socketError = null;
      console.log("✅ Socket connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      socketError = reason;
      console.log("❌ Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      socketError = error.message || "Unknown error";
      console.warn("⚠️ Socket connection error:", socketError);
    });
  }

  return socket;
}

/**
 * Get existing socket
 */
export function getSocket(serverUrl?: string) {
  if (!socket) {
    if (serverUrl) {
      return connectSocket(serverUrl);
    }
    throw new Error("Socket not initialized. Call connectSocket first, or provide a serverUrl.");
  }
  return socket;
}

/**
 * Check if socket is connected
 */
export function isSocketConnected() {
  return socket?.connected === true && !socketError;
}

/**
 * Get last socket error
 */
export function getSocketError() {
  return socketError;
}

/**
 * Disconnect socket safely
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// All chat and meeting socket events should use the same event names as the backend:
// "join-room", "chat", "participant-joined", "room-participants", etc.

// Remove unused or mismatched helpers to avoid confusion.
