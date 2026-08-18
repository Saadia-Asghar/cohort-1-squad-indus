import { Router } from "express";
import { z } from "zod";
import { requireBakerAuth, requireBakerOwner } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rate-limiter.js";
import { assertImagePayloadSize, uploadBakerImage } from "../lib/cloudinary-upload.js";

const router = Router();

router.post("/uploads/image", requireBakerAuth, requireBakerOwner, rateLimit(20, 15 * 60 * 1000), async (req, res): Promise<void> => {
  const parsed = z.object({
    file: z.string().min(8).max(6_000_000),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose an image file or paste a photo URL." });
    return;
  }
  try {
    assertImagePayloadSize(parsed.data.file);
    const url = await uploadBakerImage(parsed.data.file);
    res.json({ url });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not upload image." });
  }
});

export default router;
