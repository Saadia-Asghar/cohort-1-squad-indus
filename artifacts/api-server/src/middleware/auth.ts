import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";

// Augment Express Request to carry userId after auth check
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}
