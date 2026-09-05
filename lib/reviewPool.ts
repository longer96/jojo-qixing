import { randomUUID } from "crypto";
import path from "path";
import { DATA_DIR, readJson, withLock, writeJsonAtomic } from "./fileStore";
import { createKnowledgeDoc } from "./knowledge";
import { getQaRecord } from "./qaHistory";
import type { KnowledgeCategory, ReviewItem } from "./types";

const REVIEW_FILE = path.join(DATA_DIR, "review_pool.json");

/**
 * 准确性闭环第一层：百事通回答被「推荐」后进入待审核池。
 * 同一问答只入池一次。
 */
export async function addToReviewPool(input: {
  qaId: string;
  owner: string;
}): Promise<ReviewItem | null> {
  const qa = await getQaRecord(input.qaId);
  if (!qa) return null;
  return withLock(async () => {
    const list = await readJson<ReviewItem[]>(REVIEW_FILE, []);
    if (list.some((r) => r.qaId === input.qaId)) {
      return list.find((r) => r.qaId === input.qaId) ?? null;
    }
    const row: ReviewItem = {
      id: randomUUID(),
      qaId: input.qaId,
      question: qa.question,
      answer: qa.answer,
      owner: input.owner,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    list.unshift(row);
    await writeJsonAtomic(REVIEW_FILE, list);
    return row;
  });
}

export async function listReviewItems(
  status?: ReviewItem["status"],
): Promise<ReviewItem[]> {
  const list = await readJson<ReviewItem[]>(REVIEW_FILE, []);
  if (!status) return list;
  return list.filter((r) => r.status === status);
}

/**
 * 管理员处理待审核项：
 * - approve：按所选分类沉淀进知识库（source=feedback）
 * - reject：仅标记，不入库
 */
export async function resolveReviewItem(
  id: string,
  action: "approve" | "reject",
  category?: KnowledgeCategory,
): Promise<ReviewItem | null> {
  return withLock(async () => {
    const list = await readJson<ReviewItem[]>(REVIEW_FILE, []);
    const item = list.find((r) => r.id === id);
    if (!item || item.status !== "pending") return null;
    item.status = action === "approve" ? "approved" : "rejected";
    item.category = category;
    item.resolvedAt = new Date().toISOString();
    await writeJsonAtomic(REVIEW_FILE, list);
    return item;
  }).then(async (item) => {
    if (item && action === "approve") {
      await createKnowledgeDoc({
        title: `问答沉淀：${item.question.slice(0, 40)}`,
        category: category ?? "sop",
        source: "feedback",
        content: `Q：${item.question}\n\nA：${item.answer}`,
      });
    }
    return item;
  });
}
