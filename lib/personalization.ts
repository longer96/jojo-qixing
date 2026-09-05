import { getHighFreqTopics } from "./qaHistory";
import { listSessions } from "./sessions";
import { ANONYMOUS_USER } from "./user";

const WEAK_SCORE_THRESHOLD = 75;

/**
 * 个性化上下文：作答时融合
 * ① 本人历史薄弱项（来自该用户历次考核报告中偏低维度）
 * ② 全员高频问题统计（来自全量问答历史）
 * 与知识库检索结果一起注入系统提示词。
 */
export async function buildPersonalizationContext(
  owner: string,
): Promise<string> {
  const parts: string[] = [];

  if (owner !== ANONYMOUS_USER) {
    const sessions = await listSessions(owner);
    const weak = new Map<string, { count: number; total: number }>();
    for (const s of sessions) {
      if (!s.report) continue;
      for (const d of s.report.dimensions) {
        if (d.score < WEAK_SCORE_THRESHOLD) {
          const cur = weak.get(d.name) ?? { count: 0, total: 0 };
          cur.count += 1;
          cur.total += d.score;
          weak.set(d.name, cur);
        }
      }
    }
    const weakList = [...weak.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(
        ([name, v]) =>
          `${name}（${v.count} 次考核偏弱，均分 ${Math.round(v.total / v.count)}）`,
      );
    if (weakList.length > 0) {
      parts.push(
        `【该班班的历史薄弱项】\n${weakList.join("；")}。\n回答时结合其薄弱点给出针对性提醒或练习建议（语气自然，不要生硬复述数据）。`,
      );
    }
  }

  const hot = await getHighFreqTopics(3);
  if (hot.length > 0) {
    parts.push(
      `【团队近期高频问题】\n${hot.map((h) => `${h.label}（${h.count} 次）`).join("；")}。\n若当前问题与高频主题相关，可适当展开共性要点与易错提醒。`,
    );
  }

  return parts.join("\n\n");
}
