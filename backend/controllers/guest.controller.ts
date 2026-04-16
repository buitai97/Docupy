import { Request, Response } from "express";
import fs from "fs";
import { extractText } from "../services/extract.service.js";
import { splitText } from "../services/chunk.service.js";
import { getEmbedding } from "../services/embedding.service.js";
import { streamAI } from "../services/ai.service.js";
import { cosineSimilarity } from "../services/search.service.js";
import { createGuestSession, getGuestSession } from "../services/guest-session.service.js";

export const handleGuestUpload = async (req: Request, res: Response) => {
    const file = req.file as Express.Multer.File;
    try {
        const text = await extractText(file.path, file.mimetype);
        const chunks = splitText(text);
        const name = file.originalname.replace(/\.[^.]+$/, "");

        const guestChunks = await Promise.all(
            chunks.map(async (content) => ({
                content,
                embedding: await getEmbedding(content),
            }))
        );

        const sessionId = createGuestSession(guestChunks, name);
        res.status(201).json({ sessionId, name });
    } catch (err) {
        console.error("Guest upload error:", err);
        res.status(500).json({ message: "Upload failed." });
    } finally {
        fs.unlink(file.path, () => {});
    }
};

export const handleGuestChatStream = async (req: Request, res: Response) => {
    const { question, sessionId } = req.body;

    if (!question || !sessionId) {
        res.status(400).json({ message: "question and sessionId are required." });
        return;
    }

    const session = getGuestSession(sessionId);
    if (!session) {
        res.status(404).json({ message: "Session expired or not found. Please re-upload your document." });
        return;
    }

    try {
        const questionEmbedding = await getEmbedding(question);

        const ranked = session.chunks
            .map((chunk) => ({ chunk, score: cosineSimilarity(questionEmbedding, chunk.embedding) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        const context = ranked.map((r) => r.chunk.content).join("\n\n");
        const sources = ranked.map((r) => ({ content: r.chunk.content }));

        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        const stream = streamAI(context, question);

        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content ?? "";
            if (token) res.write(`data: ${JSON.stringify(token)}\n\n`);
        }

        res.write("data: [DONE]\n\n");
        res.write(`data: [SOURCES]${JSON.stringify(sources)}\n\n`);
        res.end();
    } catch (err) {
        console.error("Guest chat error:", err);
        if (!res.headersSent) {
            res.status(500).json({ message: "Chat failed." });
        } else {
            res.write("data: [ERROR]\n\n");
            res.end();
        }
    }
};
