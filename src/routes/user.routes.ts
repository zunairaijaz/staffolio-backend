import { Router } from "express";
import { editProfile, getAllUsers } from "../controllers/user.controller";
import { authGuard } from "../middlewares/authGuard";

const router = Router();

router.put("/edit-profile", authGuard, editProfile);
router.get("/", authGuard, getAllUsers);
export default router;
