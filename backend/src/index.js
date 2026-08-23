import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";

import authRoutes from "./routes/auth.routes.js";
import serverRoutes from "./routes/server.routes.js";
import messageRoutes from "./routes/message.routes.js";
import { registerSocketHandlers } from "./sockets/index.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/servers", serverRoutes);
app.use("/api/messages", messageRoutes);
app.get("/health", (req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: process.env.CLIENT_URL || "*" } });
registerSocketHandlers(io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
