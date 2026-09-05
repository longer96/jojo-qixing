"use client";

import { getIdentity, setIdentity, subscribeIdentity } from "@/lib/identity";
import { useState, useSyncExternalStore } from "react";

/**
 * 首次使用时的身份提示：未设置身份时弹出一次，
 * 可设置昵称/工号，也可选择「暂不设置」（不保留历史记录）。
 * 跳过仅对当前标签页本次会话生效，刷新后会再次提示。
 */
export function IdentityPrompt() {
  // 服务端/水合阶段返回 null，避免弹窗闪现
  const identity = useSyncExternalStore<string | null>(
    subscribeIdentity,
    getIdentity,
    () => null,
  );
  const [dismissed, setDismissed] = useState(false);
  const [draft, setDraft] = useState("");

  if (identity === null || identity !== "" || dismissed) return null;

  function save() {
    const value = draft.trim();
    if (!value) return;
    setIdentity(value);
    setDismissed(true);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0b1626] p-6 shadow-2xl shadow-black/50">
        <h2 className="text-lg font-semibold text-white">先设置一个身份吧</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          输入你的昵称或工号，对练记录、考核报告与反馈将按身份保留，方便你随时回看与复盘。
        </p>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          maxLength={32}
          autoFocus
          placeholder="昵称 / 工号"
          className="mt-4 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-base text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50 sm:text-sm"
        />
        <button
          type="button"
          onClick={save}
          disabled={!draft.trim()}
          className="mt-3 w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          保存并开始使用
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-2 w-full rounded-full border border-white/15 py-2.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
        >
          暂不设置，直接使用（不保留历史记录）
        </button>
      </div>
    </div>
  );
}
