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
    res.status(201).json({ success: true, message: "Company registered", company });
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

    const token = generateToken(company._id.toString(), "COMPANY"); // now includes company in JWT
    res.json({ success: true, token, company });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
