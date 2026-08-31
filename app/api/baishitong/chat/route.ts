import { type ModelMessage } from "ai";
import { BAISHITONG_SYSTEM } from "@/lib/prompts";
import { formatKnowledgeContext, retrieveKnowledge } from "@/lib/knowledge";
import { chatStream, isMockMode } from "@/lib/xai";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    };

    const message = (body.message ?? "").trim();
    if (!message) {
      return Response.json({ error: "消息不能为空" }, { status: 400 });
    }

    const docs = await retrieveKnowledge(message, 3);
    const context = formatKnowledgeContext(docs);
    const system = `${BAISHITONG_SYSTEM}\n\n【检索到的知识片段】\n${context}`;

    const history: ModelMessage[] = (body.history ?? [])
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));
    history.push({ role: "user", content: message });

    const result = await chatStream({ system, messages: history, temperature: 0.4 });

    const encoder = new TextEncoder();
    let full = "";
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            full += chunk;
            controller.enqueue(encoder.encode(chunk));
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
        "X-Knowledge-Ids": docs.map((d) => d.id).join(","),
      },
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "百事通回答失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
