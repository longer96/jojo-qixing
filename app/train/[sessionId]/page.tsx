"use client";

import { FeedbackButtons } from "@/components/FeedbackButtons";
import { IdentityClearedOverlay } from "@/components/IdentityClearedOverlay";
import { DIFFICULTY_LABELS, personaDisplayName } from "@/lib/personas";
import { useIdentityCleared } from "@/lib/useIdentityCleared";
import type { ChatMessage, TrainSession } from "@/lib/types";
import { SCENARIOS } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function TrainSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const router = useRouter();
  const [session, setSession] = useState<TrainSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [mock, setMock] = useState(false);
  const bootstrapped = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamCtl = useRef<AbortController | null>(null);
  const identityCleared = useIdentityCleared();

  // 使用中清除身份：立即中止正在进行的流式对话，已有记录保留在服务端
  useEffect(() => {
    if (identityCleared) streamCtl.current?.abort();
  }, [identityCleared]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "加载失败");
    setSession(data.session);
    setMessages(data.session.messages);
    return data.session as TrainSession;
  }, [sessionId]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function readStream(
    res: Response,
    onChunk: (t: string) => void,
  ): Promise<string> {
    if (res.headers.get("X-Mock-AI") === "1") setMock(true);
    const reader = res.body?.getReader();
    if (!reader) throw new Error("无响应流");
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      onChunk(full);
    }
    return full;
  }

  const bootstrap = useCallback(async () => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    setStreaming(true);
    setError("");
    const ctl = new AbortController();
    streamCtl.current = ctl;
    try {
      const res = await fetch("/api/train/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, bootstrap: true }),
        signal: ctl.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "开场失败");
      }
      let draft = "";
      await readStream(res, (t) => {
        draft = t;
        setMessages([
          {
            id: "streaming",
            role: "assistant",
            content: t,
            createdAt: new Date().toISOString(),
          },
        ]);
      });
      await load();
      if (!draft) await load();
    } catch (e) {
      if (!ctl.signal.aborted) {
        setError(e instanceof Error ? e.message : "开场失败");
        bootstrapped.current = false;
      }
    } finally {
      setStreaming(false);
    }
  }, [sessionId, load]);

  useEffect(() => {
    if (!session) return;
    if (session.messages.length === 0 && session.status === "active") {
      void bootstrap();
    }
  }, [session, bootstrap]);

  async function send() {
    const text = input.trim();
    if (!text || streaming || identityCleared) return;
    setInput("");
    setHint("");
    setStreaming(true);
    setError("");
    const ctl = new AbortController();
    streamCtl.current = ctl;

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [
      ...prev,
      optimistic,
      {
        id: "streaming",
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch("/api/train/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
        signal: ctl.signal,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "发送失败");
      }
      await readStream(res, (t) => {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.id === "streaming") {
            copy[copy.length - 1] = { ...last, content: t };
          }
          return copy;
        });
      });
      await load();
    } catch (e) {
      if (!ctl.signal.aborted) {
        setError(e instanceof Error ? e.message : "发送失败");
        await load();
      }
    } finally {
      setStreaming(false);
    }
  }

  async function askHint() {
    setHint("生成中…");
    try {
      const res = await fetch("/api/train/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "获取提示失败");
      setHint(data.hint);
    } catch (e) {
      setHint(e instanceof Error ? e.message : "获取提示失败");
    }
  }

  // 这局不算，重来：删除未考核会话并返回选人页
  async function restart() {
    if (!window.confirm("确定放弃本局并删除记录？该操作不可恢复。")) return;
    streamCtl.current?.abort();
    await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    router.push("/train");
  }

  async function finish() {
    setEvaluating(true);
    setError("");
    try {
      const res = await fetch("/api/train/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "考核失败");
      router.push(`/report/${sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "考核失败");
      setEvaluating(false);
    }
  }

  if (!session && !error) {
    return <p className="text-slate-400">加载对练室…</p>;
  }

  if (!session) {
    return <p className="text-rose-300">{error}</p>;
  }

  const scenario = SCENARIOS[session.scenarioId];
  const rounds = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col gap-3 sm:gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 font-semibold text-white">
            <span>
              {scenario.name} · {personaDisplayName(session.persona)}
              {session.refundReason ? ` · 退费原因：${session.refundReason}` : ""}
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-normal text-slate-300">
              {DIFFICULTY_LABELS[session.difficulty ?? "skilled"]}难度
            </span>
            {session.atypical && (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-normal text-amber-200">
                非典型组合
              </span>
            )}
            {session.viewedTips && (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-normal text-amber-200">
                已查看提示
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400">
            已进行 {rounds} 轮 · {mock ? "演示模式" : "Qwen"} · 你是班班，AI 是家长
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={streaming || evaluating || session.status === "evaluated"}
            onClick={restart}
            className="rounded-full border border-rose-400/30 px-4 py-2 text-xs text-rose-300 hover:bg-rose-400/10 disabled:opacity-50"
          >
            这局不算，重来
          </button>
          <button
            type="button"
            disabled={streaming}
            onClick={askHint}
            className="rounded-full border border-white/15 px-4 py-2 text-xs text-slate-200 hover:bg-white/10 disabled:opacity-50"
          >
            要个思路提示
          </button>
          <button
            type="button"
            disabled={streaming || evaluating}
            onClick={finish}
            className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
          >
            {evaluating ? "生成报告中…" : "结束对练并考核"}
          </button>
        </div>
      </div>

      {hint && (
        <div className="rounded-xl border border-indigo-400/30 bg-indigo-400/10 px-4 py-3 text-sm text-indigo-100">
          <span className="font-medium">教练提示：</span>
          {hint}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 sm:max-w-[85%] sm:px-4 sm:py-3 ${
                m.role === "user"
                  ? "bg-cyan-500/20 text-cyan-50"
                  : "bg-white/10 text-slate-100"
              }`}
            >
              <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                {m.role === "user" ? "班班（你）" : "家长（AI）"}
              </div>
              <div className="whitespace-pre-wrap">{m.content || "…"}</div>
              {m.role === "assistant" && m.id !== "streaming" && (
                <FeedbackButtons
                  target="train"
                  sessionId={sessionId}
                  messageId={m.id}
                />
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
          disabled={streaming || identityCleared || session.status === "evaluated"}
          placeholder="输入你要对家长说的话…"
          className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50 sm:text-sm"
        />
        <button
          type="submit"
          disabled={streaming || identityCleared || !input.trim()}
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 disabled:opacity-50"
        >
          发送
        </button>
      </form>

      <IdentityClearedOverlay visible={identityCleared} detail="本次对练" />
    </div>
  );
}
