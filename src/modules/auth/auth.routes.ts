import { Router } from "express";
import {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
} from "./auth.controller";
import { authGuard } from "../../middlewares/authGuard";

const router = Router();

// PUBLIC ROUTES
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// PROTECTED ROUTE
router.post("/logout", authGuard, logout);

export default router;
