import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ChatMessage } from "../models/chatMessage.model.js";
import { sequelize } from "../models/sequelize.js";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET environment variable is not set");
const JWT_SECRET = process.env.JWT_SECRET!;

export async function initDatabase() {
    await sequelize.query(`CREATE EXTENSION IF NOT EXISTS vector`).catch((err) => console.warn("pgvector:", err.message));

    await User.sync();
    await ChatMessage.sync();

    // Create documents table if it doesn't exist, then ensure correct column types
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS documents (
            id SERIAL PRIMARY KEY,
            content TEXT NOT NULL,
            embedding vector(1536) NOT NULL,
            document_id TEXT NOT NULL,
            user_id INTEGER REFERENCES users(id),
            name TEXT
        )
    `).catch((err) => console.warn("Migration warning:", err.message));

    await Promise.all([
        sequelize.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`).catch((err) => console.warn("Migration warning:", err.message)),
        sequelize.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)`).catch((err) => console.warn("Migration warning:", err.message)),
        sequelize.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS name TEXT`).catch((err) => console.warn("Migration warning:", err.message)),
        // If embedding column exists as TEXT, upgrade it to vector(1536)
        sequelize.query(`ALTER TABLE documents ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector`).catch(() => {}),
    ]);
}

export async function findOrCreateGoogleUser(googleId: string, email: string, name: string) {
    let user = await User.findOne({ where: { googleId } });
    if (!user) {
        user = await User.findOne({ where: { email } });
    }
    if (user) {
        await user.update({ googleId });
        return signToken(user);
    }
    user = await User.create({ name, email, googleId });
    return signToken(user);
}

export async function registerUser(name: string, email: string, password: string) {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
        throw new Error("Email already in use.");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    return signToken(user);
}

export async function loginUser(email: string, password: string) {
    const user = await User.findOne({ where: { email } });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new Error("Invalid credentials.");
    }
    return signToken(user);
}

function signToken(user: User) {
    const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
    return { token, user: { id: user.id, name: user.name, email: user.email } };
}

export function verifyToken(token: string) {
    return jwt.verify(token, JWT_SECRET) as { id: number; email: string; name: string };
}

export async function updateProfile(userId: number, name: string, email: string) {
    const conflict = await User.findOne({ where: { email } });
    if (conflict && conflict.id !== userId) {
        throw new Error("Email already in use.");
    }
    const user = await User.findByPk(userId);
    if (!user) throw new Error("User not found.");
    await user.update({ name, email });
    return signToken(user);
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await User.findByPk(userId);
    if (!user || !user.passwordHash) throw new Error("No password set on this account.");
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
        throw new Error("Current password is incorrect.");
    }
    await user.update({ passwordHash: await bcrypt.hash(newPassword, 10) });
}
