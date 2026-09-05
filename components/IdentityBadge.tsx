"use client";

import {
  getIdentity,
  setIdentity,
  subscribeIdentity,
} from "@/lib/identity";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * 顶部导航右侧的身份徽章：显示当前昵称/工号，点击可设置或切换。
 * 身份存 localStorage，用于会话与反馈的归属隔离。
 */
export function IdentityBadge() {
  const name = useSyncExternalStore(subscribeIdentity, getIdentity, () => "");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function save() {
    const value = draft.trim();
    if (!value) return;
    setIdentity(value);
    setOpen(false);
  }

  function clear() {
    setIdentity("");
    setDraft("");
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setDraft(name);
          setOpen((v) => !v);
        }}
        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition sm:px-3 sm:py-1.5 ${
          name
            ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
            : "border-amber-400/40 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"
        }`}
        title={name ? `当前身份：${name}（点击切换）` : "点击设置昵称/工号，用于隔离你的对练记录"}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
        <span className="max-w-20 truncate sm:max-w-28">
          {name || "设置身份"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-white/15 bg-[#0b1626] p-3 shadow-xl shadow-black/40">
          <p className="text-xs text-slate-400">
            输入你的昵称或工号，对练记录与反馈将按身份隔离展示。
          </p>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
            maxLength={32}
            placeholder="昵称 / 工号"
            className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={clear}
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              清除身份
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!draft.trim()}
              className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
