import { NextResponse } from "next/server";
import { personaDisplayName } from "@/lib/personas";
import { getSession } from "@/lib/sessions";
import { SCENARIOS } from "@/lib/types";
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

    const scenario = SCENARIOS[session.scenarioId];
    const transcript = session.messages
      .slice(-6)
      .map((m) => `${m.role === "user" ? "班班" : "家长"}: ${m.content}`)
      .join("\n");

    const hint = await chatText({
      system:
        "你是运营教练。只给班班 1-2 句「思路提示」，不要直接写完整可复制话术，不要扮演家长。",
      prompt: `场景：${scenario.name}（${scenario.tips}）\n人设：${personaDisplayName(session.persona)}\n最近对话：\n${transcript || "（尚未开始）"}\n请给思路提示：`,
      temperature: 0.5,
    });

    return NextResponse.json({ hint });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "获取提示失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
