import { Router } from "express";
import { registerCompany, loginCompany } from "../controllers/company.controller";

const router = Router();

router.post("/register", registerCompany);
router.post("/login", loginCompany);

export default router;
