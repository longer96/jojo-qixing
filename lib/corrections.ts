import { randomUUID } from "crypto";
import path from "path";
import { DATA_DIR, readJson, withLock, writeJsonAtomic } from "./fileStore";
import { getKnowledgeDoc, updateKnowledgeDoc } from "./knowledge";
import type { CorrectionItem } from "./types";

const CORRECTIONS_FILE = path.join(DATA_DIR, "corrections.json");

/** 班班在百事通使用过程中提交知识修正，进入待审核状态 */
export async function addCorrection(input: {
  docId: string;
  owner: string;
  content: string;
  qaId?: string;
  question?: string;
}): Promise<CorrectionItem | { error: string }> {
  const doc = await getKnowledgeDoc(input.docId);
  if (!doc) return { error: "目标知识文档不存在" };
  if (!input.content.trim()) return { error: "修正内容不能为空" };
  return withLock(async () => {
    const list = await readJson<CorrectionItem[]>(CORRECTIONS_FILE, []);
    const row: CorrectionItem = {
      id: randomUUID(),
      docId: input.docId,
      docTitle: doc.title,
      owner: input.owner,
      qaId: input.qaId,
      question: input.question,
      content: input.content.trim().slice(0, 2000),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    list.unshift(row);
    await writeJsonAtomic(CORRECTIONS_FILE, list);
    return row;
  });
}

export async function listCorrections(
  status?: CorrectionItem["status"],
): Promise<CorrectionItem[]> {
  const list = await readJson<CorrectionItem[]>(CORRECTIONS_FILE, []);
  if (!status) return list;
  return list.filter((r) => r.status === status);
}

/**
 * 管理员审核修正：
 * - approve：将修正内容以「修正补充」块追加到目标文档并重新分块/向量化
 * - reject：仅标记
 */
export async function resolveCorrection(
  id: string,
  action: "approve" | "reject",
  editedContent?: string,
): Promise<CorrectionItem | { error: string } | null> {
  const resolved = await withLock(async () => {
    const list = await readJson<CorrectionItem[]>(CORRECTIONS_FILE, []);
    const item = list.find((r) => r.id === id);
    if (!item || item.status !== "pending") return null;
    if (editedContent?.trim()) {
      item.content = editedContent.trim().slice(0, 2000);
    }
    item.status = action === "approve" ? "approved" : "rejected";
    item.resolvedAt = new Date().toISOString();
    await writeJsonAtomic(CORRECTIONS_FILE, list);
    return item;
  });
  if (!resolved) return null;
  if (action !== "approve") return resolved;

  const doc = await getKnowledgeDoc(resolved.docId);
  if (!doc) return { error: "目标文档已被删除，无法写入修正" };
  const current = doc.chunks.map((c) => c.text).join("\n\n");
  await updateKnowledgeDoc(doc.id, {
    content: `${current}\n\n【修正补充】\n${resolved.content}`,
  });
  return resolved;
}
