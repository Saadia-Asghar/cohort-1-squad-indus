import type { Request, Response, NextFunction } from "express";

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function cleanupExpiredEntries(now: number): void {
  // A serverless instance can live longer than one request. Keep this fallback
  // limiter bounded until a shared store (for example Upstash) is introduced.
  if (requestCounts.size < 1_000) return;
  for (const [key, value] of requestCounts) {
    if (now > value.resetTime) requestCounts.delete(key);
  }
}

export function rateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    cleanupExpiredEntries(now);
    // Limits are intentionally scoped by endpoint. A customer using the chat
    // must not consume the login or checkout allowance for the same NAT IP.
    const key = `${req.method}:${req.baseUrl}${req.route?.path ?? req.path}:${ip}`;
    
    let record = requestCounts.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
    }
    
    record.count++;
    requestCounts.set(key, record);
    
    if (record.count > limit) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }
    
    next();
  };
}
