import { Router } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";

const router = Router();

// GET /bakers/:bakerId/notifications
router.get("/bakers/:bakerId/notifications", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const bakerId = parseInt(String(req.params.bakerId), 10);
  if (isNaN(bakerId)) { res.status(400).json({ error: "Invalid bakerId" }); return; }

  const notifs = await db.select()
    .from(notificationsTable)
    .where(eq(notificationsTable.bakerId, bakerId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(notifs);
});

// POST /bakers/:bakerId/notifications/read-all
router.post("/bakers/:bakerId/notifications/read-all", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const bakerId = parseInt(String(req.params.bakerId), 10);
  if (isNaN(bakerId)) { res.status(400).json({ error: "Invalid bakerId" }); return; }

  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.bakerId, bakerId));

  res.json({ success: true });
});

// PATCH /bakers/:bakerId/notifications/:notifId/read
router.patch("/bakers/:bakerId/notifications/:notifId/read", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const bakerId = parseInt(String(req.params.bakerId), 10);
  const notifId = parseInt(String(req.params.notifId), 10);
  if (isNaN(bakerId) || isNaN(notifId)) { res.status(400).json({ error: "Invalid params" }); return; }

  const [updated] = await db.update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, notifId), eq(notificationsTable.bakerId, bakerId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(updated);
});

export default router;
