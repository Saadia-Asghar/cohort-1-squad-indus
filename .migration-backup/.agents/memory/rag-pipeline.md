# RAG Pipeline — Embeddings & Retrieval

## Architecture

1. **Index** — `buildBakerKnowledgeDrafts()` reads `bakers` + `products` and creates text chunks.
2. **Embed** — `embedText()` calls OpenAI if `OPENAI_API_KEY` is set, else `localEmbed()`.
3. **Store** — vectors saved in `knowledge_chunks.embedding` (jsonb float array).
4. **Retrieve** — `retrieveKnowledge()` embeds the user query and ranks chunks by cosine similarity.
5. **Generate** — chat agent uses RAG context when keyword rules miss.

## Chunk sources

| sourceType | Content |
|------------|---------|
| `baker_profile` | Name, bio, city, delivery areas |
| `policy` | COD policy, return policy, WhatsApp |
| `product` | Name, description, sizes, eggless, lead time, tags |

## Embedding providers

| Provider | When | Dimensions |
|----------|------|------------|
| `openai` | `OPENAI_API_KEY` set | model default (1536 for text-embedding-3-small) |
| `local` | fallback | 384 |

Local embeddings use token + bigram hashing — no external API cost, good for Pakistan dev environments without OpenAI billing.

## API endpoints

- `POST /api/bakers/:bakerId/knowledge/reindex` — rebuild all chunks
- `POST /api/bakers/:bakerId/knowledge/query` — `{ "query": "..." }` returns `{ chunks, context }`

## Future upgrades

- pgvector column for faster similarity at scale
- Chunk FAQ entries from baker Agent Hub custom responses
- Sync embeddings on product webhook events
- Hybrid search: BM25 + vector rerank
