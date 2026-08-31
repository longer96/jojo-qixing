"use client";

import { ScoreBars } from "@/components/ScoreBars";
import type { TrainSession } from "@/lib/types";
import { SCENARIOS } from "@/lib/types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function ReportPage() {
  const params = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<TrainSession | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/sessions/${params.sessionId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "加载失败");
        setSession(data.session);
      })
      .catch((e) => setError(e.message));
  }, [params.sessionId]);

  if (error) return <p className="text-rose-300">{error}</p>;
  if (!session) return <p className="text-slate-400">加载报告…</p>;
  if (!session.report) {
    return (
      <div className="space-y-4">
        <p className="text-slate-300">该会话尚未生成考核报告。</p>
        <Link href={`/train/${session.id}`} className="text-cyan-300 underline">
          返回对练室结束并考核
        </Link>
      </div>
    );
  }

  const report = session.report;
  const scenario = SCENARIOS[session.scenarioId];

  async function copySummary() {
    const text = [
      `启星AI 考核报告`,
      `场景：${scenario.name} / ${session!.persona}`,
      `综合：${report.overallScore}`,
      ...report.dimensions.map((d) => `${d.name}: ${d.score} — ${d.comment}`),
      `总评：${report.summary}`,
      `建议：`,
      ...report.suggestions.map((s, i) => `${i + 1}. ${s}`),
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">智能考核报告</h1>
          <p className="mt-2 text-sm text-slate-400">
            {scenario.name} · {session.persona}
            {session.refundReason ? ` · ${session.refundReason}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copySummary}
            className="rounded-full border border-white/15 px-4 py-2 text-xs text-slate-200 hover:bg-white/10"
          >
            {copied ? "已复制" : "复制摘要"}
          </button>
          <Link
            href="/train"
            className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-2 text-xs font-semibold text-slate-950"
          >
            再练一次
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <ScoreBars report={report} />
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">总评</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{report.summary}</p>
          <h3 className="mt-6 text-sm font-medium text-slate-200">个性化优化建议</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
            {report.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      </div>

      {report.rewrites?.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">示范改写</h2>
          <div className="mt-4 space-y-4">
            {report.rewrites.map((r, i) => (
              <div key={i} className="rounded-xl bg-black/20 p-4 text-sm">
                <p className="text-slate-500">原话</p>
                <p className="mt-1 text-slate-300">{r.original}</p>
                <p className="mt-3 text-slate-500">建议</p>
                <p className="mt-1 text-cyan-100">{r.improved}</p>
                <p className="mt-2 text-xs text-slate-500">{r.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
