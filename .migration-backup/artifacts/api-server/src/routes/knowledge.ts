import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bakersTable } from "@workspace/db";
import { rebuildBakerKnowledgeIndex, runRagQuery } from "../lib/rag/pipeline";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// POST /bakers/:bakerId/knowledge/reindex — rebuild RAG embeddings from products + policies
router.post("/bakers/:bakerId/knowledge/reindex", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId, 10);
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

// POST /bakers/:bakerId/knowledge/query — debug RAG retrieval (agent uses this internally)
router.post("/bakers/:bakerId/knowledge/query", async (req, res): Promise<void> => {
  const bakerId = parseInt(req.params.bakerId, 10);
  const query = typeof req.body?.query === "string" ? req.body.query.trim() : "";

  if (Number.isNaN(bakerId) || !query) {
    res.status(400).json({ error: "bakerId and query are required" });
    return;
  }

  const result = await runRagQuery(bakerId, query);
  res.json(result);
});

export default router;
