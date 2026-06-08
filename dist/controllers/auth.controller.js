"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.logout = exports.login = exports.verifyOtp = exports.register = void 0;
const User_1 = __importDefault(require("../models/User"));
const auth_utils_1 = require("../utils/auth.utils");
const mail_1 = require("../config/mail");
const transporter = (0, mail_1.createMailTransporter)();
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        // 1️⃣ Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required",
            });
        }
        // 2️⃣ Check if email already exists
        if (await User_1.default.findOne({ email })) {
            return res.status(400).json({ success: false, message: "Email already exists" });
        }
        // 3️⃣ Hash password and generate OTP
        const hashed = await (0, auth_utils_1.hashPassword)(password);
        const otp = (0, auth_utils_1.generateOTP)();
        // 4️⃣ Determine role: use provided role, otherwise default to 'employee'
        const userRole = role ? role : "EMPLOYEE";
        // 5️⃣ Create user
        const user = await User_1.default.create({
            name,
            email,
            password: hashed,
            role: userRole,
            otp,
            otpExpiry: new Date(Date.now() + 10 * 60000), // 10 min expiry
        });
        // 6️⃣ Send OTP email
        await transporter.sendMail({
            from: (0, mail_1.getMailFrom)(),
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
        });
        // 7️⃣ Respond success
        res.json({ success: true, message: "OTP sent to email" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.register = register;
const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user || user.otp !== otp || user.otpExpiry < new Date()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }
        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();
        res.json({ success: true, message: "Account verified successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.verifyOtp = verifyOtp;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user || !user.isVerified) {
            return res.status(401).json({ success: false, message: "Account not verified" });
        }
        const isValid = await (0, auth_utils_1.comparePassword)(password, user.password);
        if (!isValid) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }
        const token = (0, auth_utils_1.generateToken)(user._id.toString(), user.role);
        const refreshToken = (0, auth_utils_1.generateToken)(user._id.toString(), user.role); // optional
        // Prepare user data to send (exclude sensitive info)
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            teamName: user.teamName,
            status: user.status,
            dateOfBirth: user.dateOfBirth,
            countryCode: user.countryCode,
            phone: user.phone,
            LastLogin: user.lastLogin,
            company: user.company,
            isVerified: user.isVerified
        };
        res.json({
            success: true,
            message: "Login successful",
            token,
            refreshToken,
            user: userData, // ✅ include full user details here
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.login = login;
const logout = async (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
};
exports.logout = logout;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user)
            return res.json({ success: true, message: "If the user exists, OTP sent" });
        const otp = (0, auth_utils_1.generateOTP)();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60000);
        await user.save();
        await transporter.sendMail({ from: (0, mail_1.getMailFrom)(), to: email, subject: "Reset Password OTP", text: `OTP: ${otp}` });
        res.json({ success: true, message: "OTP sent to email" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user || user.otp !== otp || user.otpExpiry < new Date())
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        user.password = await (0, auth_utils_1.hashPassword)(newPassword);
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();
        res.json({ success: true, message: "Password reset successful" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.resetPassword = resetPassword;
