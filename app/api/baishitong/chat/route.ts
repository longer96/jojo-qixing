import { type ModelMessage } from "ai";
import { formatKnowledgeContext, retrieveKnowledge } from "@/lib/knowledge";
import { buildPersonalizationContext } from "@/lib/personalization";
import { BAISHITONG_SYSTEM } from "@/lib/prompts";
import { addQaRecord } from "@/lib/qaHistory";
import { getRequestUser, isAnonymousUser } from "@/lib/user";
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

    const owner = getRequestUser(req);

    // 检索知识库 + 个性化上下文（本人薄弱项 / 全员高频问题）
    const [docs, personalization] = await Promise.all([
      retrieveKnowledge(message, 3),
      buildPersonalizationContext(owner),
    ]);
    const context = formatKnowledgeContext(docs);
    let system = `${BAISHITONG_SYSTEM}\n\n【检索到的知识片段】\n${
      context || "无（本次未命中知识库，请明确说明不确定，不要编造公司政策）"
    }`;
    if (personalization) {
      system += `\n\n${personalization}`;
    }

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
          // 落盘问答历史：驱动个性化、高频统计与推荐入池。
          // 未设置身份的用户不保留任何历史记录（反馈接口同样跳过匿名）。
          if (full.trim() && !isAnonymousUser(owner)) {
            const qa = await addQaRecord({
              owner,
              question: message,
              answer: full,
              knowledgeDocIds: docs.map((d) => d.docId),
            });
            controller.enqueue(
              encoder.encode(`\n\n<!--qa:${qa.id}-->`),
            );
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
        "X-Knowledge-Ids": docs.map((d) => d.docId).join(","),
      },
    });
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "百事通回答失败";
    return Response.json({ error: message }, { status: 500 });
  }
}
