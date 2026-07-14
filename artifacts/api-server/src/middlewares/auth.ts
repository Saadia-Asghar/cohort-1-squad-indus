import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";

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
  if (!decoded || typeof decoded.bakerId !== "number") {
    res.status(401).json({ error: "Invalid or expired token." });
    return;
  }

  (req as AuthenticatedRequest).bakerId = decoded.bakerId;
  next();
}

/** Ensures a signed-in baker can access only routes for their own bakery. */
export function requireBakerOwnership(req: Request, res: Response, next: NextFunction): void {
  const rawBakerId = req.params.bakerId ?? req.query.bakerId;
  const bakerId = Number(Array.isArray(rawBakerId) ? rawBakerId[0] : rawBakerId);
  if (!Number.isInteger(bakerId) || bakerId <= 0) {
    res.status(400).json({ error: "A valid bakerId is required." });
    return;
  }
  if ((req as AuthenticatedRequest).bakerId !== bakerId) {
    res.status(403).json({ error: "You can only access your own bakery data." });
    return;
  }
  next();
}
