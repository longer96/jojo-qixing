import { promises as fs } from "fs";
import path from "path";

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
}

const KNOWLEDGE_DIR = path.join(process.cwd(), "content/knowledge");

let cache: KnowledgeDoc[] | null = null;

export async function loadKnowledge(): Promise<KnowledgeDoc[]> {
  if (cache) return cache;
  const files = await fs.readdir(KNOWLEDGE_DIR);
  const docs: KnowledgeDoc[] = [];
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const content = await fs.readFile(path.join(KNOWLEDGE_DIR, file), "utf8");
    const title =
      content
        .split("\n")
        .find((l) => l.startsWith("# "))
        ?.replace(/^#\s+/, "")
        .trim() || file;
    docs.push({ id: file.replace(/\.md$/, ""), title, content });
  }
  cache = docs;
  return docs;
}

export async function retrieveKnowledge(query: string, topK = 3): Promise<KnowledgeDoc[]> {
  const docs = await loadKnowledge();
  const tokens = tokenize(query);
  if (tokens.length === 0) return docs.slice(0, topK);

  const scored = docs
    .map((doc) => {
      const hay = `${doc.title}\n${doc.content}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += t.length > 1 ? 2 : 1;
      }
      // light boosts for domain keywords
      if (/退费|挽单/.test(query) && doc.id === "tuifei") score += 5;
      if (/续费|转化|RP/.test(query) && doc.id === "xufei") score += 5;
      if (/炸群|开班/.test(query) && doc.id === "zhaqun") score += 5;
      if (/学触|学情|出勤/.test(query) && doc.id === "xuechu") score += 5;
      if (/敏感|承诺|禁忌/.test(query) && doc.id === "sensitive") score += 5;
      return { doc, score };
    })
    .sort((a, b) => b.score - a.score);

  const picked = scored.filter((s) => s.score > 0).slice(0, topK).map((s) => s.doc);
  return picked.length > 0 ? picked : docs.slice(0, topK);
}

export function formatKnowledgeContext(docs: KnowledgeDoc[]): string {
  return docs
    .map((d, i) => `### 知识${i + 1}：${d.title}\n${d.content}`)
    .join("\n\n");
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[\s,，。！？、；;:：\n]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1);
}
