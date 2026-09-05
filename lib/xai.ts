import type { ModelMessage } from "ai";

/**
 * AI 配置一律来自环境变量，禁止把密钥写进代码仓库。
 * 本地：复制 `.env.example` 为 `.env.local` 后填写 AI_API_KEY
 */
export function getApiBaseUrl() {
  return (
    process.env.AI_API_BASE_URL?.trim() ||
    process.env.OPENAI_BASE_URL?.trim() ||
    "https://token.xjjj.co/v1"
  ).replace(/\/$/, "");
}

export function getApiKey() {
  return (
    process.env.AI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    ""
  );
}

export function getDefaultModel() {
  return (
    process.env.AI_MODEL?.trim() ||
    "Qwen3.8-27B-dflash2"
  );
}

/** @deprecated 使用 getDefaultModel()；保留兼容页面展示 */
export const DEFAULT_MODEL = process.env.AI_MODEL?.trim() || "Qwen3.8-27B-dflash2";

export const FALLBACK_MODELS = ["qwen3.8-flash", "Qwen3.8-27B"] as const;

/**
 * 回退模型链：可用 AI_FALLBACK_MODELS（逗号分隔）覆盖。
 * 未显式指定 AI_MODEL 时，沿用默认网关的 Qwen 回退链；
 * 显式配置了其他模型/网关时默认不回退，避免向网关上不存在的模型发请求。
 */
export function getFallbackModels(): string[] {
  const fromEnv = process.env.AI_FALLBACK_MODELS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return process.env.AI_MODEL?.trim() ? [] : [...FALLBACK_MODELS];
}

const REQUEST_TIMEOUT_MS = 60_000;

export function isMockMode() {
  return process.env.MOCK_AI === "1" || process.env.MOCK_AI === "true";
}

export function hasApiKey() {
  return Boolean(getApiKey());
}

export type AiConfigStatus =
  | { kind: "ready"; model: string; baseUrl: string }
  | { kind: "mock"; model: string }
  | { kind: "missing_key" };

export function getAiConfigStatus(): AiConfigStatus {
  if (isMockMode()) {
    return { kind: "mock", model: "mock" };
  }
  if (!hasApiKey()) {
    return { kind: "missing_key" };
  }
  return {
    kind: "ready",
    model: getDefaultModel(),
    baseUrl: getApiBaseUrl(),
  };
}

export function assertAiReady() {
  if (isMockMode()) return;
  if (!hasApiKey()) {
    throw new Error(
      "未配置 AI_API_KEY。请复制 .env.example 为 .env.local，填写密钥后重启服务。",
    );
  }
}

type ChatMessageParam = {
  role: "system" | "user" | "assistant";
  content: string;
};

function toApiMessages(
  system: string,
  messages: ModelMessage[],
): ChatMessageParam[] {
  const out: ChatMessageParam[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const content =
      typeof m.content === "string"
        ? m.content
        : Array.isArray(m.content)
          ? m.content
              .map((part) =>
                typeof part === "object" &&
                part &&
                "type" in part &&
                part.type === "text" &&
                "text" in part
                  ? String(part.text)
                  : "",
              )
              .join("")
          : String(m.content ?? "");
    if (!content) continue;
    out.push({ role: m.role, content });
  }
  return out;
}

async function callChatCompletions(params: {
  model: string;
  messages: ChatMessageParam[];
  temperature: number;
  stream: boolean;
}): Promise<Response> {
  const apiKey = getApiKey();
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        stream: params.stream,
        enable_thinking: false,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof json.error === "string") return json.error;
    if (json.error && typeof json.error === "object" && json.error.message) {
      return json.error.message;
    }
    if (json.message) return json.message;
  } catch {
    // ignore
  }
  return text.slice(0, 300) || `上游接口错误 HTTP ${res.status}`;
}

function extractContent(data: unknown): string {
  const choice = (
    data as {
      choices?: Array<{
        message?: { content?: string | null };
        delta?: { content?: string | null };
      }>;
    }
  )?.choices?.[0];
  const content = choice?.message?.content ?? choice?.delta?.content ?? "";
  return (content || "").trim();
}

async function completeOnce(params: {
  model: string;
  messages: ChatMessageParam[];
  temperature: number;
}): Promise<string> {
  let res: Response;
  try {
    res = await callChatCompletions({ ...params, stream: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort") || msg.includes("Abort")) {
      throw new Error(`调用 ${params.model} 超时（${REQUEST_TIMEOUT_MS / 1000}s）`);
    }
    throw new Error(`调用 ${params.model} 失败：${msg}`);
  }

  if (!res.ok) {
    throw new Error(`调用 ${params.model} 失败：${await readError(res)}`);
  }

  const data = (await res.json()) as unknown;
  const text = extractContent(data);
  if (!text) {
    throw new Error(`调用 ${params.model} 成功但内容为空`);
  }
  return text;
}

async function completeWithFallback(params: {
  messages: ChatMessageParam[];
  temperature: number;
}): Promise<{ text: string; model: string }> {
  const models = [getDefaultModel(), ...getFallbackModels()];
  const errors: string[] = [];
  for (const model of models) {
    try {
      const text = await completeOnce({
        model,
        messages: params.messages,
        temperature: params.temperature,
      });
      return { text, model };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error(errors.join(" | "));
}

function textToStreamResult(text: string, model: string) {
  return {
    model,
    textStream: (async function* () {
      const chunkSize = 8;
      for (let i = 0; i < text.length; i += chunkSize) {
        yield text.slice(i, i + chunkSize);
        await new Promise((r) => setTimeout(r, 6));
      }
    })(),
  };
}

export async function chatStream(params: {
  system: string;
  messages: ModelMessage[];
  temperature?: number;
}) {
  if (isMockMode()) {
    return mockStream(params.system, params.messages);
  }
  assertAiReady();

  const messages = toApiMessages(params.system, params.messages);
  const { text, model } = await completeWithFallback({
    messages,
    temperature: params.temperature ?? 0.7,
  });
  return textToStreamResult(text, model);
}

export async function chatText(params: {
  system: string;
  prompt: string;
  temperature?: number;
}) {
  if (isMockMode()) {
    return mockEvaluateOrText(params.system, params.prompt);
  }
  assertAiReady();

  const { text } = await completeWithFallback({
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.prompt },
    ],
    temperature: params.temperature ?? 0.4,
  });
  return text;
}

function mockParentReply(lastUser: string): string {
  const snippets = [
    `嗯……你这么说我还是有点担心。我家孩子上周作业也不太认真，你们到底怎么保证效果？`,
    `说得轻巧。别的机构也这么讲，我更想听到具体安排，而不是空话。`,
    `……（沉默几秒）那你们班里大概什么水平？我家孩子跟得上吗？`,
    `好吧我听你解释一下。不过价格这块真的不便宜，你再帮我想想有没有更合适的方案？`,
  ];
  const idx = Math.abs(hash(lastUser)) % snippets.length;
  return snippets[idx];
}

function mockBaishitongReply(question: string): string {
  return `【演示模式】关于「${question.slice(0, 40)}」：建议先共情家长情绪，再澄清具体原因（效果/时间/价格/服务），最后给出可执行的下一步与跟进时间。\n\n参考依据：内置 SOP《退费挽单四因应对》《续费价值传递结构》。\n\n（当前为 MOCK_AI，回复为本地演示内容。）`;
}

async function mockStream(system: string, messages: ModelMessage[]) {
  const lastUser =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const text =
    typeof lastUser === "string"
      ? system.includes("百事通")
        ? mockBaishitongReply(lastUser)
        : mockParentReply(lastUser)
      : mockParentReply("你好");
  return textToStreamResult(text, "mock");
}

function mockEvaluateOrText(system: string, prompt: string): string {
  if (system.includes("考核官") || prompt.includes("考核") || prompt.includes("dimensions")) {
    return JSON.stringify({
      overallScore: 78,
      dimensions: [
        {
          name: "沟通流畅度",
          score: 80,
          comment: "表达基本顺畅，偶有停顿与重复。",
        },
        {
          name: "关键话术命中率",
          score: 75,
          comment: "提到了共情与方案，但对成果证据引用不足。",
        },
        {
          name: "异议处理有效性",
          score: 78,
          comment: "能回应表层异议，深层顾虑挖掘还可以更深。",
        },
        {
          name: "情绪稳定性",
          score: 82,
          comment: "整体冷静，未与家长情绪对抗。",
        },
      ],
      suggestions: [
        "先复述家长担心，再给一个具体学习证据。",
        "把「我们会跟进」改成「今晚 8 点前发学习记录给你」。",
        "异议出现时用开放式问题挖真因，避免急于推销。",
        "收尾时确认家长是否还有未说出口的顾虑。",
      ],
      rewrites: [
        {
          original: "您放心，我们效果很好的。",
          improved:
            "我特别理解您对效果的担心。孩子上周识字正确率从 60% 提到 78%，我们这周会针对性加练阅读理解，并在周五把进度发给您。",
          reason: "用数据替代空泛承诺，并给出跟进节奏。",
        },
      ],
      summary:
        "整体达到合格偏上水平：情绪稳定、流程完整，下一步重点是用证据说话并深化异议挖掘。",
    });
  }
  if (system.includes("运营教练") || prompt.includes("思路提示")) {
    return "先把家长这句话里的情绪接住，再用一个开放式问题确认真正卡点（价格本身，还是性价比/对比焦虑），最后只给一个可执行的小方案，不要一次抛一堆政策。";
  }
  return mockBaishitongReply(prompt);
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
