"use client";

import { userHeaders } from "@/lib/identity";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  PERSONAS,
  REFUND_REASONS,
  SCENARIOS,
  type ParentPersona,
  type RefundReason,
  type ScenarioId,
} from "@/lib/types";

export default function TrainPage() {
  const router = useRouter();
  const scenarios = useMemo(() => Object.values(SCENARIOS), []);
  const [scenarioId, setScenarioId] = useState<ScenarioId>("zhaqun");
  const [persona, setPersona] = useState<ParentPersona>("焦虑型");
  const [refundReason, setRefundReason] = useState<RefundReason>("效果");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/train/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userHeaders() },
        body: JSON.stringify({
          scenarioId,
          persona,
          refundReason: scenarioId === "tuifei" ? refundReason : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      router.push(`/train/${data.session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">情景模拟训练台</h1>
        <p className="mt-2 text-sm text-slate-400">
          选择场景与家长人设，启星AI 将扮演家长与你对练。
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-300">1. 选择场景</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {scenarios.map((s) => {
            const active = s.id === scenarioId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScenarioId(s.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-cyan-400/60 bg-cyan-400/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="font-semibold text-white">{s.name}</div>
                <p className="mt-1 text-sm text-slate-400">{s.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-300">2. 选择家长人设</h2>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPersona(p)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                persona === p
                  ? "bg-indigo-500 text-white"
                  : "bg-white/10 text-slate-300 hover:bg-white/15"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </section>

      {scenarioId === "tuifei" && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-300">3. 退费表面原因</h2>
          <div className="flex flex-wrap gap-2">
            {REFUND_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRefundReason(r)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  refundReason === r
                    ? "bg-rose-500/80 text-white"
                    : "bg-white/10 text-slate-300 hover:bg-white/15"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </section>
      )}

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={start}
        className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-8 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
      >
        {loading ? "正在进入对练室…" : "开始对练"}
      </button>
    </div>
  );
}
