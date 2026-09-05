import { randomUUID } from "crypto";
import path from "path";
import { DATA_DIR, readJson, withLock, writeJsonAtomic } from "./fileStore";
import type { QaRecord } from "./types";

const QA_FILE = path.join(DATA_DIR, "qa_history.json");
const MAX_RECORDS = 2000;

export async function addQaRecord(input: {
  owner: string;
  question: string;
  answer: string;
  knowledgeDocIds: string[];
}): Promise<QaRecord> {
  return withLock(async () => {
    const list = await readJson<QaRecord[]>(QA_FILE, []);
    const row: QaRecord = {
      id: randomUUID(),
      owner: input.owner,
      question: input.question,
      answer: input.answer,
      knowledgeDocIds: input.knowledgeDocIds,
      createdAt: new Date().toISOString(),
    };
    list.unshift(row);
    if (list.length > MAX_RECORDS) list.length = MAX_RECORDS;
    await writeJsonAtomic(QA_FILE, list);
    return row;
  });
}

export async function getQaRecord(id: string): Promise<QaRecord | null> {
  const list = await readJson<QaRecord[]>(QA_FILE, []);
  return list.find((r) => r.id === id) ?? null;
}

export async function listQaRecords(owner?: string): Promise<QaRecord[]> {
  const list = await readJson<QaRecord[]>(QA_FILE, []);
  if (owner === undefined) return list;
  return list.filter((r) => r.owner === owner);
}

const TOPIC_KEYWORDS: { label: string; re: RegExp }[] = [
  { label: "退费挽单", re: /退费|挽单/ },
  { label: "续费转化", re: /续费|转化|RP/i },
  { label: "炸群控场", re: /炸群|开班|控场/ },
  { label: "学触沟通", re: /学触|学情|出勤|请假/ },
  { label: "价格异议", re: /价格|太贵|便宜|优惠|多少钱/ },
  { label: "效果担忧", re: /效果|进步|成绩|学会/ },
  { label: "课程与物流查询", re: /快递|物流|课程在哪|怎么上课|教材/ },
];

/** 全员高频问题统计（近 500 条问答，按主题聚合） */
export async function getHighFreqTopics(
  limit = 3,
): Promise<{ label: string; count: number }[]> {
  const list = (await readJson<QaRecord[]>(QA_FILE, [])).slice(0, 500);
  const counts = new Map<string, number>();
  for (const r of list) {
    for (const topic of TOPIC_KEYWORDS) {
      if (topic.re.test(r.question)) {
        counts.set(topic.label, (counts.get(topic.label) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
