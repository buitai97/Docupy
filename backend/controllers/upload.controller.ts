import { v4 as uuidv4 } from "uuid";
import { Response } from "express";
import { extractText } from "../services/extract.service.js";
import { splitText } from "../services/chunk.service.js";
import { getEmbedding } from "../services/embedding.service.js";
import { Document } from "../models/document.model.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import fs from "fs";

export const handleUpload = async (req: AuthRequest, res: Response) => {
    const file = req.file as Express.Multer.File;
    try {
        const text = await extractText(file.path, file.mimetype);
        const chunks = splitText(text);
        const documentId = uuidv4();
        const name = file.originalname.replace(/\.[^.]+$/, "");

        const embeddings = await Promise.all(
            chunks.map((chunk) => getEmbedding(chunk).then((e) => "[" + e.join(",") + "]"))
        );

        await Document.bulkCreate(
            chunks.map((chunk, i) => ({
                content: chunk,
                embedding: embeddings[i],
                documentId,
                userId: req.userId,
                name,
            }))
        );

        res.status(201).json({ documentId });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ message: "Upload failed." });
    } finally {
        fs.unlink(file.path, () => {});
    }
};
