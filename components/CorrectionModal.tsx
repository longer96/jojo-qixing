"use client";

import { userHeaders } from "@/lib/identity";
import { useState } from "react";

/**
 * 知识修正提交弹窗：班班在百事通使用过程中发现知识有误/过时，
 * 选择目标文档并填写修正内容，提交后进入管理后台审核。
 */
export function CorrectionModal(props: {
  catalog: { id: string; title: string }[];
  defaultDocId?: string;
  qaId?: string;
  question?: string;
  onClose: () => void;
}) {
  const [docId, setDocId] = useState(
    props.defaultDocId ?? props.catalog[0]?.id ?? "",
  );
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!docId || !content.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/knowledge/corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userHeaders() },
        body: JSON.stringify({
          docId,
          content: content.trim(),
          qaId: props.qaId,
          question: props.question,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "提交失败");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0b1626] p-5 shadow-2xl shadow-black/50">
        {done ? (
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white">已提交审核</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              你的修正已进入管理后台审核队列，管理员通过后会自动更新对应知识文档。
            </p>
            <button
              type="button"
              onClick={props.onClose}
              className="mt-4 w-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 py-2.5 text-sm font-semibold text-slate-950"
            >
              完成
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-white">修正知识库</h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              发现知识有误、过时或需要补充？选择目标文档并写下修正内容，管理员审核通过后生效。
            </p>
            {props.question && (
              <p className="mt-2 rounded-lg bg-black/20 px-3 py-2 text-xs text-slate-400">
                关联问题：{props.question}
              </p>
            )}
            <label className="mt-3 block text-xs text-slate-400">目标知识文档</label>
            <select
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-[#0b1626] px-3 py-2 text-sm text-white"
            >
              {props.catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <label className="mt-3 block text-xs text-slate-400">修正内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="例如：第 2 点续费优惠已调整为 XXX，正确口径为……"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
            />
            {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={props.onClose}
                className="flex-1 rounded-full border border-white/15 py-2.5 text-sm text-slate-300 hover:bg-white/5"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !docId || !content.trim()}
                className="flex-1 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
              >
                {submitting ? "提交中…" : "提交审核"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
