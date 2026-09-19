import { createKnowledgeDoc, updateKnowledgeDoc } from "@/lib/knowledge";
import { personaDisplayName } from "@/lib/personas";
import { listSessions } from "@/lib/sessions";
import { SCENARIOS } from "@/lib/types";
import { chatText, isMockMode } from "@/lib/xai";
import { NextResponse } from "next/server";

/**
 * 话术蒸馏（闭环第三层）：从高分对练记录中提炼可复用话术，
 * 生成「优秀案例」草稿文档（默认停用），由管理员在知识库中审核后启用。
 */

const HIGH_SCORE = 85;
const MIN_SAMPLES = 5;
const MAX_SAMPLES = 12;

const DISTILL_SYSTEM = `你是运营培训话术提炼专家。从高分对练记录中提炼可复用的实战话术。
只输出合法 JSON，不要 markdown 代码块，不要额外解释。格式：
{"items":[{"title":"话术名","scenario":"适用场景","text":"可直接照说的话术原文","why":"为什么有效（一句话）"}]}
提炼 3-6 条，优先选择在多局高分记录中反复出现的打法。`;

interface DistillItem {
  title: string;
  scenario: string;
  text: string;
  why: string;
}

function parseItems(raw: string): DistillItem[] {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    const data = JSON.parse(cleaned) as { items?: DistillItem[] };
    if (!Array.isArray(data.items)) return [];
    return data.items.filter((it) => it.title && it.text);
  } catch {
    return [];
  }
}

export async function POST() {
  try {
    if (isMockMode()) {
      return NextResponse.json(
        { error: "MOCK_AI 演示模式不支持蒸馏，请配置真实模型后使用" },
        { status: 400 },
      );
    }

    const sessions = await listSessions();
    const high = sessions
      .filter(
        (s) =>
          s.report &&
          s.report.overallScore >= HIGH_SCORE &&
          s.messages.length >= 6,
      )
      .slice(0, MAX_SAMPLES);

    if (high.length < MIN_SAMPLES) {
      return NextResponse.json(
        {
          error: `高分样本不足：需要 ≥${MIN_SAMPLES} 局 ${HIGH_SCORE} 分以上的对局（当前 ${high.length} 局），继续积累后再蒸馏`,
        },
        { status: 400 },
      );
    }

    const corpus = high
      .map((s, i) => {
        const transcript = s.messages
          .map((m) => `${m.role === "user" ? "班班" : "家长"}: ${m.content}`)
          .join("\n")
          .slice(0, 1500);
        return `【对局${i + 1}】${SCENARIOS[s.scenarioId].name} / ${personaDisplayName(s.persona)} / ${s.report!.overallScore}分\n${transcript}`;
      })
      .join("\n\n");

    const raw = await chatText({
      system: DISTILL_SYSTEM,
      prompt: `以下是 ${high.length} 局高分对练记录，请提炼可复用的高分话术：\n\n${corpus}`,
      temperature: 0.4,
    });

    const items = parseItems(raw);
    if (items.length === 0) {
      return NextResponse.json(
        { error: "提炼结果解析失败，请重试" },
        { status: 500 },
      );
    }

    const body = items
      .map(
        (it, i) =>
          `## ${i + 1}. ${it.title}\n- 适用场景：${it.scenario}\n- 话术：${it.text}\n- 为什么有效：${it.why}`,
      )
      .join("\n\n");

    // 默认停用：作为草稿进入优秀案例分类，管理员审核后手动启用
    const doc = await createKnowledgeDoc({
      title: `话术蒸馏 ${new Date().toISOString().slice(0, 10)}（${high.length} 局高分对局）`,
      category: "cases",
      source: "feedback",
      content: `# 话术蒸馏（${high.length} 局高分对局提炼）\n\n${body}`,
    });
    await updateKnowledgeDoc(doc.id, { enabled: false });

    return NextResponse.json({
      docId: doc.id,
      count: items.length,
      samples: high.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "话术蒸馏失败" }, { status: 500 });
  }
}
