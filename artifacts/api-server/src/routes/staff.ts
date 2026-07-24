import { Router } from "express";
import { and, count, eq, sql } from "drizzle-orm";
import { bakerMembersTable, bakersTable, db } from "@workspace/db";
import { z } from "zod";
import { hashPassword } from "../lib/auth.js";
import {
  type AuthenticatedRequest,
  requireBakerAuth,
} from "../middlewares/auth.js";
import { staffLoginsForPlan } from "../lib/plan-limits.js";
import { rateLimit } from "../middlewares/rate-limiter.js";

const router = Router();

async function requireOwnerRole(req: AuthenticatedRequest, res: import("express").Response): Promise<boolean> {
  const role = req.memberRole ?? "owner";
  if (role !== "owner") {
    res.status(403).json({ error: "Only the bakery owner can manage team logins." });
    return false;
  }
  return true;
}

// GET /bakers/:bakerId/team
router.get("/bakers/:bakerId/team", requireBakerAuth, async (req, res): Promise<void> => {
  const bakerId = Number(req.params.bakerId);
  const auth = req as AuthenticatedRequest;
  if (!Number.isInteger(bakerId) || bakerId <= 0 || auth.bakerId !== bakerId) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  const [baker] = await db
    .select({
      email: bakersTable.email,
      ownerName: bakersTable.ownerName,
      subscriptionPlan: bakersTable.subscriptionPlan,
    })
    .from(bakersTable)
    .where(eq(bakersTable.id, bakerId))
    .limit(1);

  if (!baker) {
    res.status(404).json({ error: "Baker not found" });
    return;
  }

  const members = await db
    .select({
      id: bakerMembersTable.id,
      email: bakerMembersTable.email,
      role: bakerMembersTable.role,
      displayName: bakerMembersTable.displayName,
      active: bakerMembersTable.active,
      createdAt: bakerMembersTable.createdAt,
    })
    .from(bakerMembersTable)
    .where(eq(bakerMembersTable.bakerId, bakerId));

  const seatLimit = staffLoginsForPlan(baker.subscriptionPlan);
  const activeStaff = members.filter((m) => m.active && m.role === "staff").length;
  // Owner counts as 1 seat; remaining seats are staff invites.
  const seatsUsed = 1 + activeStaff;

  res.json({
    seatLimit,
    seatsUsed,
    seatsAvailable: Math.max(0, seatLimit - seatsUsed),
    owner: {
      email: baker.email,
      displayName: baker.ownerName,
      role: "owner",
    },
    members,
    yourRole: auth.memberRole ?? "owner",
  });
});

// POST /bakers/:bakerId/team — invite / create staff login
router.post(
  "/bakers/:bakerId/team",
  requireBakerAuth,
  rateLimit(20, 60 * 60 * 1000),
  async (req, res): Promise<void> => {
    const bakerId = Number(req.params.bakerId);
    const auth = req as AuthenticatedRequest;
    if (!Number.isInteger(bakerId) || bakerId <= 0 || auth.bakerId !== bakerId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    if (!(await requireOwnerRole(auth, res))) return;

    const parsed = z
      .object({
        email: z.string().email(),
        password: z.string().min(8).max(128),
        displayName: z.string().min(1).max(80).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    const [baker] = await db
      .select({
        email: bakersTable.email,
        subscriptionPlan: bakersTable.subscriptionPlan,
      })
      .from(bakersTable)
      .where(eq(bakersTable.id, bakerId))
      .limit(1);
    if (!baker) {
      res.status(404).json({ error: "Baker not found" });
      return;
    }
    if ((baker.email ?? "").trim().toLowerCase() === email) {
      res.status(400).json({ error: "That email is already the owner login." });
      return;
    }

    const seatLimit = staffLoginsForPlan(baker.subscriptionPlan);
    const [{ value: activeStaff }] = await db
      .select({ value: count() })
      .from(bakerMembersTable)
      .where(
        and(
          eq(bakerMembersTable.bakerId, bakerId),
          eq(bakerMembersTable.active, true),
          eq(bakerMembersTable.role, "staff"),
        ),
      );
    if (1 + Number(activeStaff) >= seatLimit) {
      res.status(403).json({
        error: `Your plan allows ${seatLimit} login(s) including the owner. Upgrade to Bakery Team for a second seat.`,
        code: "STAFF_SEAT_LIMIT",
      });
      return;
    }

    const [existing] = await db
      .select({ id: bakerMembersTable.id, active: bakerMembersTable.active })
      .from(bakerMembersTable)
      .where(
        and(
          eq(bakerMembersTable.bakerId, bakerId),
          sql`lower(${bakerMembersTable.email}) = ${email}`,
        ),
      )
      .limit(1);

    const passwordHash = hashPassword(parsed.data.password);
    const displayName = parsed.data.displayName?.trim() || email.split("@")[0] || "Staff";

    if (existing) {
      const [updated] = await db
        .update(bakerMembersTable)
        .set({
          passwordHash,
          displayName,
          active: true,
          role: "staff",
        })
        .where(eq(bakerMembersTable.id, existing.id))
        .returning({
          id: bakerMembersTable.id,
          email: bakerMembersTable.email,
          role: bakerMembersTable.role,
          displayName: bakerMembersTable.displayName,
          active: bakerMembersTable.active,
        });
      res.json({ member: updated, reactivated: true });
      return;
    }

    try {
      const [created] = await db
        .insert(bakerMembersTable)
        .values({
          bakerId,
          email,
          passwordHash,
          displayName,
          role: "staff",
          active: true,
        })
        .returning({
          id: bakerMembersTable.id,
          email: bakerMembersTable.email,
          role: bakerMembersTable.role,
          displayName: bakerMembersTable.displayName,
          active: bakerMembersTable.active,
        });
      res.status(201).json({ member: created });
    } catch {
      res.status(409).json({ error: "Could not create staff login. Email may already be in use." });
    }
  },
);

// DELETE /bakers/:bakerId/team/:memberId — deactivate staff
router.delete(
  "/bakers/:bakerId/team/:memberId",
  requireBakerAuth,
  async (req, res): Promise<void> => {
    const bakerId = Number(req.params.bakerId);
    const memberId = Number(req.params.memberId);
    const auth = req as AuthenticatedRequest;
    if (
      !Number.isInteger(bakerId) ||
      bakerId <= 0 ||
      auth.bakerId !== bakerId ||
      !Number.isInteger(memberId)
    ) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
    if (!(await requireOwnerRole(auth, res))) return;

    const [updated] = await db
      .update(bakerMembersTable)
      .set({ active: false })
      .where(and(eq(bakerMembersTable.id, memberId), eq(bakerMembersTable.bakerId, bakerId)))
      .returning({ id: bakerMembersTable.id });

    if (!updated) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }
    res.json({ ok: true });
  },
);

export default router;
