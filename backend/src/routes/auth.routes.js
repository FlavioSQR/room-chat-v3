import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { createDefaultServer, joinServerByInviteCode, findServerByInviteCode } from "../services/rooms.js";

const router = Router();

// Se um inviteCode for enviado, ele precisa ser válido; caso contrário nem cria a
// conta (evita registrar o usuário e só depois avisar que o convite não existe).
async function assertInviteCodeIsValid(inviteCode) {
  if (!inviteCode) return;
  const server = await findServerByInviteCode(inviteCode);
  if (!server) {
    const error = new Error("Código de convite inválido");
    error.status = 404;
    throw error;
  }
}

// Depois de logar/criar a conta: entra na sala do convite se houver um válido,
// senão garante que o usuário tenha ao menos uma sala (cria a automática se
// ele ainda não é membro de nenhuma — cobre tanto conta nova quanto conta
// antiga que nunca chegou a ter uma sala).
async function joinInviteOrCreateDefaultServer({ userId, username, inviteCode }) {
  if (inviteCode) {
    const server = await joinServerByInviteCode(userId, inviteCode);
    return server?.id ?? null;
  }

  const hasAnyServer = await prisma.serverMember.findFirst({ where: { userId } });
  if (!hasAnyServer) {
    const server = await createDefaultServer(userId, username);
    return server.id;
  }
  return null;
}

const registerSchema = z.object({
  username: z.string().min(2).max(32),
  email: z.string().email(),
  password: z.string().min(6),
  inviteCode: z.string().optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { username, email, password, inviteCode } = parsed.data;

  try {
    await assertInviteCodeIsValid(inviteCode);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) return res.status(409).json({ error: "Usuário ou email já em uso" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username, email, passwordHash } });
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });

  const joinedServerId = await joinInviteOrCreateDefaultServer({
    userId: user.id,
    username: user.username,
    inviteCode,
  });

  res.status(201).json({ token, user: { id: user.id, username: user.username }, joinedServerId });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string(), inviteCode: z.string().optional() });

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, inviteCode } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }

  try {
    await assertInviteCodeIsValid(inviteCode);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
  const joinedServerId = await joinInviteOrCreateDefaultServer({
    userId: user.id,
    username: user.username,
    inviteCode,
  });

  res.json({ token, user: { id: user.id, username: user.username }, joinedServerId });
});

// Modo de teste (AUTH_DISABLED=true): entra com qualquer apelido, sem senha.
// Cria o usuário na hora se o apelido ainda não existir.
const quickLoginSchema = z.object({ username: z.string().min(2).max(32), inviteCode: z.string().optional() });

router.post("/quick-login", async (req, res) => {
  if (process.env.AUTH_DISABLED !== "true") {
    return res.status(403).json({ error: "Login rápido desabilitado" });
  }

  const parsed = quickLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { username, inviteCode } = parsed.data;

  try {
    await assertInviteCodeIsValid(inviteCode);
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
    user = await prisma.user.create({
      data: { username, email: `${username}@quick-login.local`, passwordHash },
    });
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
  const joinedServerId = await joinInviteOrCreateDefaultServer({
    userId: user.id,
    username: user.username,
    inviteCode,
  });

  res.json({ token, user: { id: user.id, username: user.username }, joinedServerId });
});

export default router;
