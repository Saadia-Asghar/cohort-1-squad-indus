import { reindexBakerKnowledge } from "./indexer.js";
import { formatRetrievedContext, retrieveKnowledge } from "./retriever.js";

export async function runRagQuery(bakerId: number, query: string) {
  const chunks = await retrieveKnowledge(bakerId, query);
  return {
    chunks,
    context: formatRetrievedContext(chunks),
  };
}

export async function rebuildBakerKnowledgeIndex(bakerId: number) {
  return reindexBakerKnowledge(bakerId);
}

export { reindexBakerKnowledge, retrieveKnowledge, formatRetrievedContext };
