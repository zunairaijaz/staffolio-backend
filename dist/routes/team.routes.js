"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const teamController_1 = require("../controllers/teamController");
const authGuard_1 = require("../middlewares/authGuard");
const router = express_1.default.Router();
router.post("/create", authGuard_1.authGuard, teamController_1.createTeam);
router.get("/", authGuard_1.authGuard, teamController_1.getAllTeams);
router.put("/:teamId", authGuard_1.authGuard, teamController_1.updateTeam);
router.delete("/:teamId", authGuard_1.authGuard, teamController_1.deleteTeam);
router.get("/my-teams", authGuard_1.authGuard, teamController_1.getMyCompanyTeams);
router.get("/company/:teamId", authGuard_1.authGuard, teamController_1.getTeamFullDetailsById);
exports.default = router;
