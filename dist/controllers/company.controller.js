"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCompanyProfile = exports.loginCompany = exports.registerCompany = void 0;
const company_1 = __importDefault(require("../models/company"));
const auth_utils_1 = require("../utils/auth.utils");
const registerCompany = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ success: false, message: "Name, email, and password required" });
        const existing = await company_1.default.findOne({ email });
        if (existing)
            return res.status(400).json({ success: false, message: "Email already exists" });
        const hashed = await (0, auth_utils_1.hashPassword)(password);
        const company = await company_1.default.create({ name, email, password: hashed, phone });
        const safeCompany = await company_1.default.findById(company._id).select("-password");
        res.status(201).json({ success: true, message: "Company registered", company: safeCompany });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.registerCompany = registerCompany;
const loginCompany = async (req, res) => {
    try {
        const { email, password } = req.body;
        const company = await company_1.default.findOne({ email });
        if (!company)
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        const isValid = await (0, auth_utils_1.comparePassword)(password, company.password);
        if (!isValid)
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        const token = (0, auth_utils_1.generateToken)(company._id.toString(), "COMPANY");
        const safeCompany = await company_1.default.findById(company._id).select("-password");
        res.json({ success: true, token, company: safeCompany });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.loginCompany = loginCompany;
const updateCompanyProfile = async (req, res) => {
    try {
        const companyId = req.user.userId;
        const { name, phone, region, language, password } = req.body;
        // 1. Prepare the update object
        const updateData = {
            name,
            phone,
            region,
            language,
            updatedAt: new Date()
        };
        // 2. Only hash and update password if the user actually typed a new one
        if (password && password.trim().length >= 8) {
            updateData.password = await (0, auth_utils_1.hashPassword)(password);
        }
        // 3. Update the database
        const updatedCompany = await company_1.default.findByIdAndUpdate(companyId, { $set: updateData }, {
            new: true, // Returns the modified document rather than the original
            runValidators: true // Ensures the new data follows your Schema rules
        }).select("-password"); // Security: do not send the hash back to the client
        if (!updatedCompany) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }
        res.json({
            success: true,
            message: "Profile updated successfully",
            company: updatedCompany
        });
    }
    catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ success: false, message: "Server error during update" });
    }
};
exports.updateCompanyProfile = updateCompanyProfile;
