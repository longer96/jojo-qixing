import type { EvaluationReport } from "@/lib/types";

export function ScoreBars({ report }: { report: EvaluationReport }) {
  return (
    <div className="space-y-5">
      <div className="flex items-end gap-3">
        <div className="text-5xl font-semibold text-cyan-300">
          {report.overallScore}
        </div>
        <div className="pb-1 text-sm text-slate-400">综合得分 / 100</div>
      </div>
      <div className="space-y-4">
        {report.dimensions.map((d) => (
          <div key={d.name}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-200">{d.name}</span>
              <span className="text-cyan-300">{d.score}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500"
                style={{ width: `${Math.min(100, Math.max(0, d.score))}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">{d.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
