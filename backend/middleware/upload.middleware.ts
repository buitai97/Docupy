import multer from "multer";
import { ACCEPTED_MIMETYPES } from "../services/extract.service.js";

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

export const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (ACCEPTED_MIMETYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF, DOCX, and TXT files are supported."));
        }
    },
});