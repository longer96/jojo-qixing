"use client";

import { userHeaders } from "@/lib/identity";
import {
  DIFFICULTY_LABELS,
  getPersona,
  okPersonasForScenario,
  PERSONAS,
  RELATION_LABELS,
  type Persona,
} from "@/lib/personas";
import {
  REFUND_REASONS,
  SCENARIOS,
  type RefundReason,
  type ScenarioId,
  type TrainDifficulty,
} from "@/lib/types";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const DIFFICULTY_DESC: Record<TrainDifficulty, string> = {
  novice: "温和引导，适合第一次上台",
  skilled: "接近真实家长的标准强度",
  master: "追问到底，骨干与比赛强度",
};

function stars(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export default function TrainPage() {
  const router = useRouter();
  const scenarios = useMemo(() => Object.values(SCENARIOS), []);
  const [scenarioId, setScenarioId] = useState<ScenarioId>("zhaqun");
  const [personaId, setPersonaId] = useState("anxious");
  const [refundReason, setRefundReason] = useState<RefundReason>("效果");
  const [difficulty, setDifficulty] = useState<TrainDifficulty>("skilled");
  const [viewedTips, setViewedTips] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const persona = getPersona(personaId);
  const fit = persona.fit[scenarioId];
  const scenario = SCENARIOS[scenarioId];

  function pickScenario(id: ScenarioId) {
    setScenarioId(id);
    setError("");
    // 当前人设与新场景冲突时，自动切到该场景第一个适配人设
    if (getPersona(personaId).fit[id].level === "block") {
      const ok = okPersonasForScenario(id);
      if (ok.length > 0) setPersonaId(ok[0].id);
    }
  }

  function pickPersona(p: Persona) {
    const f = p.fit[scenarioId];
    if (f.level === "block") {
      setError(f.reason ?? "该人设不适合此场景");
      return;
    }
    setError("");
    setPersonaId(p.id);
  }

  function randomize() {
    const sc = scenarios[Math.floor(Math.random() * scenarios.length)];
    const ok = okPersonasForScenario(sc.id);
    const p = ok[Math.floor(Math.random() * ok.length)] ?? PERSONAS[0];
    setScenarioId(sc.id);
    setPersonaId(p.id);
    setError("");
    setConfirming(true);
  }

  async function start() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/train/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userHeaders() },
        body: JSON.stringify({
          scenarioId,
          personaId,
          refundReason: scenarioId === "tuifei" ? refundReason : undefined,
          difficulty,
          viewedTips,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      router.push(`/train/${data.session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
      setConfirming(false);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">情景模拟训练台</h1>
        <p className="mt-2 text-sm text-slate-400">
          选择场景与家长人设，启星AI 将扮演家长与你对练。人设难度越高，松动越难。
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
                onClick={() => pickScenario(s.id)}
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
        <button
          type="button"
          onClick={() => {
            setShowTips((v) => {
              if (!v) setViewedTips(true);
              return !v;
            });
          }}
          className="text-xs text-slate-400 underline decoration-dotted underline-offset-4 hover:text-cyan-300"
        >
          {showTips ? "收起提示" : "先看提示（会标注，不影响分数）"}
        </button>
        {showTips && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <span className="font-medium">标准思路：</span>
            {scenario.tips}
            <span className="ml-2 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px]">
              本局将标注「已查看提示」
            </span>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-300">2. 选择难度</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(DIFFICULTY_LABELS) as TrainDifficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                difficulty === d
                  ? "border-indigo-400/60 bg-indigo-400/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <div className="text-sm font-medium text-white">
                {DIFFICULTY_LABELS[d]}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                {DIFFICULTY_DESC[d]}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-300">
          3. 选择家长人设
          <span className="ml-2 text-xs font-normal text-slate-500">
            灰色为与该场景不适配（点击查看原因）
          </span>
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map((p) => {
            const f = p.fit[scenarioId];
            const blocked = f.level === "block";
            const active = p.id === personaId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => pickPersona(p)}
                title={blocked ? f.reason : undefined}
                className={`rounded-2xl border p-3.5 text-left transition ${
                  blocked
                    ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-40"
                    : active
                      ? "border-indigo-400/60 bg-indigo-400/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{p.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-white">
                      {p.name}
                    </div>
                    <div className="truncate text-[11px] text-slate-500">
                      {p.identity} · {RELATION_LABELS[p.relation]}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] text-amber-300">
                    {stars(p.difficulty)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                  {p.tagline}
                </p>
                {f.level === "warn" && (
                  <span className="mt-2 inline-block rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] text-amber-200">
                    非典型组合
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 选中人设的画像卡（不含软肋，避免开卷考试） */}
        {!confirming && (
          <div className="flex items-start gap-3 rounded-2xl border border-indigo-400/25 bg-indigo-400/5 p-4">
            <span className="text-3xl">{persona.avatar}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-white">{persona.name}</span>
                <span className="text-xs text-amber-300">
                  {stars(persona.difficulty)}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                  {RELATION_LABELS[persona.relation]}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                {persona.tagline}
              </p>
              {fit.level === "warn" && (
                <p className="mt-1 text-xs text-amber-300">
                  非典型组合：{fit.reason}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {scenarioId === "tuifei" && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-300">4. 退费表面原因</h2>
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

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={randomize}
          className="rounded-full border border-white/15 px-6 py-3 text-sm text-slate-200 hover:bg-white/10"
        >
          🎲 随机出题
        </button>
        <button
          type="button"
          disabled={loading || fit.level === "block"}
          onClick={() => setConfirming(true)}
          className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-8 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          开始对练
        </button>
      </div>

      {/* 开局确认卡 */}
      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0b1626] p-6 shadow-2xl shadow-black/50">
            <h2 className="text-sm font-medium text-slate-400">你即将面对</h2>
            <div className="mt-3 flex items-start gap-3">
              <span className="text-4xl">{persona.avatar}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold text-white">
                    {persona.name}
                  </span>
                  <span className="text-sm text-amber-300">
                    {stars(persona.difficulty)}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {persona.identity} · {RELATION_LABELS[persona.relation]}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {persona.tagline}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 rounded-xl bg-black/20 px-4 py-3 text-sm text-slate-300">
              <div>
                场景：{scenario.name}
                {scenarioId === "tuifei" && ` · 退费原因：${refundReason}`}
              </div>
              <div>难度：{DIFFICULTY_LABELS[difficulty]} ｜ 预计 8-15 轮</div>
              {viewedTips && (
                <div className="text-xs text-amber-300">
                  已查看场景提示（本局将标注，不影响分数）
                </div>
              )}
              {fit.level === "warn" && (
                <div className="text-xs text-amber-300">
                  非典型组合：{fit.reason}
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-full border border-white/15 py-2.5 text-sm text-slate-300 hover:bg-white/5"
              >
                换一个对手
              </button>
              <button
                type="button"
                onClick={start}
                disabled={loading}
                className="flex-1 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                {loading ? "正在进入…" : "开始"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
