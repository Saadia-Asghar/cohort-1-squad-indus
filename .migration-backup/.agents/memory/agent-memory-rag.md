# Agent Memory & RAG Pipeline

Sweet Tooth uses **two memory layers** for the chat agent:

## 1. Conversation memory (buyer-specific)

- **Table:** `conversation_memory` (`lib/db/src/schema/conversation_memory.ts`)
- **Stores:** eggless preference, delivery area, allergies, message count, short summary
- **Updated on:** every `POST /api/chat` message via regex extraction in `chat.ts`
- **Used for:** personalized greetings, eggless menu filtering, delivery hints

## 2. Knowledge RAG (baker catalog + policies)

- **Table:** `knowledge_chunks` (`lib/db/src/schema/knowledge_chunks.ts`)
- **Stores:** embedded text chunks from products, baker profile, COD/return policies
- **Indexed by:** `POST /api/bakers/:bakerId/knowledge/reindex`
- **Retrieved on:** every chat message when keyword rules do not match

### RAG pipeline files

| File | Role |
|------|------|
| `artifacts/api-server/src/lib/rag/embeddings.ts` | OpenAI embeddings (optional) + local fallback vectors |
| `artifacts/api-server/src/lib/rag/indexer.ts` | Builds chunks from DB products/policies |
| `artifacts/api-server/src/lib/rag/retriever.ts` | Cosine similarity search |
| `artifacts/api-server/src/lib/rag/pipeline.ts` | Orchestration exports |
| `artifacts/api-server/src/routes/knowledge.ts` | Reindex + debug query API |

### Environment variables

```bash
DATABASE_URL=postgres://...
OPENAI_API_KEY=sk-...          # optional — uses OpenAI embeddings when set
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Without `OPENAI_API_KEY`, the pipeline uses deterministic **local embeddings** (384-dim) — fine for dev/demo.

### Commands

```bash
pnpm --filter @workspace/db run push          # apply knowledge_chunks schema
pnpm --filter @workspace/api-server run seed  # seed + auto-reindex all bakers
curl -X POST http://localhost:8080/api/bakers/1/knowledge/reindex
curl -X POST http://localhost:8080/api/bakers/1/knowledge/query -H "Content-Type: application/json" -d "{\"query\":\"eggless chocolate cake F-7\"}"
```

### Reindex triggers (recommended)

- After product create/update/delete
- After baker policy or delivery area changes
- On seed and nightly cron (future)

## Agent flow

```
Buyer message
  → load conversation_memory (buyer prefs)
  → retrieveKnowledge() from knowledge_chunks (RAG)
  → rule-based replies (menu, COD, delivery, product names)
  → RAG fallback if no rule matched
  → update conversation_memory + save chat_messages
```

## Related agent docs

- [RAG pipeline details](rag-pipeline.md)
- [Orval collision fix](orval-collision.md)
- [Seed script location](seed-script.md)
