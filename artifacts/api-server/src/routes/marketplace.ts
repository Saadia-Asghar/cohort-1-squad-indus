import { Router } from "express";

const router = Router();

router.get("/marketplace/featured", async (_req, res): Promise<void> => {
  res.json([]);
});

router.get("/marketplace/search", async (_req, res): Promise<void> => {
  res.json({ bakers: [], products: [] });
});

router.get("/marketplace/categories", async (_req, res): Promise<void> => {
  res.json([]);
});

export default router;
