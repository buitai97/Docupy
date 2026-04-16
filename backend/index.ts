import "dotenv/config";
import express from "express";
import cors from "cors";
import { loadConfig } from "./config/paramStore.js";
import { registerRoutes } from "./routes/index.js";
import { initDatabase } from "./services/auth.service.js";
import { globalLimiter } from "./config/rate-limit.js";

const PORT = Number(process.env.PORT ?? 5000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000").split(",");

async function start() {
    await loadConfig();

    const app = express();
    app.set("trust proxy", 1);
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Origin not allowed by CORS"));
            }
        },
    }));

    app.use(express.json());
    app.use(globalLimiter);
    app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
    await registerRoutes(app);
    await initDatabase();

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
