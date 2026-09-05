"use client";

import { CorrectionModal } from "@/components/CorrectionModal";
import { FeedbackButtons } from "@/components/FeedbackButtons";
import { IdentityClearedOverlay } from "@/components/IdentityClearedOverlay";
import { userHeaders } from "@/lib/identity";
import { useIdentityCleared } from "@/lib/useIdentityCleared";
import { useEffect, useRef, useState } from "react";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  knowledgeIds?: string[];
}

type CatalogItem = { id: string; title: string };

const SUGGESTIONS = [
  "退费挽单怎么挖真实原因？",
  "续费 RP 的五步结构是什么？",
  "开班炸群时群内应该怎么控场？",
  "学触时怎么跟家长讲进步？",
];

export default function BaishitongPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamCtl = useRef<AbortController | null>(null);
  const identityCleared = useIdentityCleared();
  const catalogRef = useRef<Map<string, string>>(new Map());
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [correcting, setCorrecting] = useState<{
    qaId?: string;
    question?: string;
    defaultDocId?: string;
  } | null>(null);

  // 加载知识目录，用于展示引用来源与修正目标选择
  useEffect(() => {
    fetch("/api/knowledge/catalog")
      .then((r) => r.json())
      .then((data) => {
        const items = (data.catalog ?? []) as CatalogItem[];
        const map = new Map<string, string>();
        for (const item of items) {
          map.set(item.id, item.title);
        }
        catalogRef.current = map;
        setCatalog(items);
      })
      .catch(() => undefined);
  }, []);

  // 使用中清除身份：立即中止正在进行的问答
  useEffect(() => {
    if (identityCleared) streamCtl.current?.abort();
  }, [identityCleared]);

  async function send(textRaw?: string) {
    const text = (textRaw ?? input).trim();
    if (!text || streaming || identityCleared) return;
    setInput("");
    setStreaming(true);
    setError("");
    const ctl = new AbortController();
    streamCtl.current = ctl;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMsg: Msg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: "streaming", role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/baishitong/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userHeaders() },
        body: JSON.stringify({ message: text, history }),
        signal: ctl.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "回答失败");
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("无响应流");
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            id: "streaming",
            role: "assistant",
            content: full,
          };
          return copy;
        });
      }
      // 服务端在流末尾追加 <!--qa:ID--> 标记：取出作为消息 id（反馈/审核关联用），不展示
      const qaMatch = full.match(/<!--qa:([a-f0-9-]+)-->/);
      const qaId = qaMatch?.[1];
      const content = full.replace(/\n\n<!--qa:[a-f0-9-]+-->$/, "");
      const knowledgeIds = (res.headers.get("X-Knowledge-Ids") ?? "")
        .split(",")
        .filter(Boolean);
      const sourceTitles = knowledgeIds
        .map((id) => catalogRef.current.get(id))
        .filter((t): t is string => Boolean(t));
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          id: qaId ?? `a-${Date.now()}`,
          role: "assistant",
          content,
          sources: sourceTitles.length > 0 ? [...new Set(sourceTitles)] : undefined,
          knowledgeIds,
        };
        return copy;
      });
    } catch (e) {
      if (!ctl.signal.aborted) {
        setError(e instanceof Error ? e.message : "回答失败");
      }
      setMessages((prev) => prev.filter((m) => m.id !== "streaming"));
    } finally {
      setStreaming(false);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col gap-3 sm:gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">百事通</h1>
        <p className="mt-2 text-sm text-slate-400">
          智能业务知识中枢：产品知识、服务 SOP、优秀案例，即问即答。
        </p>
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">向百事通提问，例如「退费挽单四因怎么应对」。 </p>
        )}
        {messages.map((m, idx) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 sm:max-w-[85%] sm:px-4 sm:py-3 ${
                m.role === "user"
                  ? "bg-indigo-500/25 text-indigo-50"
                  : "bg-white/10 text-slate-100"
              }`}
            >
              <div className="mb-1 text-[11px] text-slate-400">
                {m.role === "user" ? "你" : "百事通"}
              </div>
              <div className="whitespace-pre-wrap">{m.content || "…"}</div>
              {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                <div className="mt-2 border-t border-white/10 pt-2 text-[11px] text-slate-400">
                  参考来源：{m.sources.map((t) => `《${t}》`).join("、")}
                </div>
              )}
              {m.role === "assistant" && m.id !== "streaming" && (
                <div className="flex flex-wrap items-center gap-3">
                  <FeedbackButtons target="baishitong" messageId={m.id} />
                  <button
                    type="button"
                    onClick={() =>
                      setCorrecting({
                        qaId: /^[0-9a-f-]{36}$/.test(m.id) ? m.id : undefined,
                        question:
                          messages[idx - 1]?.role === "user"
                            ? messages[idx - 1].content
                            : undefined,
                        defaultDocId: m.knowledgeIds?.[0],
                      })
                    }
                    className="mt-1 text-xs text-slate-400 transition hover:text-cyan-300"
                  >
                    修正知识
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming || identityCleared}
          placeholder="问业务知识、SOP、话术策略…"
          className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-indigo-400/50 sm:text-sm"
        />
        <button
          type="submit"
          disabled={streaming || identityCleared || !input.trim()}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 disabled:opacity-50"
        >
          提问
        </button>
      </form>

      <IdentityClearedOverlay visible={identityCleared} detail="本次问答" />

      {correcting && catalog.length > 0 && (
        <CorrectionModal
          catalog={catalog}
          defaultDocId={correcting.defaultDocId}
          qaId={correcting.qaId}
          question={correcting.question}
          onClose={() => setCorrecting(null)}
        />
      )}
    </div>
  );
}
