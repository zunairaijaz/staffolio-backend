import { Request, Response } from "express";
import { pool } from "../../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

/**
 * REGISTER
 */
export const register = async (req: Request, res: Response) => {
  const { name, email, phone, password } = req.body;

  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const exists = await pool.query(
    "SELECT id FROM users WHERE email=$1 OR phone=$2",
    [email, phone]
  );

  if (exists.rows.length) {
    return res.status(409).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (name, email, phone, password)
     VALUES ($1, $2, $3, $4)`,
    [name, email, phone, hashedPassword]
  );

  res.status(201).json({ message: "User registered successfully" });
};

/**
 * LOGIN
 */
export const login = async (req: Request, res: Response) => {
  const { email, phone, password } = req.body;

  if ((!email && !phone) || !password) {
    return res.status(400).json({
      message: "Email or phone and password are required",
    });
  }

  const result = await pool.query(
    `SELECT * FROM users 
     WHERE email = $1 OR phone = $2
     LIMIT 1`,
    [email || null, phone || null]
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + interval '7 days')`,
    [user.id, refreshToken]
  );

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
};

/**
 * FORGOT PASSWORD
 */
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
  if (!user.rows.length) {
    return res.json({ message: "If user exists, reset allowed" });
  }

  res.json({
    message: "Proceed to reset password (OTP removed)",
  });
};

/**
 * RESET PASSWORD
 */
export const resetPassword = async (req: Request, res: Response) => {
  const { email, newPassword } = req.body;

  const hashed = await bcrypt.hash(newPassword, 10);

  await pool.query(
    "UPDATE users SET password=$1 WHERE email=$2",
    [hashed, email]
  );

  await pool.query(
    "DELETE FROM refresh_tokens WHERE user_id = (SELECT id FROM users WHERE email=$1)",
    [email]
  );

  res.json({ message: "Password reset successful" });
};

/**
 * LOGOUT
 */
export const logout = async (req: any, res: Response) => {
  const userId = req.user.id;

  await pool.query("DELETE FROM refresh_tokens WHERE user_id=$1", [userId]);

  res.json({ message: "Logged out successfully" });
};
