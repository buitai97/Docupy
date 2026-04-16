import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/auth.service.js";

import type { AuthRequest } from "../middleware/auth.middleware.js";

export const handleGoogleCallback = (req: Request, res: Response) => {
    try {
        const { token } = req.user as { token: string };
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (err) {
        res.status(500).json({ message: "Authentication failed" });
    }
};

export async function handleRegister(req: Request, res: Response) {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        res.status(400).json({ message: "Name, email, and password are required." });
        return;
    }
    try {
        const result = await registerUser(name, email, password);
        res.status(201).json(result);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Registration failed.";
        res.status(400).json({ message });
    }
}

export async function handleLogin(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: "Email and password are required." });
        return;
    }
    try {
        const result = await loginUser(email, password);
        res.json(result);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Login failed.";
        res.status(401).json({ message });
    }
}

export function handleMe(req: AuthRequest, res: Response) {
    res.json({ id: req.userId, email: req.userEmail, name: req.userName });
}

export async function handleUpdateProfile(req: AuthRequest, res: Response) {
    const { name, email } = req.body;
    if (!name?.trim() || !email?.trim()) {
        res.status(400).json({ message: "Name and email are required." });
        return;
    }
    try {
        const { updateProfile } = await import("../services/auth.service.js");
        const result = await updateProfile(req.userId!, name.trim(), email.trim());
        res.json(result);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Update failed.";
        res.status(400).json({ message });
    }
}

export async function handleChangePassword(req: AuthRequest, res: Response) {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        res.status(400).json({ message: "currentPassword and newPassword are required." });
        return;
    }
    if (newPassword.length < 8) {
        res.status(400).json({ message: "New password must be at least 8 characters." });
        return;
    }
    try {
        const { changePassword } = await import("../services/auth.service.js");
        await changePassword(req.userId!, currentPassword, newPassword);
        res.json({ message: "Password updated." });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Password change failed.";
        res.status(400).json({ message });
    }
}

export async function handleGetProfile(req: AuthRequest, res: Response) {
    const { User } = await import("../models/user.model.js");
    const user = await User.findByPk(req.userId, { attributes: ["id", "name", "email", "passwordHash", "googleId", "createdAt"] });
    if (!user) { res.status(404).json({ message: "User not found." }); return; }
    res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        hasPassword: !!user.passwordHash,
        isGoogleUser: !!user.googleId,
        createdAt: user.createdAt,
    });
}
