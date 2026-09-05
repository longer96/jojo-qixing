import { listQaRecords } from "@/lib/qaHistory";
import { getHighFreqTopics } from "@/lib/qaHistory";
import { listSessions, readFeedback } from "@/lib/sessions";
import { SCENARIOS } from "@/lib/types";
import { NextResponse } from "next/server";

/**
 * 组长/主管抽检视图（闭环第二、三层）：
 * 全量对练会话（含考核分）、反馈记录、问答与高频问题统计，只读。
 */
export async function GET() {
  const [sessions, feedback, qaRecords, hotTopics] = await Promise.all([
    listSessions(),
    readFeedback(),
    listQaRecords(),
    getHighFreqTopics(7),
  ]);

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      owner: s.owner ?? "anonymous",
      scenario: SCENARIOS[s.scenarioId]?.name ?? s.scenarioId,
      persona: s.persona,
      status: s.status,
      score: s.report?.overallScore ?? null,
      messageCount: s.messages.length,
      updatedAt: s.updatedAt,
    })),
    feedback: feedback.slice(0, 100),
    qaCount: qaRecords.length,
    recentQa: qaRecords.slice(0, 50).map((r) => ({
      id: r.id,
      owner: r.owner,
      question: r.question,
      createdAt: r.createdAt,
    })),
    hotTopics,
  });
}
