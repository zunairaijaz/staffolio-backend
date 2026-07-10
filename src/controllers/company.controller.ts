import { Request, Response } from "express";
import Company from "../models/company";
import { hashPassword, comparePassword, generateToken } from "../utils/auth.utils";

interface CompanyRegisterBody {
  name: string;
  email: string;
  password: string;
  phone?: string;
}
interface CompanyLoginBody {
  email: string;
  password: string;
}
export const registerCompany = async (req: Request<{}, {}, CompanyRegisterBody>, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Name, email, and password required" });

    const existing = await Company.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "Email already exists" });

    const hashed = await hashPassword(password);
    const company = await Company.create({ name, email, password: hashed, phone });
    const safeCompany = await Company.findById(company._id).select("-password");
    res.status(201).json({ success: true, message: "Company registered", company: safeCompany });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const loginCompany = async (req: Request<{}, {}, CompanyLoginBody>, res: Response) => {
  try {
    const { email, password } = req.body;
    const company = await Company.findOne({ email });
    if (!company) return res                                                                                        .status(401).json({ success: false, message: "Invalid credentials" });

    const isValid = await comparePassword(password, company.password);
    if (!isValid) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken(company._id.toString(), "COMPANY");
    const safeCompany = await Company.findById(company._id).select("-password");
    res.json({ success: true, token, company: safeCompany });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCompanyProfile = async (req: Request, res: Response) => {
 
  try {
const companyId = (req as any).user.userId;
    const { name, phone, region, language, password } = req.body;

    // 1. Prepare the update object
    const updateData: any = { 
      name, 
      phone, 
      region, 
      language,
      updatedAt: new Date() 
    };

    // 2. Only hash and update password if the user actually typed a new one
    if (password && password.trim().length >= 8) {
      updateData.password = await hashPassword(password);
    }

    // 3. Update the database
    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      { $set: updateData },
      { 
        new: true, // Returns the modified document rather than the original
        runValidators: true // Ensures the new data follows your Schema rules
      }
    ).select("-password"); // Security: do not send the hash back to the client

    if (!updatedCompany) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    res.json({ 
      success: true, 
      message: "Profile updated successfully", 
      company: updatedCompany 
    });
  } catch (err: any) {
    console.error("Update Error:", err);
    res.status(500).json({ success: false, message: "Server error during update" });
  }
};