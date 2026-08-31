import { type ModelMessage } from "ai";
import { buildOpeningUserCue, buildTrainSystemPrompt } from "@/lib/prompts";
import { appendMessage, getSession, saveSession } from "@/lib/sessions";
import { chatStream, isMockMode } from "@/lib/xai";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      sessionId?: string;
      message?: string;
      bootstrap?: boolean;
    };

    if (!body.sessionId) {
      return Response.json({ error: "缺少 sessionId" }, { status: 400 });
    }

    const session = await getSession(body.sessionId);
    if (!session) {
      return Response.json({ error: "会话不存在" }, { status: 404 });
    }
    if (session.status === "evaluated") {
      return Response.json({ error: "会话已结束考核" }, { status: 400 });
    }

    const system = buildTrainSystemPrompt({
      scenarioId: session.scenarioId,
      persona: session.persona,
      refundReason: session.refundReason,
    });

    let working = session;

    if (body.bootstrap) {
      // AI parent speaks first
    } else {
      const text = (body.message ?? "").trim();
      if (!text) {
        return Response.json({ error: "消息不能为空" }, { status: 400 });
      }
      const updated = await appendMessage(session.id, {
        role: "user",
        content: text,
      });
      if (!updated) {
        return Response.json({ error: "写入消息失败" }, { status: 500 });
      }
      working = updated;
    }

    const history: ModelMessage[] = working.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (body.bootstrap && history.length === 0) {
      history.push({
        role: "user",
        content: buildOpeningUserCue({
          scenarioId: session.scenarioId,
          persona: session.persona,
          refundReason: session.refundReason,
        }),
      });
    }

    const result = await chatStream({ system, messages: history });

    const encoder = new TextEncoder();
    let full = "";

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            full += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          const latest = await getSession(session.id);
          if (latest) {
            latest.messages.push({
              id: randomUUID(),
              role: "assistant",
              content: full,
              createdAt: new Date().toISOString(),
            });
            // bootstrap used a synthetic user cue that should not appear in UI transcript
            if (body.bootstrap) {
              // no user message stored — good
            }
            await saveSession(latest);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Mock-AI": isMockMode() ? "1" : "0",
      },
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "对话失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
