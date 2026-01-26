import User from "../models/User";
import { hashPassword, comparePassword, generateToken, generateOTP } from "../utils/auth.utils";
import nodemailer from "nodemailer";
import { Request, Response } from "express";

// Setup nodemailer (example with Gmail)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD }
});

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // 1️⃣ Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required" });
    }

    // 2️⃣ Check if email already exists (this is where your error comes from)
    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // 3️⃣ Hash password and generate OTP
    const hashed = await hashPassword(password);
    const otp = generateOTP();

    // 4️⃣ Create user
    const user = await User.create({
      name,
      email,
      password: hashed,
      otp,
      otpExpiry: new Date(Date.now() + 10 * 60000),
    });

    // 5️⃣ Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
    });

    // 6️⃣ Respond success
    res.json({ success: true, message: "OTP sent to email" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};



export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.otp !== otp || user.otpExpiry! < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ success: true, message: "Account verified successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !user.isVerified) {
      return res.status(401).json({ success: false, message: "Account not verified" });
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(user._id.toString(), user.role);
    const refreshToken = generateToken(user._id.toString(), user.role); // optional

    // Prepare user data to send (exclude sensitive info)
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified
    };

    res.json({
      success: true,
      message: "Login successful",
      token,
      refreshToken,
      user: userData, // ✅ include full user details here
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const logout = async (req: Request, res: Response) => {
  res.json({ success: true, message: "Logged out successfully" });
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: "If the user exists, OTP sent" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60000);
    await user.save();

    await transporter.sendMail({ from: process.env.EMAIL, to: email, subject: "Reset Password OTP", text: `OTP: ${otp}` });
    res.json({ success: true, message: "OTP sent to email" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || user.otpExpiry! < new Date()) return res.status(400).json({ success: false, message: "Invalid OTP" });

    user.password = await hashPassword(newPassword);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ success: true, message: "Password reset successful" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
