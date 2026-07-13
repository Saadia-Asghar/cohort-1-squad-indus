import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  GetCustomerParams,
  ListCustomersQueryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /customers
router.get("/customers", async (req, res): Promise<void> => {
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
router.get("/customers/:customerId", async (req, res): Promise<void> => {
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
  res.json(customer);
});

export default router;
