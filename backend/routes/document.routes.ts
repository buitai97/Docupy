import express from "express";
import { Document } from "../models/document.model.js";
import { ChatMessage } from "../models/chatMessage.model.js";
import { requireAuth, AuthRequest } from "../middleware/auth.middleware.js";
import { QueryTypes } from "sequelize";
import { sequelize } from "../models/sequelize.js";

const router = express.Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
    const rows = await sequelize.query(
        `SELECT DISTINCT ON (document_id) document_id, name
         FROM documents
         WHERE user_id = :userId`,
        { replacements: { userId: req.userId }, type: QueryTypes.SELECT }
    );
    res.json(rows);
});

router.get("/:documentId", requireAuth, async (req: AuthRequest, res) => {
    const doc = await Document.findOne({
        where: { documentId: req.params.documentId, userId: req.userId },
        attributes: ["documentId", "name"],
    });
    if (!doc) {
        res.status(404).json({ message: "Document not found." });
        return;
    }
    res.json(doc);
});

router.patch("/:documentId", requireAuth, async (req: AuthRequest, res) => {
    const { documentId } = req.params;
    const { name } = req.body;
    if (!name?.trim()) {
        res.status(400).json({ message: "name is required." });
        return;
    }
    const [updated] = await Document.update(
        { name: name.trim() },
        { where: { documentId, userId: req.userId } }
    );
    if (updated === 0) {
        res.status(404).json({ message: "Document not found." });
        return;
    }
    res.json({ name: name.trim() });
});

router.delete("/:documentId", requireAuth, async (req: AuthRequest, res) => {
    const { documentId } = req.params;
    const deleted = await Document.destroy({ where: { documentId, userId: req.userId } });
    if (deleted === 0) {
        res.status(404).json({ message: "Document not found." });
        return;
    }
    await ChatMessage.destroy({ where: { documentId, userId: req.userId } });
    res.status(204).send();
});

export default router;
