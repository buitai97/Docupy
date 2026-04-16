import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service.js";

export interface AuthRequest extends Request {
    userId?: number;
    userEmail?: string;
    userName?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Authentication required." });
        return;
    }
    try {
        const payload = verifyToken(header.slice(7));
        req.userId = payload.id;
        req.userEmail = payload.email;
        req.userName = payload.name;
        next();
    } catch {
        res.status(401).json({ message: "Invalid or expired token." });
    }
}
