import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authGuard = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    req.user = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
