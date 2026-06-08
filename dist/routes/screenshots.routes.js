"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const screenshot_controller_1 = require("../controllers/screenshot.controller");
const jwt_1 = require("../utils/jwt");
const router = (0, express_1.Router)();
// ✅ use memory storage to avoid writing to disk
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
router.post('/upload', upload.single('screenshot'), screenshot_controller_1.uploadScreenshot);
router.get('/', jwt_1.authGuard, screenshot_controller_1.getAllScreenshots);
exports.default = router;
