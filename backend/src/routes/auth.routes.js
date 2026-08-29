import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// Gera ID aleatório
function generateId() {
  return Math.random().toString(36).substring(7);
}

// Gera cor baseada no username
function generateColor() {
  const colors = [
    "#5865F2", // Blurple
    "#FF6B6B", // Vermelho
    "#4ECDC4", // Teal
    "#45B7D1", // Azul
    "#FFA07A", // Salmão
    "#98D8C8", // Menta
    "#F7DC6F", // Amarelo
    "#BB8FCE"  // Roxo
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Login simples com username
router.post("/quick-login", (req, res) => {
  try {
    const { username, inviteCode } = req.body;

    if (!username || username.trim() === "") {
      return res.status(400).json({ error: "Username required" });
    }

    const userId = generateId();
    const user = {
      id: userId,
      username: username.trim(),
      email: `${username.trim()}@local`,
      avatar: generateColor()
    };

    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    // Se tiver convite, retorna o servidor que o usuário entrou
    let joinedServerId = null;
    if (inviteCode) {
      // TODO: Implementar lógica de convite para adicionar usuário ao servidor
      // Por enquanto, apenas retorna sem erro
      joinedServerId = null;
    }

    res.json({
      user,
      token,
      joinedServerId
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

// Login normal com email/senha (futura implementação)
router.post("/login", (req, res) => {
  return res.status(400).json({ error: "Use quick-login endpoint" });
});

export default router;
