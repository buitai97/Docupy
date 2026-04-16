import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import { handleUpload } from "../controllers/upload.controller.js";
import { handleGuestUpload } from "../controllers/guest.controller.js";
import { upload } from "../middleware/upload.middleware.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
    "/",
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
        upload.single("file")(req, res, (err) => {
            if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
                res.status(413).json({ message: "File too large. Maximum size is 20 MB." });
            } else if (err) {
                res.status(400).json({ message: err.message });
            } else {
                next();
            }
        });
    },
    handleUpload,
);

router.post(
    "/guest",
    (req: Request, res: Response, next: NextFunction) => {
        upload.single("file")(req, res, (err) => {
            if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
                res.status(413).json({ message: "File too large. Maximum size is 20 MB." });
            } else if (err) {
                res.status(400).json({ message: err.message });
            } else {
                next();
            }
        });
    },
    handleGuestUpload,
);

export default router;