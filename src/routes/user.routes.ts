import { Router } from "express";
import { editProfile } from "../controllers/user.controller";
import { authGuard } from "../middlewares/authGuard";

const router = Router();

router.put("/edit-profile", authGuard, editProfile);

export default router;
