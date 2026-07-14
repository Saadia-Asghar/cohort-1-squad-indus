import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  GetCustomerParams,
  ListCustomersQueryParams,
} from "@workspace/api-zod";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";

const router = Router();

// GET /customers
router.get("/customers", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const query = ListCustomersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const customers = await db.select().from(customersTable)
    .where(eq(customersTable.bakerId, query.data.bakerId));
  res.json(customers);
});

// GET /customers/:customerId
router.get("/customers/:customerId", requireBakerAuth, async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.customerId));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  if ((req as { bakerId?: number }).bakerId !== customer.bakerId) {
    res.status(403).json({ error: "You can only access your own customers." });
    return;
  }
  res.json(customer);
});

export default router;
