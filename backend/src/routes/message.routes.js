import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/:channelId", async (req, res) => {
  const { channelId } = req.params;
  const messages = await prisma.message.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { author: { select: { id: true, username: true } } },
  });
  res.json(messages.reverse());
});

export default router;
