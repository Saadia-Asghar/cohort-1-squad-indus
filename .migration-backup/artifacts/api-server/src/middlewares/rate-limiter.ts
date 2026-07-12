import type { Request, Response, NextFunction } from "express";

const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    
    let record = ipRequestCounts.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
    }
    
    record.count++;
    ipRequestCounts.set(ip, record);
    
    if (record.count > limit) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }
    
    next();
  };
}
