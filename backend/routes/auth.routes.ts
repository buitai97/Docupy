import express from "express";
import passport from "../config/passport.js";
import { handleRegister, handleLogin, handleGoogleCallback, handleMe, handleGetProfile, handleUpdateProfile, handleChangePassword } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { authLimiter } from "../config/rate-limit.js";

const router = express.Router();

router.post("/register", handleRegister);
router.post("/login", authLimiter, handleLogin);
router.get("/me", requireAuth, handleMe);
router.get("/profile", requireAuth, handleGetProfile);
router.patch("/profile", requireAuth, handleUpdateProfile);
router.patch("/password", requireAuth, handleChangePassword);

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback", passport.authenticate("google", { session: false }), handleGoogleCallback);

export default router;
