import { Router } from "express";
import { editProfile, getAllUsers, getMyCompanyEmployees, getUserKPI, onboardEmployee } from "../controllers/user.controller";
import { authGuard } from "../middlewares/authGuard";

const router = Router();

router.put("/edit-profile", authGuard, editProfile);
router.get("/", authGuard, getAllUsers);
router.get("/kpi", authGuard, getUserKPI);
router.post("/onboard", authGuard, onboardEmployee);
router.get("/company-employees", authGuard, getMyCompanyEmployees);
export default router;
