import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { cosineSimilarity, embedTexts } from "./embeddings";
import { DATA_DIR, readJson, withLock, writeJsonAtomic } from "./fileStore";
import type {
  KnowledgeCategory,
  KnowledgeDoc,
  RetrievedChunk,
} from "./types";

const KNOWLEDGE_FILE = path.join(DATA_DIR, "knowledge.json");
const SEED_DIR = path.join(process.cwd(), "content/knowledge");

const SEED_CATEGORY_MAP: Record<string, KnowledgeCategory> = {
  zhaqun: "zhaqun",
  xuechu: "xuechu",
  xufei: "xufei",
  tuifei: "tuifei",
  sensitive: "sop",
};

const CHUNK_TARGET = 500;

// ---------- 分块 ----------

/** 按段落聚合为约 500 字的知识块，保留结构完整性 */
export function chunkText(content: string): string[] {
  const paragraphs = content
    .split(/\n{2,}|(?<=。)\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && (current + "\n" + p).length > CHUNK_TARGET) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? current + "\n" + p : p;
    }
  }
  if (current) chunks.push(current);
  // 超长单段强制切分
  return chunks.flatMap((c) => {
    if (c.length <= CHUNK_TARGET * 1.5) return [c];
    const parts: string[] = [];
    for (let i = 0; i < c.length; i += CHUNK_TARGET) {
      parts.push(c.slice(i, i + CHUNK_TARGET));
    }
    return parts;
  });
}

// ---------- 存储 ----------

async function readDocs(): Promise<KnowledgeDoc[]> {
  return readJson<KnowledgeDoc[]>(KNOWLEDGE_FILE, []);
}

async function writeDocs(docs: KnowledgeDoc[]) {
  await writeJsonAtomic(KNOWLEDGE_FILE, docs);
}

async function embedChunks(
  chunks: { id: string; text: string; vector?: number[] }[],
): Promise<void> {
  const missing = chunks.filter((c) => !c.vector);
  if (missing.length === 0) return;
  const vectors = await embedTexts(missing.map((c) => c.text));
  if (!vectors) return;
  missing.forEach((c, i) => {
    c.vector = vectors[i];
  });
}

let seeded = false;

/** 首次访问时把 content/knowledge 下的种子 markdown 迁移入库 */
async function ensureSeeded() {
  if (seeded) return;
  await withLock(async () => {
    if (seeded) return;
    const existing = await readJson<KnowledgeDoc[] | null>(KNOWLEDGE_FILE, null);
    if (existing) {
      seeded = true;
      return;
    }
    let files: string[] = [];
    try {
      files = await fs.readdir(SEED_DIR);
    } catch {
      files = [];
    }
    const now = new Date().toISOString();
    const docs: KnowledgeDoc[] = [];
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const content = await fs.readFile(path.join(SEED_DIR, file), "utf8");
      const base = file.replace(/\.md$/, "");
      const title =
        content
          .split("\n")
          .find((l) => l.startsWith("# "))
          ?.replace(/^#\s+/, "")
          .trim() || base;
      docs.push({
        id: randomUUID(),
        title,
        category: SEED_CATEGORY_MAP[base] ?? "sop",
        enabled: true,
        source: "seed",
        chunks: chunkText(content).map((text) => ({
          id: randomUUID(),
          text,
        })),
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const doc of docs) {
      await embedChunks(doc.chunks);
    }
    await writeDocs(docs);
    seeded = true;
  });
}

// ---------- CRUD ----------

export async function listKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  await ensureSeeded();
  const docs = await readDocs();
  return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getKnowledgeDoc(id: string): Promise<KnowledgeDoc | null> {
  await ensureSeeded();
  const docs = await readDocs();
  return docs.find((d) => d.id === id) ?? null;
}

export async function createKnowledgeDoc(input: {
  title: string;
  category: KnowledgeCategory;
  source: KnowledgeDoc["source"];
  content: string;
}): Promise<KnowledgeDoc> {
  await ensureSeeded();
  return withLock(async () => {
    const docs = await readDocs();
    const now = new Date().toISOString();
    const doc: KnowledgeDoc = {
      id: randomUUID(),
      title: input.title.trim().slice(0, 80) || "未命名文档",
      category: input.category,
      enabled: true,
      source: input.source,
      chunks: chunkText(input.content).map((text) => ({
        id: randomUUID(),
        text,
      })),
      createdAt: now,
      updatedAt: now,
    };
    await embedChunks(doc.chunks);
    docs.push(doc);
    await writeDocs(docs);
    return doc;
  });
}

/**
 * 批量导入去重：同名（忽略大小写）的非种子文档已存在时，覆盖内容与分类，
 * 避免重复拖入同一文件产生多份知识；不存在时按新建处理。
 */
export async function upsertKnowledgeDocByTitle(input: {
  title: string;
  category: KnowledgeCategory;
  source: KnowledgeDoc["source"];
  content: string;
}): Promise<{ doc: KnowledgeDoc; created: boolean }> {
  await ensureSeeded();
  return withLock(async () => {
    const docs = await readDocs();
    const title = input.title.trim().slice(0, 80) || "未命名文档";
    const existing = docs.find(
      (d) => d.source !== "seed" && d.title.toLowerCase() === title.toLowerCase(),
    );
    const now = new Date().toISOString();
    if (existing) {
      existing.category = input.category;
      existing.enabled = true;
      existing.chunks = chunkText(input.content).map((text) => ({
        id: randomUUID(),
        text,
      }));
      existing.updatedAt = now;
      await embedChunks(existing.chunks);
      await writeDocs(docs);
      return { doc: existing, created: false };
    }
    const doc: KnowledgeDoc = {
      id: randomUUID(),
      title,
      category: input.category,
      enabled: true,
      source: input.source,
      chunks: chunkText(input.content).map((text) => ({
        id: randomUUID(),
        text,
      })),
      createdAt: now,
      updatedAt: now,
    };
    await embedChunks(doc.chunks);
    docs.push(doc);
    await writeDocs(docs);
    return { doc, created: true };
  });
}

export async function updateKnowledgeDoc(
  id: string,
  patch: {
    title?: string;
    category?: KnowledgeCategory;
    enabled?: boolean;
    content?: string;
  },
): Promise<KnowledgeDoc | null> {
  await ensureSeeded();
  return withLock(async () => {
    const docs = await readDocs();
    const doc = docs.find((d) => d.id === id);
    if (!doc) return null;
    if (patch.title !== undefined) doc.title = patch.title.trim().slice(0, 80) || doc.title;
    if (patch.category !== undefined) doc.category = patch.category;
    if (patch.enabled !== undefined) doc.enabled = patch.enabled;
    if (patch.content !== undefined) {
      doc.chunks = chunkText(patch.content).map((text) => ({
        id: randomUUID(),
        text,
      }));
      await embedChunks(doc.chunks);
    }
    doc.updatedAt = new Date().toISOString();
    await writeDocs(docs);
    return doc;
  });
}

export async function deleteKnowledgeDoc(id: string): Promise<boolean> {
  await ensureSeeded();
  return withLock(async () => {
    const docs = await readDocs();
    const next = docs.filter((d) => d.id !== id);
    if (next.length === docs.length) return false;
    await writeDocs(next);
    return true;
  });
}

/** 为缺失向量的分块重建 Embedding，返回成功重建的数量 */
export async function reindexKnowledgeEmbeddings(): Promise<{
  total: number;
  embedded: number;
}> {
  await ensureSeeded();
  return withLock(async () => {
    const docs = await readDocs();
    let missing = 0;
    for (const doc of docs) {
      missing += doc.chunks.filter((c) => !c.vector).length;
    }
    for (const doc of docs) {
      await embedChunks(doc.chunks);
    }
    await writeDocs(docs);
    let stillMissing = 0;
    for (const doc of docs) {
      stillMissing += doc.chunks.filter((c) => !c.vector).length;
    }
    return { total: missing, embedded: missing - stillMissing };
  });
}

// ---------- 检索（向量 + 关键词混合） ----------

/**
 * 中英文混合分词：
 * - 英文/数字按连续段取词（如 c2、ppt、2024）
 * - 中文连续段切为二元组（如「退费」「升级」），短段整体保留
 * 解决中文问句无空格导致整句成为单一 token、无法命中的问题。
 */
function tokenize(q: string): string[] {
  const tokens = new Set<string>();
  const lower = q.toLowerCase();
  for (const m of lower.matchAll(/[a-z0-9]+/g)) {
    tokens.add(m[0]);
  }
  for (const seg of lower.matchAll(/[一-鿿]+/g)) {
    const s = seg[0];
    if (s.length <= 4) tokens.add(s);
    for (let i = 0; i + 2 <= s.length; i++) {
      tokens.add(s.slice(i, i + 2));
    }
  }
  return [...tokens];
}

const CATEGORY_BOOST: { re: RegExp; category: KnowledgeCategory }[] = [
  { re: /退费|挽单/, category: "tuifei" },
  { re: /续费|转化|RP/i, category: "xufei" },
  { re: /炸群|开班|控场/, category: "zhaqun" },
  { re: /学触|学情|出勤/, category: "xuechu" },
  { re: /敏感|承诺|禁忌|SOP/i, category: "sop" },
  { re: /产品|课程|教材|课时|套餐|大纲/, category: "product" },
  { re: /案例|优秀|示范|标杆|复盘/, category: "cases" },
];

function keywordScore(
  tokens: string[],
  query: string,
  doc: KnowledgeDoc,
  chunkText_: string,
): number {
  const hay = `${doc.title}\n${chunkText_}`.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (hay.includes(t)) score += t.length > 1 ? 2 : 1;
  }
  for (const boost of CATEGORY_BOOST) {
    if (boost.re.test(query) && doc.category === boost.category) score += 5;
  }
  return score;
}

// 向量归一化后随机命中约在 0.5 附近，低于该阈值视为语义不相关
const VECTOR_MIN_SCORE = 0.58;
// topK 内同一文档最多出现次数，避免单一长文档挤占引用来源
const MAX_CHUNKS_PER_DOC = 2;

export async function retrieveKnowledge(
  query: string,
  topK = 3,
): Promise<RetrievedChunk[]> {
  await ensureSeeded();
  const docs = (await readDocs()).filter((d) => d.enabled);
  const entries = docs.flatMap((doc) =>
    doc.chunks.map((chunk) => ({ doc, chunk })),
  );
  if (entries.length === 0) return [];

  const queryVec = (await embedTexts([query]))?.[0] ?? null;
  const tokens = tokenize(query);

  const scored = entries
    .map(({ doc, chunk }) => {
      const kw = keywordScore(tokens, query, doc, chunk.text);
      let score: number;
      if (queryVec) {
        const cos = chunk.vector
          ? (cosineSimilarity(queryVec, chunk.vector) + 1) / 2
          : 0;
        score = 0.7 * cos + 0.3 * Math.min(kw / 10, 1);
      } else {
        score = kw;
      }
      return {
        docId: doc.id,
        docTitle: doc.title,
        category: doc.category,
        text: chunk.text,
        score,
        kw,
      };
    })
    .sort((a, b) => b.score - a.score);

  // 候选池：限制同一文档块数，保证引用来源多样
  const candidates: typeof scored = [];
  const perDoc = new Map<string, number>();
  for (const item of scored) {
    const used = perDoc.get(item.docId) ?? 0;
    if (used >= MAX_CHUNKS_PER_DOC) continue;
    perDoc.set(item.docId, used + 1);
    candidates.push(item);
    if (candidates.length >= topK * 3) break;
  }

  // 无向量服务：纯关键词检索，零命中即不注入上下文
  if (!queryVec) {
    return candidates.filter((s) => s.score > 0).slice(0, topK);
  }

  // 有向量服务：先按语义阈值过滤，避免把不相关内容塞进提示词
  const semantic = candidates
    .filter((s) => s.score >= VECTOR_MIN_SCORE)
    .slice(0, topK);
  if (semantic.length > 0) return semantic;

  // 语义不达阈值时退回关键词；仍无命中则返回空，由上层明确「知识不足」
  return candidates.filter((s) => s.kw > 0).slice(0, topK);
}

export function formatKnowledgeContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => `### 片段${i + 1}（来源：《${c.docTitle}》）\n${c.text}`)
    .join("\n\n");
}

/** 公开目录：前端展示引用来源用（不含内容与向量） */
export async function getKnowledgeCatalog(): Promise<
  { id: string; title: string; category: KnowledgeCategory }[]
> {
  await ensureSeeded();
  const docs = await readDocs();
  return docs
    .filter((d) => d.enabled)
    .map((d) => ({ id: d.id, title: d.title, category: d.category }));
}
