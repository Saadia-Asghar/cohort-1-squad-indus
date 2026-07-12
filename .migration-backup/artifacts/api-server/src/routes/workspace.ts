import { Router, type IRouter } from "express";
import { eq, and, gte, desc } from "drizzle-orm";
import {
  db,
  bakerGoalsTable,
  bakerNotesTable,
  bakerRemindersTable,
  ordersTable,
} from "@workspace/db";

const router: IRouter = Router();

async function getMonthlyProgress(bakerId: number, metric: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const orders = await db.select().from(ordersTable).where(
    and(eq(ordersTable.bakerId, bakerId), gte(ordersTable.createdAt, monthStart)),
  );
  if (metric === "revenue") {
    return orders.reduce((sum, order) => sum + order.totalPkr, 0);
  }
  return orders.length;
}

// GET /bakers/:bakerId/workspace
router.get("/bakers/:bakerId/workspace", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId, 10);
  if (Number.isNaN(bakerId)) {
    res.status(400).json({ error: "Invalid bakerId" });
    return;
  }

  const [goals, notes, reminders] = await Promise.all([
    db.select().from(bakerGoalsTable).where(eq(bakerGoalsTable.bakerId, bakerId)).orderBy(desc(bakerGoalsTable.createdAt)),
    db.select().from(bakerNotesTable).where(eq(bakerNotesTable.bakerId, bakerId)).orderBy(desc(bakerNotesTable.pinned), desc(bakerNotesTable.updatedAt)),
    db.select().from(bakerRemindersTable).where(eq(bakerRemindersTable.bakerId, bakerId)).orderBy(bakerRemindersTable.dueAt),
  ]);

  const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
    const currentValue = await getMonthlyProgress(bakerId, goal.metric);
    const achieved = currentValue >= goal.targetValue;
    if (achieved && !goal.achievedAt) {
      await db.update(bakerGoalsTable).set({ achievedAt: new Date() }).where(eq(bakerGoalsTable.id, goal.id));
    }
    return {
      ...goal,
      currentValue,
      progressPercent: goal.targetValue > 0 ? Math.min(100, Math.round((currentValue / goal.targetValue) * 100)) : 0,
      achieved,
    };
  }));

  res.json({
    goals: goalsWithProgress,
    notes,
    reminders: reminders.map((r) => ({
      ...r,
      dueAt: r.dueAt.toISOString(),
    })),
  });
});

// POST /bakers/:bakerId/goals
router.post("/bakers/:bakerId/goals", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId, 10);
  const { label, targetValue, metric = "orders", period = "monthly" } = req.body as {
    label?: string;
    targetValue?: number;
    metric?: string;
    period?: string;
  };
  if (Number.isNaN(bakerId) || !label?.trim() || !targetValue || targetValue < 1) {
    res.status(400).json({ error: "label and targetValue are required" });
    return;
  }
  const [goal] = await db.insert(bakerGoalsTable).values({
    bakerId,
    label: label.trim(),
    targetValue,
    metric,
    period,
  }).returning();
  res.status(201).json(goal);
});

// POST /bakers/:bakerId/notes
router.post("/bakers/:bakerId/notes", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId, 10);
  const { content, pinned = false } = req.body as { content?: string; pinned?: boolean };
  if (Number.isNaN(bakerId) || !content?.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }
  const [note] = await db.insert(bakerNotesTable).values({
    bakerId,
    content: content.trim(),
    pinned,
  }).returning();
  res.status(201).json(note);
});

// POST /bakers/:bakerId/reminders
router.post("/bakers/:bakerId/reminders", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId, 10);
  const { title, dueAt } = req.body as { title?: string; dueAt?: string };
  if (Number.isNaN(bakerId) || !title?.trim() || !dueAt) {
    res.status(400).json({ error: "title and dueAt are required" });
    return;
  }
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) {
    res.status(400).json({ error: "Invalid dueAt" });
    return;
  }
  const [reminder] = await db.insert(bakerRemindersTable).values({
    bakerId,
    title: title.trim(),
    dueAt: due,
  }).returning();
  res.json({ ...reminder, dueAt: reminder.dueAt.toISOString() });
});

// PATCH /bakers/:bakerId/reminders/:reminderId
router.patch("/bakers/:bakerId/reminders/:reminderId", async (req, res): Promise<void> => {
  const reminderId = parseInt(req.params.reminderId, 10);
  const { done } = req.body as { done?: boolean };
  if (Number.isNaN(reminderId) || typeof done !== "boolean") {
    res.status(400).json({ error: "done boolean required" });
    return;
  }
  const [reminder] = await db.update(bakerRemindersTable)
    .set({ done })
    .where(eq(bakerRemindersTable.id, reminderId))
    .returning();
  if (!reminder) {
    res.status(404).json({ error: "Reminder not found" });
    return;
  }
  res.json({ ...reminder, dueAt: reminder.dueAt.toISOString() });
});

export default router;
