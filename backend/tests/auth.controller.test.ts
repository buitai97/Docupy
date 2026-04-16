import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware.js";

// Mock auth.service before the controller imports it
vi.mock("../services/auth.service.js", () => ({
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    verifyToken: vi.fn(),
    initDatabase: vi.fn(),
    findOrCreateGoogleUser: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
}));

// Mock the User model used by handleGetProfile
vi.mock("../models/user.model.js", () => ({
    User: {
        findByPk: vi.fn(),
    },
}));

import {
    handleRegister,
    handleLogin,
    handleMe,
    handleGoogleCallback,
    handleUpdateProfile,
    handleChangePassword,
    handleGetProfile,
} from "../controllers/auth.controller.js";
import { registerUser, loginUser, updateProfile, changePassword } from "../services/auth.service.js";
import { User } from "../models/user.model.js";

function mockRes() {
    const res: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        redirect: vi.fn(),
    };
    return res as Response;
}

function mockReq(body = {}, extra: Partial<AuthRequest> = {}): AuthRequest {
    return { body, headers: {}, ...extra } as AuthRequest;
}

describe("handleGoogleCallback", () => {
    beforeEach(() => vi.clearAllMocks());

    it("redirects with token when req.user has a token", () => {
        const req = { user: { token: "abc123" } } as Request;
        const res = mockRes();
        handleGoogleCallback(req, res);
        expect(res.redirect).toHaveBeenCalledWith(
            "http://localhost:3000/auth/callback?token=abc123"
        );
    });

    it("responds 500 when req.user is undefined", () => {
        const req = {} as Request;
        const res = mockRes();
        handleGoogleCallback(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "Authentication failed" });
    });
});

describe("handleRegister", () => {
    beforeEach(() => vi.clearAllMocks());

    it("responds 400 when name is missing", async () => {
        const res = mockRes();
        await handleRegister(mockReq({ email: "a@b.com", password: "pass" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Name, email, and password are required." });
    });

    it("responds 400 when email is missing", async () => {
        const res = mockRes();
        await handleRegister(mockReq({ name: "Alice", password: "pass" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("responds 400 when password is missing", async () => {
        const res = mockRes();
        await handleRegister(mockReq({ name: "Alice", email: "a@b.com" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("responds 201 with result on successful registration", async () => {
        const payload = { token: "tok", user: { id: 1, name: "Alice", email: "a@b.com" } };
        vi.mocked(registerUser).mockResolvedValue(payload);
        const res = mockRes();
        await handleRegister(mockReq({ name: "Alice", email: "a@b.com", password: "secret" }), res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(payload);
    });

    it("responds 400 with error message when registerUser throws", async () => {
        vi.mocked(registerUser).mockRejectedValue(new Error("Email already in use."));
        const res = mockRes();
        await handleRegister(mockReq({ name: "Alice", email: "a@b.com", password: "secret" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Email already in use." });
    });

    it("responds 400 with generic message when thrown value is not an Error", async () => {
        vi.mocked(registerUser).mockRejectedValue("unexpected");
        const res = mockRes();
        await handleRegister(mockReq({ name: "Alice", email: "a@b.com", password: "secret" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Registration failed." });
    });
});

describe("handleLogin", () => {
    beforeEach(() => vi.clearAllMocks());

    it("responds 400 when email is missing", async () => {
        const res = mockRes();
        await handleLogin(mockReq({ password: "pass" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Email and password are required." });
    });

    it("responds 400 when password is missing", async () => {
        const res = mockRes();
        await handleLogin(mockReq({ email: "a@b.com" }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("responds with token payload on successful login", async () => {
        const payload = { token: "jwt", user: { id: 1, name: "Alice", email: "a@b.com" } };
        vi.mocked(loginUser).mockResolvedValue(payload);
        const res = mockRes();
        await handleLogin(mockReq({ email: "a@b.com", password: "pass" }), res);
        expect(res.json).toHaveBeenCalledWith(payload);
    });

    it("responds 401 when loginUser throws", async () => {
        vi.mocked(loginUser).mockRejectedValue(new Error("Invalid credentials."));
        const res = mockRes();
        await handleLogin(mockReq({ email: "a@b.com", password: "wrong" }), res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Invalid credentials." });
    });

    it("responds 401 with generic message when thrown value is not an Error", async () => {
        vi.mocked(loginUser).mockRejectedValue(null);
        const res = mockRes();
        await handleLogin(mockReq({ email: "a@b.com", password: "wrong" }), res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Login failed." });
    });
});

describe("handleMe", () => {
    it("responds with user info from the request", () => {
        const res = mockRes();
        const req = mockReq({}, { userId: 7, userEmail: "me@example.com", userName: "Me" });
        handleMe(req, res);
        expect(res.json).toHaveBeenCalledWith({ id: 7, email: "me@example.com", name: "Me" });
    });

    it("responds with undefined fields when user data is not set on the request", () => {
        const res = mockRes();
        const req = mockReq({});
        handleMe(req, res);
        expect(res.json).toHaveBeenCalledWith({
            id: undefined,
            email: undefined,
            name: undefined,
        });
    });
});

describe("handleUpdateProfile", () => {
    beforeEach(() => vi.clearAllMocks());

    it("responds 400 when name is empty", async () => {
        const res = mockRes();
        await handleUpdateProfile(mockReq({ name: "  ", email: "a@b.com" }, { userId: 1 }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Name and email are required." });
    });

    it("responds 400 when email is empty", async () => {
        const res = mockRes();
        await handleUpdateProfile(mockReq({ name: "Alice", email: "" }, { userId: 1 }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("responds 400 when both fields are missing", async () => {
        const res = mockRes();
        await handleUpdateProfile(mockReq({}, { userId: 1 }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("responds with updated token on success", async () => {
        const payload = { token: "newTok", user: { id: 1, name: "Alice", email: "new@b.com" } };
        vi.mocked(updateProfile).mockResolvedValue(payload);
        const res = mockRes();
        await handleUpdateProfile(mockReq({ name: "Alice", email: "new@b.com" }, { userId: 1 }), res);
        expect(res.json).toHaveBeenCalledWith(payload);
    });

    it("responds 400 when updateProfile throws a non-Error value", async () => {
        vi.mocked(updateProfile).mockRejectedValue("unexpected");
        const res = mockRes();
        await handleUpdateProfile(mockReq({ name: "Alice", email: "a@b.com" }, { userId: 1 }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Update failed." });
    });
});

describe("handleChangePassword", () => {
    beforeEach(() => vi.clearAllMocks());

    it("responds 400 when currentPassword is missing", async () => {
        const res = mockRes();
        await handleChangePassword(mockReq({ newPassword: "newpass1" }, { userId: 1 }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "currentPassword and newPassword are required.",
        });
    });

    it("responds 400 when newPassword is missing", async () => {
        const res = mockRes();
        await handleChangePassword(mockReq({ currentPassword: "old" }, { userId: 1 }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("responds 400 when newPassword is shorter than 8 characters", async () => {
        const res = mockRes();
        await handleChangePassword(
            mockReq({ currentPassword: "old", newPassword: "short" }, { userId: 1 }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "New password must be at least 8 characters.",
        });
    });

    it("responds with success message on successful password change", async () => {
        vi.mocked(changePassword).mockResolvedValue(undefined);
        const res = mockRes();
        await handleChangePassword(
            mockReq({ currentPassword: "oldpass1", newPassword: "newpass1" }, { userId: 1 }),
            res
        );
        expect(res.json).toHaveBeenCalledWith({ message: "Password updated." });
    });

    it("responds 400 when changePassword throws", async () => {
        vi.mocked(changePassword).mockRejectedValue(new Error("Current password is incorrect."));
        const res = mockRes();
        await handleChangePassword(
            mockReq({ currentPassword: "wrong", newPassword: "newpass1" }, { userId: 1 }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Current password is incorrect." });
    });

    it("responds 400 when changePassword throws a non-Error value", async () => {
        vi.mocked(changePassword).mockRejectedValue(42);
        const res = mockRes();
        await handleChangePassword(
            mockReq({ currentPassword: "old", newPassword: "newpass1" }, { userId: 1 }),
            res
        );
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Password change failed." });
    });
});

describe("handleGetProfile", () => {
    beforeEach(() => vi.clearAllMocks());

    it("responds 404 when user is not found", async () => {
        vi.mocked(User.findByPk).mockResolvedValue(null);
        const res = mockRes();
        await handleGetProfile(mockReq({}, { userId: 99 }), res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: "User not found." });
    });

    it("responds with user profile when user is found", async () => {
        const fakeUser = {
            id: 1,
            name: "Alice",
            email: "alice@example.com",
            passwordHash: "hashedpw",
            googleId: null,
            createdAt: new Date("2024-01-01"),
        };
        vi.mocked(User.findByPk).mockResolvedValue(fakeUser as any);
        const res = mockRes();
        await handleGetProfile(mockReq({}, { userId: 1 }), res);
        expect(res.json).toHaveBeenCalledWith({
            id: 1,
            name: "Alice",
            email: "alice@example.com",
            hasPassword: true,
            isGoogleUser: false,
            createdAt: fakeUser.createdAt,
        });
    });

    it("hasPassword is false when passwordHash is null", async () => {
        const fakeUser = {
            id: 2,
            name: "Google User",
            email: "g@example.com",
            passwordHash: null,
            googleId: "google-123",
            createdAt: new Date("2024-06-01"),
        };
        vi.mocked(User.findByPk).mockResolvedValue(fakeUser as any);
        const res = mockRes();
        await handleGetProfile(mockReq({}, { userId: 2 }), res);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ hasPassword: false, isGoogleUser: true })
        );
    });
});
