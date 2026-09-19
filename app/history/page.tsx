"use client";

import {
  getIdentity,
  IDENTITY_EVENT,
  subscribeIdentity,
  userHeaders,
} from "@/lib/identity";
import { personaDisplayName } from "@/lib/personas";
import type { FeedbackItem, TrainSession } from "@/lib/types";
import { SCENARIOS } from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const DIM_SHORT: Record<string, string> = {
  沟通流畅度: "流畅",
  关键话术命中率: "话术",
  异议处理有效性: "异议",
  情绪稳定性: "情绪",
};

const LEVEL_NAMES = ["未入门", "新秀", "进阶", "熟练", "骨干", "王牌"];
const LEVEL_THRESHOLDS = [1, 5, 10, 20, 40]; // 考核局数 → Lv1-5

function computeGrowth(sessions: TrainSession[]) {
  const evaluated = sessions.filter((s) => s.report);
  const avgOverall = evaluated.length
    ? Math.round(
        evaluated.reduce((a, s) => a + (s.report?.overallScore ?? 0), 0) /
          evaluated.length,
      )
    : 0;

  // 近 10 次考核的四维均分（能力雷达）
  const recent = evaluated.slice(0, 10);
  const dimNames = Object.keys(DIM_SHORT);
  const dimAvgs = dimNames.map((name) => {
    const vals = recent
      .map((s) => s.report?.dimensions.find((d) => d.name === name)?.score)
      .filter((v): v is number => typeof v === "number");
    return vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0;
  });

  // 连续练习天数（今天没练则从昨天算起）
  const days = new Set(sessions.map((s) => new Date(s.updatedAt).toDateString()));
  const cursor = new Date();
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (evaluated.length >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? null;

  const badges = [
    { name: "首练达成", ok: sessions.length >= 1 },
    { name: "十场磨砺", ok: sessions.length >= 10 },
    { name: "高分选手", ok: avgOverall >= 85 },
    { name: "三日连击", ok: streak >= 3 },
    {
      name: "全维度 80+",
      ok: evaluated.length >= 3 && dimAvgs.every((v) => v >= 80),
    },
  ];

  return { evaluated, avgOverall, dimNames, dimAvgs, streak, level, nextThreshold, badges };
}

function Radar({ labels, values }: { labels: string[]; values: number[] }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const R = 80;
  const angle = (i: number) => (Math.PI * 2 * i) / labels.length - Math.PI / 2;
  const px = (i: number, r: number) => cx + Math.cos(angle(i)) * r;
  const py = (i: number, r: number) => cy + Math.sin(angle(i)) * r;
  const ring = (ratio: number) =>
    labels.map((_, i) => `${px(i, R * ratio)},${py(i, R * ratio)}`).join(" ");
  const valuePoly = labels
    .map((_, i) => `${px(i, (R * Math.min(values[i] ?? 0, 100)) / 100)},${py(i, (R * Math.min(values[i] ?? 0, 100)) / 100)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-60 w-60">
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} points={ring(r)} fill="none" stroke="rgba(255,255,255,0.08)" />
      ))}
      {labels.map((_, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={px(i, R)}
          y2={py(i, R)}
          stroke="rgba(255,255,255,0.08)"
        />
      ))}
      <polygon
        points={valuePoly}
        fill="rgba(34,211,238,0.22)"
        stroke="rgb(34,211,238)"
        strokeWidth="1.5"
      />
      {labels.map((l, i) => (
        <text
          key={l}
          x={px(i, R + 22)}
          y={py(i, R + 22)}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-slate-400"
          fontSize="11"
        >
          {l}
        </text>
      ))}
      {values.map((v, i) => (
        <text
          key={i}
          x={px(i, R * 0.5)}
          y={py(i, R * 0.5)}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-cyan-200"
          fontSize="10"
        >
          {v > 0 ? v : ""}
        </text>
      ))}
    </svg>
  );
}

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

  const growth = computeGrowth(sessions);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">历史与成长</h1>
        <p className="mt-2 text-sm text-slate-400">
          查看对练记录、能力雷达与成长等级。仅显示当前身份（右上角徽章）名下的记录。
        </p>
      </div>

      {error && <p className="text-rose-300">{error}</p>}

      {identity === "" && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          你还未设置身份，当前不保留任何历史记录。点击右上角「我：未设置」徽章，设置昵称/工号后即可保留并查看你的对练与反馈记录。
        </div>
      )}

      {/* 我的成长 */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-semibold text-white">我的成长</h2>
          {growth.evaluated.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              完成一次对练考核后，这里会展示你的等级与成长轨迹。
            </p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-baseline gap-3">
                <span className="bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-3xl font-bold text-transparent">
                  Lv{growth.level} · {LEVEL_NAMES[growth.level]}
                </span>
                <span className="text-sm text-slate-400">
                  考核 {growth.evaluated.length} 局 · 平均 {growth.avgOverall} 分 ·
                  连练 {growth.streak} 天
                </span>
              </div>
              {growth.nextThreshold && (
                <p className="mt-1 text-xs text-slate-500">
                  再考核 {growth.nextThreshold - growth.evaluated.length} 局升级
                  Lv{growth.level + 1} · {LEVEL_NAMES[growth.level + 1]}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {growth.badges.map((b) => (
                  <span
                    key={b.name}
                    className={`rounded-full px-3 py-1 text-xs ${
                      b.ok
                        ? "bg-amber-400/15 text-amber-200"
                        : "bg-white/5 text-slate-600"
                    }`}
                  >
                    {b.ok ? "🏅 " : "🔒 "}
                    {b.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div>
            <h2 className="text-lg font-semibold text-white">能力雷达</h2>
            <p className="mt-1 text-xs text-slate-500">
              近 {Math.min(growth.evaluated.length, 10)} 次考核四维均分
            </p>
            {growth.evaluated.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-slate-400">
                {growth.dimNames.map((n, i) => (
                  <li key={n}>
                    {n}：
                    <span className="text-cyan-200">{growth.dimAvgs[i] || "-"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {growth.evaluated.length > 0 ? (
            <Radar
              labels={growth.dimNames.map((n) => DIM_SHORT[n])}
              values={growth.dimAvgs}
            />
          ) : (
            <p className="text-sm text-slate-600">暂无数据</p>
          )}
        </div>
      </section>

      {/* 对练会话 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">对练会话</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-500">暂无记录，去开始一次情景模拟吧。</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {SCENARIOS[s.scenarioId].name} · {personaDisplayName(s.persona)}
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
                {s.report && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.report.dimensions.map((d) => (
                      <span
                        key={d.name}
                        className={`rounded px-2 py-0.5 text-[11px] ${
                          d.score >= 80
                            ? "bg-emerald-400/10 text-emerald-300"
                            : d.score >= 60
                              ? "bg-white/5 text-slate-400"
                              : "bg-rose-400/10 text-rose-300"
                        }`}
                      >
                        {d.name} {d.score}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 反馈闭环 */}
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
