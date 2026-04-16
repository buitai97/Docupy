import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("../services/extract.service.js", () => ({
    extractText: vi.fn(),
    ACCEPTED_MIMETYPES: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    ],
}));

vi.mock("../services/chunk.service.js", () => ({
    splitText: vi.fn(),
}));

vi.mock("../services/embedding.service.js", () => ({
    getEmbedding: vi.fn(),
}));

vi.mock("../services/ai.service.js", () => ({
    streamAI: vi.fn(),
}));

vi.mock("../services/search.service.js", () => ({
    cosineSimilarity: vi.fn(),
}));

vi.mock("../services/guest-session.service.js", () => ({
    createGuestSession: vi.fn(),
    getGuestSession: vi.fn(),
}));

vi.mock("fs", () => ({
    default: {
        unlink: vi.fn((_path: string, cb: () => void) => cb()),
    },
}));

import { handleGuestUpload, handleGuestChatStream } from "../controllers/guest.controller.js";
import { extractText } from "../services/extract.service.js";
import { splitText } from "../services/chunk.service.js";
import { getEmbedding } from "../services/embedding.service.js";
import { streamAI } from "../services/ai.service.js";
import { cosineSimilarity } from "../services/search.service.js";
import { createGuestSession, getGuestSession } from "../services/guest-session.service.js";

function mockRes() {
    const written: string[] = [];
    const res: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        setHeader: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn((data: string) => { written.push(data); return true; }),
        end: vi.fn(),
        headersSent: false,
    };
    return { res: res as Response, written };
}

function mockReqWithFile(
    body: Record<string, unknown> = {},
    fileOverride: Partial<Express.Multer.File> = {}
): Request {
    return {
        body,
        headers: {},
        file: {
            path: "/tmp/test-file.pdf",
            mimetype: "application/pdf",
            originalname: "report.pdf",
            ...fileOverride,
        } as Express.Multer.File,
    } as Request;
}

async function* makeStream(tokens: string[]) {
    for (const token of tokens) {
        yield { choices: [{ delta: { content: token } }] };
    }
}

describe("handleGuestUpload", () => {
    beforeEach(() => vi.clearAllMocks());

    it("responds 201 with sessionId and name on success", async () => {
        vi.mocked(extractText).mockResolvedValue("Extracted text content.");
        vi.mocked(splitText).mockReturnValue(["chunk one", "chunk two"]);
        vi.mocked(getEmbedding).mockResolvedValue([0.1, 0.2]);
        vi.mocked(createGuestSession).mockReturnValue("session-uuid-123");

        const { res } = mockRes();
        const req = mockReqWithFile({}, { originalname: "My Document.pdf" });
        await handleGuestUpload(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            sessionId: "session-uuid-123",
            name: "My Document",
        });
    });

    it("strips the file extension from the document name", async () => {
        vi.mocked(extractText).mockResolvedValue("text");
        vi.mocked(splitText).mockReturnValue(["chunk"]);
        vi.mocked(getEmbedding).mockResolvedValue([0.5]);
        vi.mocked(createGuestSession).mockReturnValue("sess-1");

        const { res } = mockRes();
        await handleGuestUpload(mockReqWithFile({}, { originalname: "thesis.docx" }), res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: "thesis" }));
    });

    it("calls createGuestSession with all chunk embeddings", async () => {
        vi.mocked(extractText).mockResolvedValue("text");
        vi.mocked(splitText).mockReturnValue(["a", "b"]);
        vi.mocked(getEmbedding)
            .mockResolvedValueOnce([1, 0])
            .mockResolvedValueOnce([0, 1]);
        vi.mocked(createGuestSession).mockReturnValue("sess-2");

        const { res } = mockRes();
        await handleGuestUpload(mockReqWithFile({}, { originalname: "doc.txt" }), res);

        expect(createGuestSession).toHaveBeenCalledWith(
            [
                { content: "a", embedding: [1, 0] },
                { content: "b", embedding: [0, 1] },
            ],
            "doc"
        );
    });

    it("responds 500 when extractText throws", async () => {
        vi.mocked(extractText).mockRejectedValue(new Error("parse error"));
        const { res } = mockRes();
        await handleGuestUpload(mockReqWithFile(), res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Upload failed." });
    });

    it("responds 500 when getEmbedding throws", async () => {
        vi.mocked(extractText).mockResolvedValue("text");
        vi.mocked(splitText).mockReturnValue(["chunk"]);
        vi.mocked(getEmbedding).mockRejectedValue(new Error("embedding error"));
        const { res } = mockRes();
        await handleGuestUpload(mockReqWithFile(), res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe("handleGuestChatStream", () => {
    beforeEach(() => vi.clearAllMocks());

    it("responds 400 when question is missing", async () => {
        const { res } = mockRes();
        const req = { body: { sessionId: "sess-1" }, headers: {} } as Request;
        await handleGuestChatStream(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "question and sessionId are required.",
        });
    });

    it("responds 400 when sessionId is missing", async () => {
        const { res } = mockRes();
        const req = { body: { question: "What is this?" }, headers: {} } as Request;
        await handleGuestChatStream(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("responds 404 when the session does not exist", async () => {
        vi.mocked(getGuestSession).mockReturnValue(undefined);
        const { res } = mockRes();
        const req = { body: { question: "Q?", sessionId: "bad-id" }, headers: {} } as Request;
        await handleGuestChatStream(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: "Session expired or not found. Please re-upload your document.",
        });
    });

    it("streams tokens and writes [DONE] on success", async () => {
        const session = {
            chunks: [{ content: "relevant text", embedding: [1, 0] }],
            name: "Doc",
            createdAt: Date.now(),
        };
        vi.mocked(getGuestSession).mockReturnValue(session);
        vi.mocked(getEmbedding).mockResolvedValue([1, 0]);
        vi.mocked(cosineSimilarity).mockReturnValue(0.99);
        vi.mocked(streamAI).mockReturnValue(makeStream(["Hello", " world"]) as any);

        const { res, written } = mockRes();
        const req = {
            body: { question: "What?", sessionId: "valid-sess" },
            headers: {},
        } as Request;
        await handleGuestChatStream(req, res);

        expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
        expect(written.some((d) => d.includes("[DONE]"))).toBe(true);
        expect(res.end).toHaveBeenCalled();
    });

    it("writes token data events for each chunk", async () => {
        const session = {
            chunks: [{ content: "ctx", embedding: [1, 0] }],
            name: "Doc",
            createdAt: Date.now(),
        };
        vi.mocked(getGuestSession).mockReturnValue(session);
        vi.mocked(getEmbedding).mockResolvedValue([1, 0]);
        vi.mocked(cosineSimilarity).mockReturnValue(0.9);
        vi.mocked(streamAI).mockReturnValue(makeStream(["tok1", "tok2"]) as any);

        const { res, written } = mockRes();
        const req = {
            body: { question: "Q?", sessionId: "sess-1" },
            headers: {},
        } as Request;
        await handleGuestChatStream(req, res);

        expect(written.some((d) => d.includes('"tok1"'))).toBe(true);
        expect(written.some((d) => d.includes('"tok2"'))).toBe(true);
    });

    it("ranks chunks by cosine similarity and takes top 3", async () => {
        const chunks = [
            { content: "low relevance", embedding: [0, 1] },
            { content: "high relevance", embedding: [1, 0] },
            { content: "medium relevance", embedding: [0.7, 0.3] },
            { content: "very low relevance", embedding: [0, 0.5] },
        ];
        const session = { chunks, name: "Doc", createdAt: Date.now() };
        vi.mocked(getGuestSession).mockReturnValue(session);
        vi.mocked(getEmbedding).mockResolvedValue([1, 0]);
        vi.mocked(cosineSimilarity).mockImplementation((a, b) => {
            // simple dot product for tests
            return a.reduce((sum: number, val: number, i: number) => sum + val * b[i], 0);
        });
        vi.mocked(streamAI).mockReturnValue(makeStream([]) as any);

        const { res } = mockRes();
        const req = {
            body: { question: "Q?", sessionId: "sess-1" },
            headers: {},
        } as Request;
        await handleGuestChatStream(req, res);

        // streamAI should be called with context from top 3 chunks
        expect(streamAI).toHaveBeenCalledWith(
            expect.stringContaining("high relevance"),
            "Q?"
        );
    });

    it("writes [SOURCES] at the end of the stream", async () => {
        const session = {
            chunks: [{ content: "source text", embedding: [1, 0] }],
            name: "Doc",
            createdAt: Date.now(),
        };
        vi.mocked(getGuestSession).mockReturnValue(session);
        vi.mocked(getEmbedding).mockResolvedValue([1, 0]);
        vi.mocked(cosineSimilarity).mockReturnValue(0.9);
        vi.mocked(streamAI).mockReturnValue(makeStream(["tok"]) as any);

        const { res, written } = mockRes();
        const req = {
            body: { question: "Q?", sessionId: "sess-1" },
            headers: {},
        } as Request;
        await handleGuestChatStream(req, res);
        expect(written.some((d) => d.includes("[SOURCES]"))).toBe(true);
    });

    it("responds 500 when getEmbedding throws and headers not sent", async () => {
        const session = {
            chunks: [{ content: "ctx", embedding: [1, 0] }],
            name: "Doc",
            createdAt: Date.now(),
        };
        vi.mocked(getGuestSession).mockReturnValue(session);
        vi.mocked(getEmbedding).mockRejectedValue(new Error("embedding fail"));

        const { res } = mockRes();
        const req = {
            body: { question: "Q?", sessionId: "sess-1" },
            headers: {},
        } as Request;
        await handleGuestChatStream(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Chat failed." });
    });
});
