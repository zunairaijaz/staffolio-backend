import { Router } from "express";
import { registerCompany, loginCompany, updateCompanyProfile } from "../controllers/company.controller";
import { authGuard } from "../middlewares/authGuard";
const router = Router();

router.post("/register", registerCompany);
router.post("/login", loginCompany);
router.put('/update-profile', authGuard, updateCompanyProfile);

export default router;
