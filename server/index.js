// --- Screen Sharing State ---
let activeScreenShare = null; // Store { meetingId, userId }
// Simple Socket.IO signaling server for Gatimitra Touch
const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Room structure: { [roomId]: { participants: Set<socketId>, orgs: { [socketId]: org }, users: { [socketId]: user } } }
const rooms = {};

io.on("connection", (socket) => {
  console.log("New socket connected:", socket.id);
  socket.on("join-room", (data) => {
    const meetingId = data.meetingId || data.roomId;
    const user = data.user;
    console.log("join-room event:", { meetingId, user, socketId: socket.id });
    if (!rooms[meetingId]) rooms[meetingId] = { participants: new Set(), users: {} };
    rooms[meetingId].participants.add(socket.id);
    rooms[meetingId].users[socket.id] = user;
    socket.join(meetingId);
    io.to(meetingId).emit("participant-joined", { ...user, id: socket.id });
    // Send all participants to the new joiner
    const allParticipants = Array.from(rooms[meetingId].participants).map(id => ({
      id,
      ...rooms[meetingId].users[id],
    }));
    socket.emit("room-participants", allParticipants);
  });

  // --- Screen Sharing Handlers ---
  socket.on('screen-share-start', (data) => {
    const { meetingId, userId } = data;
    // If there's already an active screen share in this meeting, stop it
    if (activeScreenShare && activeScreenShare.meetingId === meetingId) {
      // Notify the previous screen sharer to stop
      io.to(activeScreenShare.userId).emit('screen-share-stop', {
        userId: activeScreenShare.userId
      });
    }
    // Set new active screen share
    activeScreenShare = { meetingId, userId };
    // Broadcast to all participants in the meeting
    socket.to(meetingId).emit('screen-share-start', { userId });
    console.log(`User ${userId} started screen sharing in meeting ${meetingId}`);
  });

  socket.on('screen-share-stop', (data) => {
    const { meetingId, userId } = data;
    if (activeScreenShare && 
        activeScreenShare.meetingId === meetingId && 
        activeScreenShare.userId === userId) {
      activeScreenShare = null;
    }
    // Broadcast to all participants in the meeting
    socket.to(meetingId).emit('screen-share-stop', { userId });
    console.log(`User ${userId} stopped screen sharing in meeting ${meetingId}`);
  });

  socket.on('get-screen-share-status', (data) => {
    const { meetingId } = data;
    if (activeScreenShare && activeScreenShare.meetingId === meetingId) {
      socket.emit('screen-share-status', { userId: activeScreenShare.userId });
    } else {
      socket.emit('screen-share-status', { userId: null });
    }
  });

  socket.on("signal", (data) => {
    const roomId = data.meetingId || data.roomId;
    io.to(data.to).emit("signal", { from: socket.id, data: data.data });
  });

  socket.on("chat", (data) => {
    console.log('chat event:', data);
    const meetingId = data.meetingId || data.roomId;
    const { user, avatar, email, message, time } = data;
    // Defensive: ensure required fields
    if (!meetingId || !user || !message) return;
    io.to(meetingId).emit("chat", { from: socket.id, user, avatar, email, message, time });
  });

  socket.on("kick", (data) => {
    const roomId = data.meetingId || data.roomId;
    io.to(data.target).emit("kicked");
    io.sockets.sockets.get(data.target)?.leave(roomId);
    rooms[roomId]?.participants.delete(data.target);
    delete rooms[roomId]?.orgs[data.target];
  });

  socket.on("mute", (data) => {
    const roomId = data.meetingId || data.roomId;
    io.to(data.target).emit("muted");
  });

  // --- Message Pinning ---
  socket.on("pin-message", (data) => {
    const meetingId = data.meetingId || data.roomId;
    const msg = data.msg;
    if (!meetingId || !msg) return;
    io.to(meetingId).emit("pin-message", msg);
  });

  socket.on("unpin-message", (data) => {
    const meetingId = data.meetingId || data.roomId;
    if (!meetingId) return;
    io.to(meetingId).emit("unpin-message");
  });

  socket.on("request-access", (data) => {
    const roomId = data.meetingId || data.roomId;
    // Notify all in room
    socket.to(roomId).emit("access-request", { id: socket.id, user: data.user, org: data.org });
  });

  socket.on("admit", (data) => {
    const roomId = data.meetingId || data.roomId;
    const target = data.target;
    if (!rooms[roomId]) return;
    rooms[roomId].participants.add(target);
    // org already set on join-room
    io.to(target).emit("admitted");
    // Notify all
    io.to(roomId).emit("participant-joined", { ...rooms[roomId].users[target], id: target, org: rooms[roomId].orgs ? rooms[roomId].orgs[target] : undefined });
    // Send all participants (including self) to the admitted user
    const allParticipants = Array.from(rooms[roomId].participants).map(id => ({
      id,
      ...rooms[roomId].users[id],
      org: rooms[roomId].orgs ? rooms[roomId].orgs[id] : undefined,
    }));
    io.to(target).emit("room-participants", allParticipants);
  });

  socket.on("disconnecting", () => {
    for (const meetingId of socket.rooms) {
      if (rooms[meetingId]) {
        rooms[meetingId].participants.delete(socket.id);
        delete rooms[meetingId].users[socket.id];
        io.to(meetingId).emit("participant-left", { id: socket.id });
      }
    }
    // Clean up screen share when user disconnects
    if (activeScreenShare && activeScreenShare.userId === socket.id) {
      io.to(activeScreenShare.meetingId).emit('screen-share-stop', {
        userId: socket.id
      });
      activeScreenShare = null;
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
