import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";

vi.mock("uuid", () => ({
    v4: vi.fn().mockReturnValue("mocked-uuid"),
}));

vi.mock("../services/extract.service.js", () => ({
    extractText: vi.fn(),
    ACCEPTED_MIMETYPES: ["application/pdf", "text/plain"],
}));

vi.mock("../services/chunk.service.js", () => ({
    splitText: vi.fn(),
}));

vi.mock("../services/embedding.service.js", () => ({
    getEmbedding: vi.fn(),
}));

vi.mock("../models/document.model.js", () => ({
    Document: {
        bulkCreate: vi.fn(),
    },
}));

vi.mock("fs", () => ({
    default: {
        unlink: vi.fn((_path: string, cb: () => void) => cb()),
    },
}));

import { handleUpload } from "../controllers/upload.controller.js";
import { extractText } from "../services/extract.service.js";
import { splitText } from "../services/chunk.service.js";
import { getEmbedding } from "../services/embedding.service.js";
import { Document } from "../models/document.model.js";
import fs from "fs";

function mockRes() {
    const res: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };
    return res as Response;
}

function mockAuthReqWithFile(
    fileOverride: Partial<Express.Multer.File> = {},
    extra: Partial<AuthRequest> = {}
): AuthRequest {
    return {
        body: {},
        headers: {},
        file: {
            path: "/tmp/upload-test.pdf",
            mimetype: "application/pdf",
            originalname: "Report.pdf",
            ...fileOverride,
        } as Express.Multer.File,
        ...extra,
    } as AuthRequest;
}

describe("handleUpload", () => {
    beforeEach(() => vi.clearAllMocks());

    it("responds 201 with a documentId on success", async () => {
        vi.mocked(extractText).mockResolvedValue("Some document text.");
        vi.mocked(splitText).mockReturnValue(["chunk one", "chunk two"]);
        vi.mocked(getEmbedding).mockResolvedValue([0.1, 0.2, 0.3]);
        vi.mocked(Document.bulkCreate).mockResolvedValue([]);

        const res = mockRes();
        await handleUpload(mockAuthReqWithFile({}, { userId: 1 }), res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ documentId: "mocked-uuid" });
    });

    it("strips the file extension from the stored document name", async () => {
        vi.mocked(extractText).mockResolvedValue("text");
        vi.mocked(splitText).mockReturnValue(["chunk"]);
        vi.mocked(getEmbedding).mockResolvedValue([0.5]);
        vi.mocked(Document.bulkCreate).mockResolvedValue([]);

        const res = mockRes();
        await handleUpload(
            mockAuthReqWithFile({ originalname: "my-thesis.docx" }, { userId: 1 }),
            res
        );

        expect(Document.bulkCreate).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ name: "my-thesis" })])
        );
    });

    it("stores each chunk with its embedding and the shared documentId", async () => {
        vi.mocked(extractText).mockResolvedValue("text");
        vi.mocked(splitText).mockReturnValue(["alpha", "beta"]);
        vi.mocked(getEmbedding)
            .mockResolvedValueOnce([1, 0])
            .mockResolvedValueOnce([0, 1]);
        vi.mocked(Document.bulkCreate).mockResolvedValue([]);

        const res = mockRes();
        await handleUpload(mockAuthReqWithFile({}, { userId: 2 }), res);

        expect(Document.bulkCreate).toHaveBeenCalledWith([
            { content: "alpha", embedding: "[1,0]", documentId: "mocked-uuid", userId: 2, name: "Report" },
            { content: "beta", embedding: "[0,1]", documentId: "mocked-uuid", userId: 2, name: "Report" },
        ]);
    });

    it("associates the upload with the authenticated user", async () => {
        vi.mocked(extractText).mockResolvedValue("text");
        vi.mocked(splitText).mockReturnValue(["chunk"]);
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(Document.bulkCreate).mockResolvedValue([]);

        const res = mockRes();
        await handleUpload(mockAuthReqWithFile({}, { userId: 99 }), res);

        expect(Document.bulkCreate).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ userId: 99 })])
        );
    });

    it("deletes the temp file even on success", async () => {
        vi.mocked(extractText).mockResolvedValue("text");
        vi.mocked(splitText).mockReturnValue(["chunk"]);
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(Document.bulkCreate).mockResolvedValue([]);

        const res = mockRes();
        await handleUpload(
            mockAuthReqWithFile({ path: "/tmp/temp-file.pdf" }, { userId: 1 }),
            res
        );

        expect(fs.unlink).toHaveBeenCalledWith("/tmp/temp-file.pdf", expect.any(Function));
    });

    it("responds 500 when extractText throws", async () => {
        vi.mocked(extractText).mockRejectedValue(new Error("PDF parse failure"));

        const res = mockRes();
        await handleUpload(mockAuthReqWithFile({}, { userId: 1 }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Upload failed." });
    });

    it("responds 500 when Document.bulkCreate throws", async () => {
        vi.mocked(extractText).mockResolvedValue("text");
        vi.mocked(splitText).mockReturnValue(["chunk"]);
        vi.mocked(getEmbedding).mockResolvedValue([0.1]);
        vi.mocked(Document.bulkCreate).mockRejectedValue(new Error("DB error"));

        const res = mockRes();
        await handleUpload(mockAuthReqWithFile({}, { userId: 1 }), res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Upload failed." });
    });

    it("deletes the temp file even when an error occurs", async () => {
        vi.mocked(extractText).mockRejectedValue(new Error("fail"));

        const res = mockRes();
        await handleUpload(
            mockAuthReqWithFile({ path: "/tmp/temp-error.pdf" }, { userId: 1 }),
            res
        );

        expect(fs.unlink).toHaveBeenCalledWith("/tmp/temp-error.pdf", expect.any(Function));
    });
});
