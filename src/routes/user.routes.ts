import { Router } from "express";
import { deactivateEmployee, editProfile, getAllUsers, getCompanyEmployeesWithHours, getMyCompanyEmployees, getUserKPI, getWeeklyPerformance, onboardEmployee } from "../controllers/user.controller";
import { authGuard } from "../middlewares/authGuard";

const router = Router();

router.put("/edit-profile", authGuard, editProfile);
router.get("/", authGuard, getAllUsers);
router.get("/kpi", authGuard, getUserKPI);
router.post("/onboard", authGuard, onboardEmployee);
router.get("/company-employees", authGuard, getCompanyEmployeesWithHours);
router.get("/myEmployees", authGuard, getCompanyEmployeesWithHours);
router.patch('/deactivate/:id', authGuard, deactivateEmployee);
router.get('/weekly-performance/:id', getWeeklyPerformance);
export default router; 
