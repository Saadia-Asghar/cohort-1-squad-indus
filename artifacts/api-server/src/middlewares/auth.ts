import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import { bakerMembersTable, bakersTable, db } from "@workspace/db";
import { verifyToken } from "../lib/auth.js";

export interface AuthenticatedRequest extends Request {
  bakerId?: number;
  clerkUserId?: string;
  clerkOrganizationId?: string;
  /** owner (default) | staff */
  memberRole?: string;
  memberId?: number;
}

function clerkIsRequired(): boolean {
  return process.env.AUTH_MODE === "clerk-only";
}

function isClerkConfigured(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY &&
    process.env.CLERK_PUBLISHABLE_KEY,
  );
}

export function requireClerkUser(req: Request, res: Response, next: NextFunction): void {
  if (!isClerkConfigured()) {
    res.status(503).json({ error: "Managed authentication is not configured." });
    return;
  }

  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Sign in is required." });
    return;
  }

  const request = req as AuthenticatedRequest;
  request.clerkUserId = auth.userId;
  request.clerkOrganizationId = auth.orgId ?? undefined;
  next();
}

export async function requireBakerAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (isClerkConfigured() && process.env.AUTH_MODE !== "legacy") {
    const auth = getAuth(req);
    if (auth.userId) {
      const [baker] = auth.orgId
        ? await db
            .select({ id: bakersTable.id })
            .from(bakersTable)
            .where(eq(bakersTable.clerkOrganizationId, auth.orgId))
            .limit(1)
        : await db
            .select({ id: bakersTable.id })
            .from(bakersTable)
            .where(eq(bakersTable.clerkUserId, auth.userId))
            .limit(1);

      if (baker) {
        const request = req as AuthenticatedRequest;
        request.bakerId = baker.id;
        request.clerkUserId = auth.userId;
        request.clerkOrganizationId = auth.orgId ?? undefined;
        request.memberRole = "owner";
        next();
        return;
      }

      const [member] = await db
        .select({
          id: bakerMembersTable.id,
          bakerId: bakerMembersTable.bakerId,
          role: bakerMembersTable.role,
        })
        .from(bakerMembersTable)
        .where(
          and(
            eq(bakerMembersTable.clerkUserId, auth.userId),
            eq(bakerMembersTable.active, true),
          ),
        )
        .limit(1);

      if (!member) {
        res.status(403).json({
          error: "Complete bakery onboarding before accessing the dashboard.",
          code: "BAKER_ONBOARDING_REQUIRED",
        });
        return;
      }

      const request = req as AuthenticatedRequest;
      request.bakerId = member.bakerId;
      request.clerkUserId = auth.userId;
      request.memberRole = member.role;
      request.memberId = member.id;
      next();
      return;
    }
    // Clerk is configured but this request uses a native baker JWT — keep email/password login working.
  }

  if (clerkIsRequired()) {
    res.status(503).json({ error: "Managed authentication is not configured." });
    return;
  }

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

  const request = req as AuthenticatedRequest;
  request.bakerId = decoded.bakerId;
  request.memberRole = typeof decoded.role === "string" ? decoded.role : "owner";
  if (typeof decoded.memberId === "number") request.memberId = decoded.memberId;
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
