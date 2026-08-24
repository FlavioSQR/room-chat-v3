import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middleware/auth.js";
import { createServer, joinServerByInviteCode } from "../services/rooms.js";

const router = Router();
router.use(authMiddleware);

// Servidores do usuário logado
router.get("/", async (req, res) => {
  const memberships = await prisma.serverMember.findMany({
    where: { userId: req.userId },
    include: { server: { include: { channels: { orderBy: { position: "asc" } } } } },
  });
  res.json(memberships.map((m) => m.server));
});

// Criar servidor (com canais padrão: #geral texto + Geral voz)
router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Bota a porra do nome carai..." });

  const server = await createServer(req.userId, name.trim());
  res.status(201).json(server);
});

// Entrar em um servidor existente por código de convite
router.post("/join-by-invite", async (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode?.trim()) return res.status(400).json({ error: "Precisa da porra do codigo, cade?" });

  const server = await joinServerByInviteCode(req.userId, inviteCode.trim());
  if (!server) return res.status(404).json({ error: "Codigo errado animal" });

  res.status(200).json(server);
});

// Criar canal em um servidor
router.post("/:serverId/channels", async (req, res) => {
  const { serverId } = req.params;
  const { name, type } = req.body;
  if (!name?.trim() || !["text", "voice"].includes(type)) {
    return res.status(400).json({ error: "Nome e tipo (text/voice) são obrigatórios" });
  }

  const isMember = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId: req.userId, serverId } },
  });
  if (!isMember) return res.status(403).json({ error: "Voce não é membro, sai daqui" });

  const channel = await prisma.channel.create({ data: { name: name.trim(), type, serverId } });
  res.status(201).json(channel);
});

// Apagar um servidor (só o dono pode; canais, membros e mensagens somem em cascata)
router.delete("/:serverId", async (req, res) => {
  const { serverId } = req.params;
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) return res.status(404).json({ error: "Servidor não encontrado" });
  if (server.ownerId !== req.userId) return res.status(403).json({ error: "Só o dono pode apagar essa sala" });

  await prisma.server.delete({ where: { id: serverId } });
  res.status(204).end();
});

// Apagar um canal (só o dono do servidor pode)
router.delete("/:serverId/channels/:channelId", async (req, res) => {
  const { serverId, channelId } = req.params;
  const server = await prisma.server.findUnique({ where: { id: serverId } });
  if (!server) return res.status(404).json({ error: "Servidor não encontrado" });
  if (server.ownerId !== req.userId) return res.status(403).json({ error: "Só o dono pode apagar canais" });

  const channel = await prisma.channel.findFirst({ where: { id: channelId, serverId } });
  if (!channel) return res.status(404).json({ error: "Canal não encontrado" });

  await prisma.channel.delete({ where: { id: channelId } });
  res.status(204).end();
});

export default router;
