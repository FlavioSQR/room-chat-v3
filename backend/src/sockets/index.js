import { verifySocketToken } from "../middleware/auth.js";
import { prisma } from "../config/prisma.js";

const MAX_PARTICIPANTS_PER_VOICE_CHANNEL = 20;

// voiceChannels: Map<channelId, Map<userId, { username }>>
const voiceChannels = new Map();

export function registerSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const payload = token ? verifySocketToken(token) : null;
    if (!payload) return next(new Error("Não autorizado"));
    socket.userId = payload.userId;
    next();
  });

  io.on("connection", (socket) => {
    prisma.user.findUnique({ where: { id: socket.userId } }).then((user) => {
      socket.data.username = user?.username || "Usuário";
    });

    // ---------- CHAT DE TEXTO (persistido) ----------

    socket.on("channel:join", (channelId) => socket.join(`channel:${channelId}`));
    socket.on("channel:leave", (channelId) => socket.leave(`channel:${channelId}`));

    // ---------- PRESENÇA (quem está em cada canal de voz) ----------
    // Sala socket.io separada por servidor, pra quem só está olhando a lista de
    // canais (sem estar em nenhuma chamada) receber as atualizações também.

    socket.on("server:join", async (serverId, callback) => {
      socket.join(`server:${serverId}`);
      const voiceChannelsOfServer = await prisma.channel.findMany({
        where: { serverId, type: "voice" },
        select: { id: true },
      });
      const presence = {};
      for (const { id } of voiceChannelsOfServer) {
        const members = voiceChannels.get(id);
        presence[id] = members
          ? Array.from(members.entries()).map(([userId, data]) => ({ userId, username: data.username }))
          : [];
      }
      callback?.(presence);
    });

    socket.on("server:leave", (serverId) => socket.leave(`server:${serverId}`));

    socket.on("message:send", async ({ channelId, content }) => {
      if (!content?.trim()) return;
      const message = await prisma.message.create({
        data: { content: content.trim(), channelId, authorId: socket.userId },
        include: { author: { select: { id: true, username: true } } },
      });
      io.to(`channel:${channelId}`).emit("message:new", message);
    });

    socket.on("typing:start", ({ channelId }) =>
      socket.to(`channel:${channelId}`).emit("typing:start", { userId: socket.userId })
    );
    socket.on("typing:stop", ({ channelId }) =>
      socket.to(`channel:${channelId}`).emit("typing:stop", { userId: socket.userId })
    );

    // ---------- VOZ / CÂMERA / COMPARTILHAMENTO DE TELA ----------
    // Mesh P2P via sinalização Socket.IO (mesma lógica que já validamos).
    // Escopo agora é por canal de voz dentro de um servidor, não uma sala solta.

    socket.on("voice:join", ({ channelId, serverId }, callback) => {
      if (!voiceChannels.has(channelId)) voiceChannels.set(channelId, new Map());
      const members = voiceChannels.get(channelId);

      if (members.size >= MAX_PARTICIPANTS_PER_VOICE_CHANNEL) {
        return callback?.({ error: "Canal de voz cheio (máximo de 20 pessoas)" });
      }

      socket.join(`voice:${channelId}`);
      const existingPeers = Array.from(members.entries()).map(([userId, data]) => ({
        userId,
        username: data.username,
      }));

      members.set(socket.userId, { username: socket.data.username });
      socket.data.voiceChannelId = channelId;
      socket.data.voiceServerId = serverId;

      callback?.({ existingPeers });
      socket.to(`voice:${channelId}`).emit("voice:peer-joined", {
        userId: socket.userId,
        username: socket.data.username,
      });
      if (serverId) {
        io.to(`server:${serverId}`).emit("presence:voice-update", {
          channelId,
          userId: socket.userId,
          username: socket.data.username,
          joined: true,
        });
      }
    });

    socket.on("voice:leave", ({ channelId, serverId }) => {
      socket.leave(`voice:${channelId}`);
      voiceChannels.get(channelId)?.delete(socket.userId);
      socket.to(`voice:${channelId}`).emit("voice:peer-left", { userId: socket.userId });
      if (serverId) {
        io.to(`server:${serverId}`).emit("presence:voice-update", { channelId, userId: socket.userId, joined: false });
      }
      socket.data.voiceChannelId = null;
      socket.data.voiceServerId = null;
    });

    socket.on("webrtc:offer", ({ targetUserId, offer }) => {
      emitToUser(io, targetUserId, "webrtc:offer", { fromUserId: socket.userId, offer });
    });
    socket.on("webrtc:answer", ({ targetUserId, answer }) => {
      emitToUser(io, targetUserId, "webrtc:answer", { fromUserId: socket.userId, answer });
    });
    socket.on("webrtc:ice-candidate", ({ targetUserId, candidate }) => {
      emitToUser(io, targetUserId, "webrtc:ice-candidate", { fromUserId: socket.userId, candidate });
    });

    socket.on("media:mic-toggle", ({ channelId, on }) => {
      socket.to(`voice:${channelId}`).emit("media:mic-toggled", { userId: socket.userId, on });
    });
    socket.on("media:camera-toggle", ({ channelId, on }) => {
      socket.to(`voice:${channelId}`).emit("media:camera-toggled", { userId: socket.userId, on });
    });
    socket.on("media:screenshare-start", ({ channelId }) => {
      socket.to(`voice:${channelId}`).emit("media:screenshare-started", { userId: socket.userId });
    });
    socket.on("media:screenshare-stop", ({ channelId }) => {
      socket.to(`voice:${channelId}`).emit("media:screenshare-stopped", { userId: socket.userId });
    });

    // ---------- DESCONEXÃO ----------

    socket.on("disconnect", () => {
      const channelId = socket.data.voiceChannelId;
      const serverId = socket.data.voiceServerId;
      if (channelId) {
        voiceChannels.get(channelId)?.delete(socket.userId);
        socket.to(`voice:${channelId}`).emit("voice:peer-left", { userId: socket.userId });
        if (serverId) {
          io.to(`server:${serverId}`).emit("presence:voice-update", { channelId, userId: socket.userId, joined: false });
        }
      }
    });
  });
}

function emitToUser(io, targetUserId, event, payload) {
  for (const [, s] of io.sockets.sockets) {
    if (s.userId === targetUserId) {
      s.emit(event, payload);
      return;
    }
  }
}
