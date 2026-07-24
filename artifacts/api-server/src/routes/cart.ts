import { Router } from "express";

const router = Router();

// Legacy server cart removed. Guest web checkout is POST /orders with server-side pricing.
router.all("/cart", (_req, res): void => {
  res.status(410).json({
    error: "Server cart removed. Place orders via guest checkout (POST /orders) or the bakery’s WhatsApp/Instagram channel.",
  });
});

router.all("/cart/:cartItemId", (_req, res): void => {
  res.status(410).json({
    error: "Server cart removed. Place orders via guest checkout (POST /orders) or the bakery’s WhatsApp/Instagram channel.",
  });
});

router.all("/cart/clear", (_req, res): void => {
  res.status(410).json({
    error: "Server cart removed. Place orders via guest checkout (POST /orders) or the bakery’s WhatsApp/Instagram channel.",
  });
});

export default router;
