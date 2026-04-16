import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";

// Hoist mock so it replaces auth.service before auth.middleware imports it
vi.mock("../services/auth.service.js", () => ({
    verifyToken: vi.fn(),
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    initDatabase: vi.fn(),
    findOrCreateGoogleUser: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
}));

import { requireAuth } from "../middleware/auth.middleware.js";
import { verifyToken } from "../services/auth.service.js";

function makeReqResNext(authHeader?: string) {
    const req: Partial<AuthRequest> = {
        headers: authHeader ? { authorization: authHeader } : {},
    };
    const res: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn() as NextFunction;
    return { req: req as AuthRequest, res: res as Response, next };
}

describe("requireAuth middleware", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("responds 401 when no Authorization header is present", () => {
        const { req, res, next } = makeReqResNext();
        requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Authentication required." });
        expect(next).not.toHaveBeenCalled();
    });

    it("responds 401 when the header does not start with 'Bearer '", () => {
        const { req, res, next } = makeReqResNext("Basic abc123");
        requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Authentication required." });
        expect(next).not.toHaveBeenCalled();
    });

    it("responds 401 when the header is just 'Bearer' without a space", () => {
        const { req, res, next } = makeReqResNext("Bearer");
        requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it("calls next() and attaches user data when token is valid", () => {
        vi.mocked(verifyToken).mockReturnValue({ id: 42, email: "alice@example.com", name: "Alice" });
        const { req, res, next } = makeReqResNext("Bearer valid.token.here");
        requireAuth(req, res, next);
        expect(next).toHaveBeenCalledOnce();
        expect(req.userId).toBe(42);
        expect(req.userEmail).toBe("alice@example.com");
        expect(req.userName).toBe("Alice");
        expect(res.status).not.toHaveBeenCalled();
    });

    it("passes only the token part (after 'Bearer ') to verifyToken", () => {
        vi.mocked(verifyToken).mockReturnValue({ id: 1, email: "b@b.com", name: "B" });
        const { req, res, next } = makeReqResNext("Bearer my.secret.token");
        requireAuth(req, res, next);
        expect(verifyToken).toHaveBeenCalledWith("my.secret.token");
    });

    it("responds 401 when verifyToken throws (expired / invalid token)", () => {
        vi.mocked(verifyToken).mockImplementation(() => {
            throw new Error("jwt expired");
        });
        const { req, res, next } = makeReqResNext("Bearer expired.token");
        requireAuth(req, res, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired token." });
        expect(next).not.toHaveBeenCalled();
    });

    it("does not attach user data to the request when token is invalid", () => {
        vi.mocked(verifyToken).mockImplementation(() => {
            throw new Error("bad token");
        });
        const { req, res, next } = makeReqResNext("Bearer bad.token");
        requireAuth(req, res, next);
        expect(req.userId).toBeUndefined();
        expect(req.userEmail).toBeUndefined();
        expect(req.userName).toBeUndefined();
    });
});
