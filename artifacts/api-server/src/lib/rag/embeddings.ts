export const EMBEDDING_DIM = 384;

/** Deterministic local embedding with no network or API-key dependency. */
export function localEmbed(text: string, dims = EMBEDDING_DIM): number[] {
  const vec = new Array<number>(dims).fill(0);
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    let hash = 0;
    for (let index = 0; index < token.length; index++) {
      hash = ((hash << 5) - hash + token.charCodeAt(index)) | 0;
    }
    vec[Math.abs(hash) % dims] += 1;
  }

  for (let index = 0; index < tokens.length - 1; index++) {
    const bigram = `${tokens[index]}_${tokens[index + 1]}`;
    let hash = 0;
    for (let charIndex = 0; charIndex < bigram.length; charIndex++) {
      hash = ((hash << 5) - hash + bigram.charCodeAt(charIndex)) | 0;
    }
    vec[Math.abs(hash) % dims] += 0.5;
  }

  const norm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vec.map((value) => value / norm);
}

/** Product updates and agent retrieval stay available without OpenAI. */
export async function embedText(text: string): Promise<{ vector: number[]; provider: "local" }> {
  return { vector: localEmbed(text), provider: "local" };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  // Vector spaces from different providers are incompatible. Fail closed so a
  // stale index cannot surface unrelated bakery facts.
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index]! * b[index]!;
    normA += a[index]! * a[index]!;
    normB += b[index]! * b[index]!;
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}
