"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpExpiry = exports.generateOTP = void 0;
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
exports.generateOTP = generateOTP;
const otpExpiry = () => new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
exports.otpExpiry = otpExpiry;
