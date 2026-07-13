import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";

const router = Router();

// GET /bakers/:bakerId/notifications
router.get("/bakers/:bakerId/notifications", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId);
  if (isNaN(bakerId)) { res.status(400).json({ error: "Invalid bakerId" }); return; }

  const notifs = await db.select()
    .from(notificationsTable)
    .where(eq(notificationsTable.bakerId, bakerId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(notifs);
});

// POST /bakers/:bakerId/notifications/read-all
router.post("/bakers/:bakerId/notifications/read-all", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId);
  if (isNaN(bakerId)) { res.status(400).json({ error: "Invalid bakerId" }); return; }

  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.bakerId, bakerId));

  res.json({ success: true });
});

// PATCH /bakers/:bakerId/notifications/:notifId/read
router.patch("/bakers/:bakerId/notifications/:notifId/read", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId);
  const notifId = parseInt(req.params.notifId);
  if (isNaN(bakerId) || isNaN(notifId)) { res.status(400).json({ error: "Invalid params" }); return; }

  const [updated] = await db.update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.id, notifId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(updated);
});

export default router;
