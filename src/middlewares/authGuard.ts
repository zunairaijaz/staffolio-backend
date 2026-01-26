import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

// ✅ Extend Request to include `user`
export interface AuthRequest extends Request {
  user?: string | JwtPayload;
}

export const authGuard = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    req.user = decoded; // now TypeScript knows `req.user` exists
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
