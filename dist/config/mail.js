"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMailTransporter = exports.getMailFrom = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const getMailFrom = () => {
    const email = process.env.EMAIL;
    const name = process.env.EMAIL_FROM_NAME || "Staffolio HR";
    return `"${name}" <${email}>`;
};
exports.getMailFrom = getMailFrom;
const createMailTransporter = () => {
    const pass = (process.env.EMAIL_PASSWORD ?? "").replace(/\s/g, "");
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL,
            pass,
        },
    });
};
exports.createMailTransporter = createMailTransporter;
