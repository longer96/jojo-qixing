import { getApiBaseUrl, getApiKey, isMockMode } from "./xai";

const EMBED_TIMEOUT_MS = 30_000;
const EMBED_BATCH_SIZE = 32;

export function getEmbeddingModel() {
  return process.env.AI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
}

/**
 * 批量生成 Embedding。网关不支持 / 未配置密钥 / 调用失败时返回 null，
 * 检索层自动降级为关键词匹配，保证任何环境下可用。
 */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (isMockMode()) return null;
  const apiKey = getApiKey();
  if (!apiKey || texts.length === 0) return null;

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const vectors = await embedBatch(batch, apiKey);
    if (!vectors) return null;
    out.push(...vectors);
  }
  return out;
}

async function embedBatch(
  batch: string[],
  apiKey: string,
): Promise<number[][] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);
  try {
    const res = await fetch(`${getApiBaseUrl()}/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: getEmbeddingModel(), input: batch }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { embedding?: number[] }[] };
    const vectors = data.data?.map((d) => d.embedding ?? []);
    if (
      !vectors ||
      vectors.length !== batch.length ||
      vectors.some((v) => v.length === 0)
    ) {
      return null;
    }
    return vectors as number[][];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
