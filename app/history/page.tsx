"use client";

import {
  getIdentity,
  IDENTITY_EVENT,
  subscribeIdentity,
  userHeaders,
} from "@/lib/identity";
import type { FeedbackItem, TrainSession } from "@/lib/types";
import { SCENARIOS } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<TrainSession[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState("");
  // null 表示 SSR/水合阶段，此时不渲染匿名提示，避免闪现
  const identity = useSyncExternalStore<string | null>(
    subscribeIdentity,
    getIdentity,
    () => null,
  );

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/sessions", { headers: userHeaders() }).then((r) => r.json()),
      fetch("/api/feedback", { headers: userHeaders() }).then((r) => r.json()),
    ])
      .then(([s, f]) => {
        setSessions(s.sessions || []);
        setFeedback(f.feedback || []);
      })
      .catch(() => setError("加载历史失败"));
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(IDENTITY_EVENT, load);
    return () => window.removeEventListener(IDENTITY_EVENT, load);
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">历史与反馈</h1>
        <p className="mt-2 text-sm text-slate-400">
          查看对练记录与「推荐 / 不推荐」准确性闭环数据。仅显示当前身份（右上角徽章）名下的记录。
        </p>
      </div>

      {error && <p className="text-rose-300">{error}</p>}

      {identity === "" && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          你还未设置身份，当前不保留任何历史记录。点击右上角「设置身份」徽章，设置昵称/工号后即可保留并查看你的对练与反馈记录。
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">对练会话</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">暂无记录，去开始一次情景模拟吧。</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium text-white">
                    {SCENARIOS[s.scenarioId].name} · {s.persona}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(s.updatedAt).toLocaleString()} · {s.messages.length} 条消息 ·{" "}
                    {s.status === "evaluated"
                      ? `已考核 ${s.report?.overallScore ?? "-"} 分`
                      : "进行中"}
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <Link
                    href={`/train/${s.id}`}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-slate-200 hover:bg-white/10"
                  >
                    打开
                  </Link>
                  {s.report && (
                    <Link
                      href={`/report/${s.id}`}
                      className="rounded-full bg-cyan-400/20 px-3 py-1.5 text-cyan-200 hover:bg-cyan-400/30"
                    >
                      报告
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">反馈闭环</h2>
        {feedback.length === 0 ? (
          <p className="text-sm text-slate-500">还没有推荐/不推荐记录。</p>
        ) : (
          <div className="space-y-2">
            {feedback.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
              >
                <span
                  className={
                    f.rating === "up" ? "text-emerald-400" : "text-rose-400"
                  }
                >
                  {f.rating === "up" ? "推荐" : "不推荐"}
                </span>
                <span className="ml-2 text-slate-400">
                  {f.target === "train" ? "对练" : "百事通"}
                </span>
                <span className="ml-2 text-xs text-slate-500">
                  {new Date(f.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
