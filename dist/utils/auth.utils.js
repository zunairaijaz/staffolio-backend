"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTP = exports.generateRefreshToken = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const hashPassword = async (password) => {
    return await bcrypt_1.default.hash(password, 10);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hash) => {
    return await bcrypt_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
// Use JWT_ACCESS_SECRET here
const generateToken = (userId, role) => {
    if (!process.env.JWT_ACCESS_SECRET)
        throw new Error("JWT_ACCESS_SECRET missing");
    return jsonwebtoken_1.default.sign({ userId, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: "24h" });
};
exports.generateToken = generateToken;
const generateRefreshToken = (userId, role) => {
    if (!process.env.JWT_REFRESH_SECRET)
        throw new Error("JWT_REFRESH_SECRET missing");
    return jsonwebtoken_1.default.sign({ userId, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
};
exports.generateRefreshToken = generateRefreshToken;
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
exports.generateOTP = generateOTP;
