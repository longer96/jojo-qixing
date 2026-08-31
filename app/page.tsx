import Link from "next/link";
import { DEFAULT_MODEL, isMockMode } from "@/lib/xai";

export default function HomePage() {
  const mock = isMockMode();

  return (
    <div className="space-y-10">
      {mock ? (
        <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
          已开启 <code className="mx-1">MOCK_AI</code>，使用本地模拟回复。
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          已接入 <code className="mx-1">{DEFAULT_MODEL}</code>
          （token.xjjj.co；原 Qwen3.8-27B 当前不稳定，已自动切换可用同系模型）
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/40 sm:p-12">
        <p className="text-sm font-medium tracking-widest text-cyan-300/90">
          运营「星」大脑 · 第一阶段
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
          启星AI · 首席内训官
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
          覆盖「模拟 → 考核 → 知识答疑」的班班能力成长台。在零风险环境中练炸群、学触、续费与退费挽单，结束后自动生成多维考核报告。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/train"
            className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
          >
            开始情景模拟
          </Link>
          <Link
            href="/baishitong"
            className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            打开百事通
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "情景模拟",
            desc: "AI 扮演焦虑/挑剔/沉默/捧场型家长，训练控场、异议处理与挽单。",
          },
          {
            title: "智能考核",
            desc: "沟通流畅度、关键话术命中率、异议处理有效性、情绪稳定性四维报告。",
          },
          {
            title: "百事通",
            desc: "产品知识、服务 SOP、优秀案例即问即答，降低检索与决策成本。",
          },
        ].map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-6"
          >
            <h2 className="text-lg font-semibold text-white">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{card.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
