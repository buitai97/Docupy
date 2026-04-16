import { Response } from "express";
import { askAI, streamAI } from "../services/ai.service.js";
import { getEmbedding } from "../services/embedding.service.js";
import { ChatMessage } from "../models/chatMessage.model.js";
import { sequelize } from "../models/sequelize.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

const ALL_DOCS_ID = "__all__";

interface Source {
    content: string;
    name?: string | null;
}

async function runStream(
    res: Response,
    context: string,
    question: string,
    documentId: string,
    userId: number | null,
    sources: Source[],
) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = streamAI(context, question);
    let fullAnswer = "";

    for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content ?? "";
        if (token) {
            fullAnswer += token;
            res.write(`data: ${JSON.stringify(token)}\n\n`);
        }
    }

    res.write("data: [DONE]\n\n");
    res.write(`data: [SOURCES]${JSON.stringify(sources)}\n\n`);
    res.end();

    await ChatMessage.bulkCreate([
        { documentId, userId, role: "user", content: question },
        { documentId, userId, role: "assistant", content: fullAnswer },
    ]);
}

export const handleChat = async (req: AuthRequest, res: Response) => {
    const { question, documentId } = req.body;

    if (!question || !documentId) {
        res.status(400).json({ message: "question and documentId are required." });
        return;
    }

    try {
        const questionEmbedding = "[" + (await getEmbedding(question)).join(",") + "]";

        // Vector similarity search requires a raw query (pgvector operator not supported by Sequelize)
        const [rows] = await sequelize.query(
            `SELECT content
             FROM documents
             WHERE document_id = :documentId
             ORDER BY embedding <-> :embedding::vector
             LIMIT 3`,
            { replacements: { documentId, embedding: questionEmbedding } }
        ) as [Array<{ content: string }>, unknown];

        const context = rows.map((r) => r.content).join("\n\n");
        const answer = await askAI(context, question);

        await ChatMessage.bulkCreate([
            { documentId, userId: req.userId ?? null, role: "user", content: question },
            { documentId, userId: req.userId ?? null, role: "assistant", content: answer },
        ]);

        res.json({ answer });
    } catch (err) {
        console.error("Chat error:", err);
        res.status(500).json({ message: "Chat failed." });
    }
};

export const handleChatStream = async (req: AuthRequest, res: Response) => {
    const { question, documentId } = req.body;

    if (!question || !documentId) {
        res.status(400).json({ message: "question and documentId are required." });
        return;
    }

    try {
        const questionEmbedding = "[" + (await getEmbedding(question)).join(",") + "]";

        const [rows] = await sequelize.query(
            `SELECT content, name
             FROM documents
             WHERE document_id = :documentId
             ORDER BY embedding <-> :embedding::vector
             LIMIT 3`,
            { replacements: { documentId, embedding: questionEmbedding } }
        ) as [Array<{ content: string; name: string | null }>, unknown];

        const context = rows.map((r) => r.content).join("\n\n");
        await runStream(res, context, question, documentId, req.userId ?? null, rows);
    } catch (err) {
        console.error("Stream chat error:", err);
        if (!res.headersSent) {
            res.status(500).json({ message: "Chat failed." });
        } else {
            res.write("data: [ERROR]\n\n");
            res.end();
        }
    }
};

export const handleAllDocsStream = async (req: AuthRequest, res: Response) => {
    const { question } = req.body;

    if (!question) {
        res.status(400).json({ message: "question is required." });
        return;
    }

    try {
        const questionEmbedding = "[" + (await getEmbedding(question)).join(",") + "]";

        const [rows] = await sequelize.query(
            `SELECT content, name
             FROM documents
             WHERE user_id = :userId
             ORDER BY embedding <-> :embedding::vector
             LIMIT 5`,
            { replacements: { userId: req.userId, embedding: questionEmbedding } }
        ) as [Array<{ content: string; name: string | null }>, unknown];

        if (rows.length === 0) {
            res.status(400).json({ message: "No documents found." });
            return;
        }

        const context = rows
            .map((r) => `[Document: "${r.name ?? "Untitled"}"]\n${r.content}`)
            .join("\n\n");

        await runStream(res, context, question, ALL_DOCS_ID, req.userId ?? null, rows);
    } catch (err) {
        console.error("All-docs stream error:", err);
        if (!res.headersSent) {
            res.status(500).json({ message: "Chat failed." });
        } else {
            res.write("data: [ERROR]\n\n");
            res.end();
        }
    }
};

export const handleChatHistory = async (req: AuthRequest, res: Response) => {
    const { documentId } = req.params;

    try {
        const messages = await ChatMessage.findAll({
            where: { documentId, userId: req.userId },
            attributes: ["role", "content"],
            order: [["createdAt", "ASC"]],
        });
        res.json(messages);
    } catch (err) {
        console.error("History error:", err);
        res.status(500).json({ message: "Failed to fetch history." });
    }
};
