import express from "express";
import { handleChat, handleChatHistory, handleChatStream, handleAllDocsStream } from "../controllers/chat.controller.js";
import { handleGuestChatStream } from "../controllers/guest.controller.js";
import { ChatMessage } from "../models/chatMessage.model.js";
import { requireAuth, AuthRequest } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/:documentId/history", requireAuth, handleChatHistory);
router.delete("/:documentId/history", requireAuth, async (req: AuthRequest, res) => {
    await ChatMessage.destroy({ where: { documentId: req.params.documentId, userId: req.userId } });
    res.status(204).send();
});
router.post("/guest/stream", handleGuestChatStream);
router.post("/all/stream", requireAuth, handleAllDocsStream);
router.post("/stream", requireAuth, handleChatStream);
router.post("/", requireAuth, handleChat);

export default router;
