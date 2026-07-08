export const EMBEDDING_DIM = 384;

/** Deterministic local embedding — no API key required (dev/demo). */
export function localEmbed(text: string, dims = EMBEDDING_DIM): number[] {
  const vec = new Array<number>(dims).fill(0);
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    let h = 0;
    for (let i = 0; i < token.length; i++) {
      h = ((h << 5) - h + token.charCodeAt(i)) | 0;
    }
    vec[Math.abs(h) % dims] += 1;
  }

  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]}_${tokens[i + 1]}`;
    let h = 0;
    for (let j = 0; j < bigram.length; j++) {
      h = ((h << 5) - h + bigram.charCodeAt(j)) | 0;
    }
    vec[Math.abs(h) % dims] += 0.5;
  }

  const norm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vec.map((value) => value / norm);
}

async function openaiEmbed(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: text.slice(0, 8000) }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as { data?: Array<{ embedding?: number[] }> };
  const embedding = payload.data?.[0]?.embedding;
  return embedding?.length ? embedding : null;
}

export async function embedText(text: string): Promise<{ vector: number[]; provider: "openai" | "local" }> {
  try {
    const openaiVector = await openaiEmbed(text);
    if (openaiVector) {
      return { vector: openaiVector, provider: "openai" };
    }
  } catch {
    // Fall back to local embeddings when OpenAI is unavailable.
  }
  return { vector: localEmbed(text), provider: "local" };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
