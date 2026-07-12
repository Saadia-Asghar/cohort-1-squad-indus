# AGENTS.md



## Project Context



Sweet Tooth is a Pakistan home-baker marketplace with a rule-based + RAG chat agent.



- **Production app:** `artifacts/sweet-tooth/` + `artifacts/api-server/` + `lib/`

- **Legacy Base44 dashboard:** `src/` (single-baker order UI)



Start with `replit.md` for the Replit monorepo and `README.md` for Base44 setup.



## Agent Memory & RAG



The chat agent uses two memory systems:



1. **Conversation memory** — buyer preferences (eggless, area, allergies) in `conversation_memory`

2. **Knowledge RAG** — embedded product/policy chunks in `knowledge_chunks`



Read `.agents/memory/agent-memory-rag.md` and `.agents/memory/rag-pipeline.md` before changing agent behavior.

**WhatsApp:** `artifacts/api-server/src/routes/whatsapp.ts` — Meta webhook at `/api/webhooks/whatsapp`. Shared agent logic in `src/lib/chat-agent.ts`.

**Cohort deliverables:** `docs/cohort/week-2-interview-script.md`, `docs/cohort/case-study-template.md`, `docs/DEPLOY.md`.



### RAG commands



```bash

pnpm --filter @workspace/db run push

pnpm --filter @workspace/api-server run seed

curl -X POST http://localhost:8080/api/bakers/1/knowledge/reindex

```



Optional: set `OPENAI_API_KEY` for OpenAI embeddings; otherwise local 384-dim embeddings are used.



## Key Files



| Area | Path |

|------|------|

| Chat agent + memory update | `artifacts/api-server/src/routes/chat.ts` |

| RAG embeddings | `artifacts/api-server/src/lib/rag/embeddings.ts` |

| RAG indexer / retriever | `artifacts/api-server/src/lib/rag/indexer.ts`, `retriever.ts` |

| Knowledge API | `artifacts/api-server/src/routes/knowledge.ts` |

| DB schemas | `lib/db/src/schema/conversation_memory.ts`, `knowledge_chunks.ts` |

| Agent Hub UI | `artifacts/sweet-tooth/src/pages/dashboard/agent-hub.tsx` |

| Agent dev memory | `.agents/memory/` |



## Base44 (legacy root app)



- `src/`: frontend application source.

- `src/api/base44Client.js`: frontend Base44 SDK client.

- `vite.config.js`: Vite config and Base44 Vite plugin setup.

- `.env.local`: local-only environment values; never commit secrets.



Use `base44 dev` for Base44-only work. Prefer the Replit monorepo for marketplace features.



## Working Notes



- Contract-first API: edit `lib/api-spec/openapi.yaml` then run Orval codegen for typed hooks.

- Chat agent is rule-based first; RAG fallback when rules miss.

- Reindex knowledge after product or policy changes.

- Run `pnpm --filter @workspace/api-server run typecheck` after API changes.

