import crypto from "crypto";
import { prisma } from "../config/prisma.js";

function generateInviteCode() {
  return crypto.randomBytes(4).toString("hex");
}

// Cria uma sala nova (canais padrão: #geral texto + Geral voz) com código de convite.
export async function createServer(userId, name) {
  return prisma.server.create({
    data: {
      name,
      inviteCode: generateInviteCode(),
      ownerId: userId,
      members: { create: { userId } },
      channels: {
        create: [
          { name: "geral", type: "text", position: 0 },
          { name: "Geral", type: "voice", position: 1 },
        ],
      },
    },
    include: { channels: true },
  });
}

// Sala automática criada ao entrar pela primeira vez, sem convite.
export function createDefaultServer(userId, username) {
  return createServer(userId, `Sala de ${username}`);
}

export async function findServerByInviteCode(inviteCode) {
  return prisma.server.findUnique({ where: { inviteCode }, include: { channels: true } });
}

// Adiciona o usuário à sala do convite, se ainda não for membro. Não cria sala nova.
export async function joinServerByInviteCode(userId, inviteCode) {
  const server = await findServerByInviteCode(inviteCode);
  if (!server) return null;

  const existing = await prisma.serverMember.findUnique({
    where: { userId_serverId: { userId, serverId: server.id } },
  });
  if (!existing) {
    await prisma.serverMember.create({ data: { userId, serverId: server.id } });
  }
  return server;
}
