import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};

// Use JWT_ACCESS_SECRET here
export const generateToken = (userId: string, role: string) => {
  if (!process.env.JWT_ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET missing");
  return jwt.sign({ userId, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: "1h" });
};

export const generateRefreshToken = (userId: string, role: string) => {
  if (!process.env.JWT_REFRESH_SECRET) throw new Error("JWT_REFRESH_SECRET missing");
  return jwt.sign({ userId, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
};

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
