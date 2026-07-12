import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, cartItemsTable } from "@workspace/db";
import {
  RemoveFromCartParams,
  AddToCartBody,
  GetCartQueryParams,
  ClearCartQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /cart
router.get("/cart", async (req, res): Promise<void> => {
  const query = GetCartQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const items = await db.select().from(cartItemsTable)
    .where(eq(cartItemsTable.buyerId, query.data.buyerId));
  res.json(items);
});

// POST /cart
router.post("/cart", async (req, res): Promise<void> => {
  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(cartItemsTable).values(parsed.data).returning();
  res.status(201).json(item);
});

// DELETE /cart/:cartItemId
router.delete("/cart/:cartItemId", async (req, res): Promise<void> => {
  const params = RemoveFromCartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(cartItemsTable).where(eq(cartItemsTable.id, params.data.cartItemId));
  res.sendStatus(204);
});

// DELETE /cart/clear
router.delete("/cart/clear", async (req, res): Promise<void> => {
  const query = ClearCartQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  await db.delete(cartItemsTable).where(eq(cartItemsTable.buyerId, query.data.buyerId));
  res.sendStatus(204);
});

export default router;
