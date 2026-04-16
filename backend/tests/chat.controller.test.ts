import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";

vi.mock("../services/ai.service.js", () => ({
    askAI: vi.fn(),
    streamAI: vi.fn(),
}));

vi.mock("../services/embedding.service.js", () => ({
    getEmbedding: vi.fn(),
}));

vi.mock("../models/chatMessage.model.js", () => ({
    ChatMessage: {
        bulkCreate: vi.fn(),
        findAll: vi.fn(),
    },
}));

vi.mock("../models/sequelize.js", () => ({
    sequelize: {
        query: vi.fn(),
    },
}));

import { handleChat, handleChatStream, handleAllDocsStream, handleChatHistory } from "../controllers/chat.controller.js";
import { askAI, streamAI } from "../services/ai.service.js";
import { getEmbedding } from "../services/embedding.service.js";
import { ChatMessage } from "../models/chatMessage.model.js";
import { sequelize } from "../models/sequelize.js";

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

function mockAuthReq(body = {}, extra: Partial<AuthRequest> = {}): AuthRequest {
    return { body, headers: {}, params: {}, ...extra } as AuthRequest;
}

// Minimal async generator helper for streamAI mock
async function* makeStream(tokens: string[]) {
    for (const token of tokens) {
        yield { choices: [{ delta: { content: token } }] };
    }
}

describe("handleChat", () => {
    beforeEach(() => vi.clearAllMocks());

    it("responds 400 when question is missing", async () => {
        const { res } = mockRes();
        await handleChat(mockAuthReq({ documentId: "doc-1" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "question and documentId are required." });
    });

    it("responds 400 when documentId is missing", async () => {
        const { res } = mockRes();
        await handleChat(mockAuthReq({ question: "What is this?" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("responds with answer on success", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1, 0.2]);
        vi.mocked(sequelize.query).mockResolvedValue([[{ content: "relevant text" }], {}] as any);
        vi.mocked(askAI).mockResolvedValue("The answer.");
        vi.mocked(ChatMessage.bulkCreate).mockResolvedValue([]);

        const { res } = mockRes();
        await handleChat(
            mockAuthReq({ question: "What is this?", documentId: "doc-1" }, { userId: 1 }),
            res
        );
        expect(res.json).toHaveBeenCalledWith({ answer: "The answer." });
    });

    it("joins multiple context rows with double newlines", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(sequelize.query).mockResolvedValue([
            [{ content: "chunk A" }, { content: "chunk B" }],
            {},
        ] as any);
        vi.mocked(askAI).mockResolvedValue("Answer.");
        vi.mocked(ChatMessage.bulkCreate).mockResolvedValue([]);

        const { res } = mockRes();
        await handleChat(
            mockAuthReq({ question: "Q?", documentId: "doc-1" }, { userId: 1 }),
            res
        );
        expect(askAI).toHaveBeenCalledWith("chunk A\n\nchunk B", "Q?");
    });

    it("persists both user and assistant messages", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(sequelize.query).mockResolvedValue([[{ content: "ctx" }], {}] as any);
        vi.mocked(askAI).mockResolvedValue("My answer.");
        vi.mocked(ChatMessage.bulkCreate).mockResolvedValue([]);

        const { res } = mockRes();
        await handleChat(
            mockAuthReq({ question: "Hello?", documentId: "doc-1" }, { userId: 5 }),
            res
        );
        expect(ChatMessage.bulkCreate).toHaveBeenCalledWith([
            { documentId: "doc-1", userId: 5, role: "user", content: "Hello?" },
            { documentId: "doc-1", userId: 5, role: "assistant", content: "My answer." },
        ]);
    });

    it("uses null for userId when user is not authenticated", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(sequelize.query).mockResolvedValue([[{ content: "ctx" }], {}] as any);
        vi.mocked(askAI).mockResolvedValue("Answer.");
        vi.mocked(ChatMessage.bulkCreate).mockResolvedValue([]);

        const { res } = mockRes();
        await handleChat(mockAuthReq({ question: "Q?", documentId: "doc-1" }), res);
        expect(ChatMessage.bulkCreate).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ userId: null })])
        );
    });

    it("responds 500 when getEmbedding throws", async () => {
        vi.mocked(getEmbedding).mockRejectedValue(new Error("OpenAI error"));
        const { res } = mockRes();
        await handleChat(
            mockAuthReq({ question: "Q?", documentId: "doc-1" }, { userId: 1 }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Chat failed." });
    });
});

describe("handleChatStream", () => {
    beforeEach(() => vi.clearAllMocks());

    it("responds 400 when question is missing", async () => {
        const { res } = mockRes();
        await handleChatStream(mockAuthReq({ documentId: "doc-1" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "question and documentId are required." });
    });

    it("responds 400 when documentId is missing", async () => {
        const { res } = mockRes();
        await handleChatStream(mockAuthReq({ question: "Why?" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("streams tokens and writes [DONE] at the end", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(sequelize.query).mockResolvedValue([[{ content: "ctx", name: "Doc" }], {}] as any);
        vi.mocked(streamAI).mockReturnValue(makeStream(["Hello", " world"]) as any);
        vi.mocked(ChatMessage.bulkCreate).mockResolvedValue([]);

        const { res, written } = mockRes();
        await handleChatStream(
            mockAuthReq({ question: "Q?", documentId: "doc-1" }, { userId: 1 }),
            res
        );
        expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
        expect(written.some((d) => d.includes("[DONE]"))).toBe(true);
        expect(res.end).toHaveBeenCalled();
    });

    it("writes [SOURCES] after [DONE]", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(sequelize.query).mockResolvedValue([
            [{ content: "context chunk", name: "MyDoc" }],
            {},
        ] as any);
        vi.mocked(streamAI).mockReturnValue(makeStream(["tok"]) as any);
        vi.mocked(ChatMessage.bulkCreate).mockResolvedValue([]);

        const { res, written } = mockRes();
        await handleChatStream(
            mockAuthReq({ question: "Q?", documentId: "doc-1" }, { userId: 1 }),
            res
        );
        expect(written.some((d) => d.includes("[SOURCES]"))).toBe(true);
    });

    it("responds 500 when getEmbedding throws and headers not sent", async () => {
        vi.mocked(getEmbedding).mockRejectedValue(new Error("fail"));
        const { res } = mockRes();
        await handleChatStream(
            mockAuthReq({ question: "Q?", documentId: "doc-1" }, { userId: 1 }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it("writes [ERROR] and ends the stream when error occurs after headers are sent", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(sequelize.query).mockResolvedValue([[{ content: "ctx", name: "Doc" }], {}] as any);
        // Stream starts fine but then throws during iteration
        async function* errorStream() {
            yield { choices: [{ delta: { content: "tok" } }] };
            throw new Error("stream error");
        }
        vi.mocked(streamAI).mockReturnValue(errorStream() as any);
        vi.mocked(ChatMessage.bulkCreate).mockResolvedValue([]);

        const { res, written } = mockRes();
        // Mark headers as already sent after flushHeaders is called
        let headersSet = false;
        vi.mocked(res.flushHeaders as any).mockImplementation(() => {
            headersSet = true;
            Object.defineProperty(res, "headersSent", { get: () => headersSet, configurable: true });
        });

        await handleChatStream(
            mockAuthReq({ question: "Q?", documentId: "doc-1" }, { userId: 1 }),
            res
        );
        expect(written.some((d) => d.includes("[ERROR]"))).toBe(true);
        expect(res.end).toHaveBeenCalled();
    });
});

describe("handleAllDocsStream", () => {
    beforeEach(() => vi.clearAllMocks());

    it("responds 400 when question is missing", async () => {
        const { res } = mockRes();
        await handleAllDocsStream(mockAuthReq({}), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "question is required." });
    });

    it("responds 400 when no documents are found", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(sequelize.query).mockResolvedValue([[], {}] as any);
        const { res } = mockRes();
        await handleAllDocsStream(mockAuthReq({ question: "Q?" }, { userId: 1 }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "No documents found." });
    });

    it("streams answer when documents are found", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(sequelize.query).mockResolvedValue([
            [{ content: "doc chunk", name: "Report" }],
            {},
        ] as any);
        vi.mocked(streamAI).mockReturnValue(makeStream(["Answer"]) as any);
        vi.mocked(ChatMessage.bulkCreate).mockResolvedValue([]);

        const { res, written } = mockRes();
        await handleAllDocsStream(mockAuthReq({ question: "Q?" }, { userId: 1 }), res);
        expect(written.some((d) => d.includes("[DONE]"))).toBe(true);
        expect(res.end).toHaveBeenCalled();
    });

    it("includes document names in the context passed to the AI", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(sequelize.query).mockResolvedValue([
            [{ content: "some text", name: "Annual Report" }],
            {},
        ] as any);
        vi.mocked(streamAI).mockReturnValue(makeStream([]) as any);
        vi.mocked(ChatMessage.bulkCreate).mockResolvedValue([]);

        const { res } = mockRes();
        await handleAllDocsStream(mockAuthReq({ question: "Q?" }, { userId: 1 }), res);
        expect(streamAI).toHaveBeenCalledWith(
            expect.stringContaining('Annual Report'),
            "Q?"
        );
    });

    it("uses 'Untitled' for documents without a name", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(sequelize.query).mockResolvedValue([
            [{ content: "data", name: null }],
            {},
        ] as any);
        vi.mocked(streamAI).mockReturnValue(makeStream([]) as any);
        vi.mocked(ChatMessage.bulkCreate).mockResolvedValue([]);

        const { res } = mockRes();
        await handleAllDocsStream(mockAuthReq({ question: "Q?" }, { userId: 1 }), res);
        expect(streamAI).toHaveBeenCalledWith(
            expect.stringContaining("Untitled"),
            "Q?"
        );
    });

    it("responds 500 when getEmbedding throws and headers not sent", async () => {
        vi.mocked(getEmbedding).mockRejectedValue(new Error("fail"));
        const { res } = mockRes();
        await handleAllDocsStream(mockAuthReq({ question: "Q?" }, { userId: 1 }), res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it("writes [ERROR] and ends the stream when error occurs after headers are sent", async () => {
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(sequelize.query).mockResolvedValue([
            [{ content: "doc chunk", name: "Report" }],
            {},
        ] as any);
        async function* errorStream() {
            yield { choices: [{ delta: { content: "tok" } }] };
            throw new Error("stream error");
        }
        vi.mocked(streamAI).mockReturnValue(errorStream() as any);
        vi.mocked(ChatMessage.bulkCreate).mockResolvedValue([]);

        const { res, written } = mockRes();
        let headersSet = false;
        vi.mocked(res.flushHeaders as any).mockImplementation(() => {
            headersSet = true;
            Object.defineProperty(res, "headersSent", { get: () => headersSet, configurable: true });
        });

        await handleAllDocsStream(mockAuthReq({ question: "Q?" }, { userId: 1 }), res);
        expect(written.some((d) => d.includes("[ERROR]"))).toBe(true);
        expect(res.end).toHaveBeenCalled();
    });
});

describe("handleChatHistory", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns messages for the given documentId and userId", async () => {
        const messages = [
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi there!" },
        ];
        vi.mocked(ChatMessage.findAll).mockResolvedValue(messages as any);

        const { res } = mockRes();
        const req = mockAuthReq({}, { userId: 1 });
        (req as any).params = { documentId: "doc-1" };
        await handleChatHistory(req, res);
        expect(res.json).toHaveBeenCalledWith(messages);
    });

    it("responds 500 when ChatMessage.findAll throws", async () => {
        vi.mocked(ChatMessage.findAll).mockRejectedValue(new Error("DB error"));
        const { res } = mockRes();
        const req = mockAuthReq({}, { userId: 1 });
        (req as any).params = { documentId: "doc-1" };
        await handleChatHistory(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Failed to fetch history." });
    });
});
