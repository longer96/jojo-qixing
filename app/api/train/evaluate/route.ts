import { NextResponse } from "next/server";
import { buildEvaluatorPrompt, EVALUATOR_SYSTEM } from "@/lib/prompts";
import { getSession, saveReport } from "@/lib/sessions";
import type { EvaluationReport } from "@/lib/types";
import { chatText } from "@/lib/xai";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { sessionId?: string };
    if (!body.sessionId) {
      return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
    }

    const session = await getSession(body.sessionId);
    if (!session) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    if (session.messages.length < 2) {
      return NextResponse.json(
        { error: "对练轮次过少，请至少完成一轮对话后再考核" },
        { status: 400 },
      );
    }

    if (session.report) {
      return NextResponse.json({ session, report: session.report });
    }

    const transcript = session.messages
      .map((m) => `${m.role === "user" ? "班班" : "家长"}: ${m.content}`)
      .join("\n");

    const raw = await chatText({
      system: EVALUATOR_SYSTEM,
      prompt: buildEvaluatorPrompt(transcript),
      temperature: 0.3,
    });

    const report = parseReport(raw);
    const updated = await saveReport(session.id, report);
    return NextResponse.json({ session: updated, report });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "生成考核报告失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseReport(raw: string): EvaluationReport {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    const data = JSON.parse(cleaned) as EvaluationReport;
    return {
      overallScore: Number(data.overallScore) || 0,
      dimensions: Array.isArray(data.dimensions) ? data.dimensions : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
      rewrites: Array.isArray(data.rewrites) ? data.rewrites : [],
      summary: data.summary || "",
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return {
      overallScore: 70,
      dimensions: [
        { name: "沟通流畅度", score: 70, comment: "解析失败，使用兜底评分" },
        { name: "关键话术命中率", score: 70, comment: "解析失败，使用兜底评分" },
        { name: "异议处理有效性", score: 70, comment: "解析失败，使用兜底评分" },
        { name: "情绪稳定性", score: 70, comment: "解析失败，使用兜底评分" },
      ],
      suggestions: ["请补充更多对练轮次后重新生成报告。"],
      rewrites: [],
      summary: "报告解析异常，请重试。原始输出已记录在服务端日志。",
      generatedAt: new Date().toISOString(),
    };
  }
}
