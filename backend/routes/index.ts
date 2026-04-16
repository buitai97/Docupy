import { Express } from "express";

export async function registerRoutes(app: Express) {
    const [{ default: authRoutes }, { default: uploadRoutes }, { default: chatRoutes }, { default: documentRoutes }] =
        await Promise.all([
            import("./auth.routes.js"),
            import("./upload.routes.js"),
            import("./chat.routes.js"),
            import("./document.routes.js"),
        ]);

    await import("../config/passport.js");
    
    app.use("/api/auth", authRoutes);
    app.use("/api/upload", uploadRoutes);
    app.use("/api/chat", chatRoutes);
    app.use("/api/documents", documentRoutes);
}
