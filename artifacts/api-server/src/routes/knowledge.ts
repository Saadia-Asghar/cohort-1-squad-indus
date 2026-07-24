import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, bakersTable } from "@workspace/db";
import { rebuildBakerKnowledgeIndex, runRagQuery } from "../lib/rag/pipeline.js";
import { logger } from "../lib/logger.js";
import { requireBakerAuth, requireBakerOwnership } from "../middlewares/auth.js";

const router = Router();

// POST /bakers/:bakerId/knowledge/reindex — rebuild RAG embeddings from products + policies
router.post("/bakers/:bakerId/knowledge/reindex", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const bakerId = parseInt(String(req.params.bakerId), 10);
  if (Number.isNaN(bakerId)) {
    res.status(400).json({ error: "Invalid bakerId" });
    return;
  }

  const [baker] = await db.select().from(bakersTable).where(eq(bakersTable.id, bakerId));
  if (!baker) {
    res.status(404).json({ error: "Baker not found" });
    return;
  }

  try {
    const result = await rebuildBakerKnowledgeIndex(bakerId);
    res.json({
      bakerId,
      chunksIndexed: result.chunks,
      embeddingProvider: result.provider,
      message: "Knowledge index rebuilt successfully.",
    });
  } catch (err) {
    logger.error({ err, bakerId }, "Failed to reindex baker knowledge");
    res.status(500).json({ error: "Failed to reindex knowledge" });
  }
});

// POST /bakers/:bakerId/knowledge/query — debug RAG retrieval (agent also retrieves via retrieveKnowledge)
router.post("/bakers/:bakerId/knowledge/query", requireBakerAuth, requireBakerOwnership, async (req, res): Promise<void> => {
  const bakerId = parseInt(String(req.params.bakerId), 10);
  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";

  if (Number.isNaN(bakerId) || !query) {
    res.status(400).json({ error: "bakerId and query are required" });
    return;
  }

  const result = await runRagQuery(bakerId, query);
  res.json(result);
});

export default router;
