"use client";

import { useRouter } from "next/navigation";

/**
 * 使用过程中身份被清除时的阻断遮罩：
 * 当前功能立即结束，已产生的记录保留在原身份名下。
 */
export function IdentityClearedOverlay(props: {
  visible: boolean;
  detail: string;
}) {
  const router = useRouter();
  if (!props.visible) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0b1626] p-6 shadow-2xl shadow-black/50">
        <h2 className="text-lg font-semibold text-white">身份已清除</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          你清除了当前身份，{props.detail}
          已立即结束。已产生的使用记录保留在原身份名下，重新设置同一昵称/工号后可在「历史与反馈」中查看。
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 py-2.5 text-sm font-semibold text-slate-950"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
