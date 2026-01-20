import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};

export const generateToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET!, { expiresIn: "1h" });
};

export const generateRefreshToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });
};

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
