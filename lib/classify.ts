import type { KnowledgeCategory } from "./types";

/**
 * 自动分类：根据文件名 + 内容关键词打分，把文档归入最合适的知识模块。
 * 文件名命中权重高于内容；无命中时默认归入「服务SOP」。
 */

const RULES: { category: KnowledgeCategory; re: RegExp; weight: number }[] = [
  { category: "tuifei", re: /退费|挽单|退课|退款|退班/, weight: 3 },
  { category: "xufei", re: /续费|续报|转化|RP|复购/, weight: 3 },
  { category: "zhaqun", re: /炸群|开班|控场|群公告|入群/, weight: 3 },
  { category: "xuechu", re: /学触|学情|出勤|请假|督学|作业反馈/, weight: 3 },
  {
    category: "product",
    re: /产品|课程介绍|课程体系|教材|课时|套餐|大纲|价格表|课表|教具/,
    weight: 2,
  },
  { category: "cases", re: /案例|优秀|标杆|复盘|示范|故事|话术集/, weight: 2 },
  {
    category: "sop",
    re: /SOP|流程|规范|手册|指引|禁忌|敏感|制度|守则/i,
    weight: 2,
  },
];

const CONTENT_SAMPLE = 3000;

export function classifyDocument(
  filename: string,
  content: string,
): { category: KnowledgeCategory; scores: Record<string, number> } {
  const name = filename.toLowerCase();
  const sample = content.slice(0, CONTENT_SAMPLE);
  const scores: Record<string, number> = {};

  for (const rule of RULES) {
    let score = 0;
    // 文件名命中：权重 ×3
    const nameHits = name.match(new RegExp(rule.re.source, "gi"))?.length ?? 0;
    score += nameHits * rule.weight * 3;
    // 内容命中（取前 3000 字，计出现次数，封顶 10 次）
    const contentHits = Math.min(
      sample.match(new RegExp(rule.re.source, "gi"))?.length ?? 0,
      10,
    );
    score += contentHits * rule.weight;
    if (score > 0) {
      scores[rule.category] = (scores[rule.category] ?? 0) + score;
    }
  }

  let best: KnowledgeCategory = "sop";
  let bestScore = 0;
  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = category as KnowledgeCategory;
    }
  }
  return { category: best, scores };
}
