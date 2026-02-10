import { Router } from "express";
import { editProfile, getAllUsers, getUserKPI } from "../controllers/user.controller";
import { authGuard } from "../middlewares/authGuard";

const router = Router();

router.put("/edit-profile", authGuard, editProfile);
router.get("/", authGuard, getAllUsers);
router.get("/kpi", authGuard, getUserKPI);

export default router;
