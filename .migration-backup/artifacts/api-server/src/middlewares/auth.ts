import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth";

export interface AuthenticatedRequest extends Request {
  bakerId?: number;
}

export function requireBakerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.bakerId) {
    res.status(401).json({ error: "Invalid or expired token." });
    return;
  }

  (req as any).bakerId = decoded.bakerId;
  next();
}
