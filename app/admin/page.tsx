"use client";

import {
  KNOWLEDGE_CATEGORY_LIST,
  KNOWLEDGE_CATEGORIES,
  type KnowledgeCategory,
} from "@/lib/types";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------- 类型 ----------

interface AdminDoc {
  id: string;
  title: string;
  category: KnowledgeCategory;
  enabled: boolean;
  source: "seed" | "upload" | "feedback";
  chunkCount: number;
  vectorCount: number;
  content: string;
  updatedAt: string;
}

interface ReviewItemData {
  id: string;
  question: string;
  answer: string;
  owner: string;
  status: "pending" | "approved" | "rejected";
  category?: KnowledgeCategory;
  createdAt: string;
  resolvedAt?: string;
}

type AuditStatus = "pending" | "approved" | "rejected";

const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  pending: "待处理",
  approved: "已通过",
  rejected: "已拒绝",
};

interface InspectionData {
  sessions: {
    id: string;
    owner: string;
    scenario: string;
    persona: string;
    status: string;
    score: number | null;
    messageCount: number;
    updatedAt: string;
  }[];
  feedback: {
    id: string;
    owner?: string;
    target: string;
    rating: string;
    createdAt: string;
  }[];
  qaCount: number;
  recentQa: { id: string; owner: string; question: string; createdAt: string }[];
  hotTopics: { label: string; count: number }[];
}

const SOURCE_LABELS = { seed: "种子", upload: "上传", feedback: "问答沉淀" } as const;

type Tab = "knowledge" | "review" | "correction" | "inspection";

// ---------- 页面 ----------

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("knowledge");
  const [aiConfig, setAiConfig] = useState<{
    kind: string;
    model?: string;
    baseUrl?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then(setAiConfig)
      .catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          知识库与闭环管理
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          自建知识库（Word 上传/编辑/启停）、推荐回答审核沉淀、组长/主管抽检视图。
        </p>
        {aiConfig && (
          <p className="mt-1 text-xs text-slate-500">
            {aiConfig.kind === "ok" &&
              `当前模型：${aiConfig.model}（${aiConfig.baseUrl}）`}
            {aiConfig.kind === "mock" && "当前为 MOCK_AI 演示模式"}
            {aiConfig.kind === "missing_key" &&
              "未配置 AI 密钥，对话功能不可用"}
          </p>
        )}
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-px">
        {(
          [
            ["knowledge", "知识库"],
            ["review", "待审核池"],
            ["correction", "修正审核"],
            ["inspection", "抽检视图"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-t-lg px-4 py-2 text-sm transition ${
              tab === key
                ? "border border-b-0 border-white/15 bg-white/10 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "knowledge" && <KnowledgeTab />}
      {tab === "review" && <ReviewTab />}
      {tab === "correction" && <CorrectionTab />}
      {tab === "inspection" && <InspectionTab />}
    </div>
  );
}

// ---------- 批量导入总入口 ----------

interface ImportResultItem {
  file: string;
  ok: boolean;
  title?: string;
  category?: KnowledgeCategory;
  mode?: "created" | "updated";
  chunkCount?: number;
  vectorCount?: number;
  error?: string;
}

function BatchImport({ onDone }: { onDone: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ImportResultItem[] | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 暂存文件：可多次挑选/拖入逐个累加（规避部分平台文件选择器不支持多选的问题）
  function stageFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    if (incoming.length === 0) return;
    setResults(null);
    setError("");
    setPendingFiles((prev) => {
      const merged = [...prev];
      for (const f of incoming) {
        if (
          !merged.some(
            (m) => m.name === f.name && m.size === f.size,
          )
        ) {
          merged.push(f);
        }
      }
      if (merged.length > 20) {
        setError("单次最多导入 20 个文件，已超出部分未加入");
        return merged.slice(0, 20);
      }
      return merged;
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function startImport() {
    if (pendingFiles.length === 0 || importing) return;
    setImporting(true);
    setError("");
    setResults(null);
    try {
      const fd = new FormData();
      for (const f of pendingFiles) fd.append("files", f);
      const res = await fetch("/api/admin/knowledge/import", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "导入失败");
      setResults(data.results ?? []);
      setPendingFiles([]);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          stageFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          dragOver
            ? "border-cyan-400/70 bg-cyan-400/10"
            : "border-white/20 bg-white/5 hover:border-white/35"
        }`}
      >
        <div className="text-sm font-medium text-white">
          {importing ? "正在解析并自动分类入库…" : "批量导入总入口"}
        </div>
        <p className="mt-1.5 text-xs leading-5 text-slate-400">
          {importing
            ? "文件较多或较大时需要一些时间，请稍候"
            : "把文件拖到这里，或点击选择（可分多次添加，支持 Word / PPT / Excel / PDF / md / txt，最多 20 个）"}
          {!importing && (
            <>
              <br />
              系统会根据文件名与内容自动归入对应知识模块
            </>
          )}
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".docx,.pptx,.xlsx,.xls,.pdf,.md,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) stageFiles(e.target.files);
          }}
        />
      </div>

      {pendingFiles.length > 0 && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-slate-400">
            待导入（{pendingFiles.length} 个）：
          </div>
          {pendingFiles.map((f, i) => (
            <div
              key={`${f.name}-${f.size}`}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="truncate text-slate-300">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="shrink-0 text-slate-500 hover:text-rose-300"
              >
                移除
              </button>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={startImport}
              disabled={importing}
              className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
            >
              {importing ? "导入中…" : `开始导入（${pendingFiles.length}）`}
            </button>
            <button
              type="button"
              onClick={() => setPendingFiles([])}
              disabled={importing}
              className="rounded-full border border-white/15 px-4 py-2 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              清空
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      {results && (
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-xs text-slate-400">
            导入结果：成功 {results.filter((r) => r.ok).length} 个，失败{" "}
            {results.filter((r) => !r.ok).length} 个
          </div>
          {results.map((r, i) => (
            <div
              key={`${r.file}-${i}`}
              className="flex flex-wrap items-center gap-2 text-xs"
            >
              <span className={r.ok ? "text-emerald-400" : "text-rose-400"}>
                {r.ok ? "✓" : "✗"}
              </span>
              <span className="text-slate-300">{r.file}</span>
              {r.ok ? (
                <span className="text-slate-500">
                  → {r.mode === "updated" ? "更新" : "新建"} ·{" "}
                  {r.category ? KNOWLEDGE_CATEGORIES[r.category].label : ""} ·{" "}
                  {r.chunkCount} 分块 · 向量 {r.vectorCount}/{r.chunkCount}
                </span>
              ) : (
                <span className="text-rose-300/80">{r.error}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- 知识库 Tab ----------

function KnowledgeTab() {
  const [docs, setDocs] = useState<AdminDoc[]>([]);
  const [filter, setFilter] = useState<KnowledgeCategory | "all">("all");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/knowledge")
      .then((r) => r.json())
      .then((d) => setDocs(d.docs ?? []))
      .catch(() => setError("加载知识库失败"));
  }, []);

  useEffect(load, [load]);

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("请选择支持的知识文件（Word/PPT/Excel/PDF/md/txt）");
      return;
    }
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append(
        "category",
        (form.elements.namedItem("category") as HTMLSelectElement).value,
      );
      fd.append(
        "title",
        (form.elements.namedItem("title") as HTMLInputElement).value,
      );
      const res = await fetch("/api/admin/knowledge/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      setNotice(
        `《${data.doc.title}》已入库：${data.doc.chunkCount} 个分块，${data.doc.vectorCount} 个已向量化`,
      );
      form.reset();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function reindex() {
    setNotice("正在重建向量…");
    setError("");
    try {
      const res = await fetch("/api/admin/knowledge/reindex", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "重建失败");
      setNotice(`重建完成：新增 ${data.embedded}/${data.total} 个向量`);
      load();
    } catch (err) {
      setNotice("");
      setError(err instanceof Error ? err.message : "重建失败");
    }
  }

  // 话术蒸馏：从高分对局提炼话术，生成优秀案例草稿（默认停用，审核后启用）
  async function distill() {
    setNotice("正在蒸馏高分对局话术…");
    setError("");
    try {
      const res = await fetch("/api/admin/distill", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "蒸馏失败");
      setNotice(
        `蒸馏完成：从 ${data.samples} 局高分对局提炼 ${data.count} 条话术，已生成优秀案例草稿（默认停用，审核后启用）`,
      );
      load();
    } catch (err) {
      setNotice("");
      setError(err instanceof Error ? err.message : "蒸馏失败");
    }
  }

  async function toggle(doc: AdminDoc) {
    await fetch(`/api/admin/knowledge/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !doc.enabled }),
    });
    load();
  }

  async function remove(doc: AdminDoc) {
    if (!window.confirm(`确定删除《${doc.title}》？该操作不可恢复。`)) return;
    await fetch(`/api/admin/knowledge/${doc.id}`, { method: "DELETE" });
    load();
  }

  const shown = docs.filter((d) => filter === "all" || d.category === filter);

  return (
    <div className="space-y-6">
      <BatchImport onDone={load} />

      <form
        onSubmit={upload}
        className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5"
      >
        <h2 className="text-sm font-medium text-slate-200">
          单文件上传（Word / PPT / Excel / PDF / md / txt）
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            name="file"
            type="file"
            accept=".docx,.pptx,.xlsx,.xls,.pdf,.md,.txt"
            className="w-full text-xs text-slate-400 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:text-slate-200 hover:file:bg-white/15 sm:w-auto"
          />
          <input
            name="title"
            placeholder="文档标题（默认可取文件名）"
            className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
          />
          <select
            name="category"
            className="rounded-lg border border-white/15 bg-[#0b1626] px-3 py-2 text-xs text-white"
            defaultValue="auto"
          >
            <option value="auto">自动分类</option>
            {KNOWLEDGE_CATEGORY_LIST.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
          >
            {uploading ? "解析入库中…" : "上传入库"}
          </button>
        </div>
      </form>

      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          {notice}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs ${filter === "all" ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-300"}`}
        >
          全部（{docs.length}）
        </button>
        {KNOWLEDGE_CATEGORY_LIST.map((c) => {
          const count = docs.filter((d) => d.category === c.id).length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={`rounded-full px-3 py-1.5 text-xs ${
                filter === c.id
                  ? "bg-indigo-500 text-white"
                  : count === 0
                    ? "bg-rose-400/10 text-rose-300"
                    : "bg-white/10 text-slate-300"
              }`}
            >
              {c.label}（{count}）
            </button>
          );
        })}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
        >
          手动新建
        </button>
        <button
          type="button"
          onClick={reindex}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
        >
          重建向量
        </button>
        <button
          type="button"
          onClick={distill}
          className="rounded-full border border-amber-400/30 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-400/10"
        >
          话术蒸馏
        </button>
      </div>

      {showCreate && (
        <DocEditor
          onSave={async (payload) => {
            const res = await fetch("/api/admin/knowledge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error((await res.json()).error || "创建失败");
            setShowCreate(false);
            load();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="space-y-2">
        {shown.length === 0 && (
          <p className="text-sm text-slate-500">该分类下暂无文档。</p>
        )}
        {shown.map((doc) => (
          <div
            key={doc.id}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span
                  className={`text-sm font-medium ${doc.enabled ? "text-white" : "text-slate-500 line-through"}`}
                >
                  {doc.title}
                </span>
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                  {KNOWLEDGE_CATEGORIES[doc.category].label}
                </span>
                <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-400">
                  {SOURCE_LABELS[doc.source]}
                </span>
                <div className="mt-1 text-[11px] text-slate-500">
                  {doc.chunkCount} 分块 · 向量 {doc.vectorCount}/{doc.chunkCount} ·{" "}
                  {new Date(doc.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => toggle(doc)}
                  className={`rounded-full px-3 py-1.5 ${doc.enabled ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-slate-400"}`}
                >
                  {doc.enabled ? "已启用" : "已停用"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(editingId === doc.id ? null : doc.id)}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-slate-200 hover:bg-white/10"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => remove(doc)}
                  className="rounded-full border border-rose-400/30 px-3 py-1.5 text-rose-300 hover:bg-rose-400/10"
                >
                  删除
                </button>
              </div>
            </div>
            {editingId === doc.id && (
              <DocEditor
                initial={doc}
                onSave={async (payload) => {
                  const res = await fetch(`/api/admin/knowledge/${doc.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  if (!res.ok) throw new Error((await res.json()).error || "保存失败");
                  setEditingId(null);
                  load();
                }}
                onCancel={() => setEditingId(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DocEditor(props: {
  initial?: AdminDoc;
  onSave: (payload: {
    title: string;
    category: KnowledgeCategory;
    content: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(props.initial?.title ?? "");
  const [category, setCategory] = useState<KnowledgeCategory>(
    props.initial?.category ?? "sop",
  );
  const [content, setContent] = useState(props.initial?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!content.trim()) {
      setError("内容不能为空");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await props.onSave({ title: title.trim(), category, content });
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文档标题"
          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
          className="rounded-lg border border-white/15 bg-[#0b1626] px-3 py-2 text-sm text-white"
        >
          {KNOWLEDGE_CATEGORY_LIST.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={8}
        placeholder="知识内容（保存后自动重新分块并向量化）"
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50"
      />
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-slate-300"
        >
          取消
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}

// ---------- 待审核池 Tab ----------

function ReviewTab() {
  const [items, setItems] = useState<ReviewItemData[]>([]);
  const [status, setStatus] = useState<AuditStatus>("pending");
  const [error, setError] = useState("");
  const [categoryMap, setCategoryMap] = useState<Record<string, KnowledgeCategory>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/admin/review-pool?status=${status}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setError("加载审核池失败"));
  }, [status]);

  useEffect(load, [load]);

  async function resolve(id: string, action: "approve" | "reject") {
    const res = await fetch(`/api/admin/review-pool/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, category: categoryMap[id] ?? "sop" }),
    });
    if (!res.ok) {
      setError((await res.json()).error || "操作失败");
      return;
    }
    load();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        班班在百事通中点「推荐」的回答会进入待审核池，确认无误后选择分类沉淀进知识库（准确性闭环第一层）。
      </p>
      <div className="flex gap-2">
        {(Object.keys(AUDIT_STATUS_LABELS) as AuditStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              status === s
                ? "bg-indigo-500 text-white"
                : "bg-white/10 text-slate-300 hover:bg-white/15"
            }`}
          >
            {AUDIT_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">暂无待审核内容。</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="text-sm font-medium text-white">
              Q：{item.question}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              来自 {item.owner} · {new Date(item.createdAt).toLocaleString()}
            </div>
            <button
              type="button"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              className="mt-2 text-xs text-cyan-300 hover:underline"
            >
              {expanded === item.id ? "收起回答" : "展开回答"}
            </button>
            {expanded === item.id && (
              <div className="mt-2 whitespace-pre-wrap rounded-lg bg-black/20 p-3 text-sm leading-6 text-slate-300">
                {item.answer}
              </div>
            )}
            {status === "pending" ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  value={categoryMap[item.id] ?? "sop"}
                  onChange={(e) =>
                    setCategoryMap((prev) => ({
                      ...prev,
                      [item.id]: e.target.value as KnowledgeCategory,
                    }))
                  }
                  className="rounded-lg border border-white/15 bg-[#0b1626] px-3 py-1.5 text-xs text-white"
                >
                  {KNOWLEDGE_CATEGORY_LIST.map((c) => (
                    <option key={c.id} value={c.id}>
                      沉淀到：{c.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => resolve(item.id, "approve")}
                  className="rounded-full bg-emerald-400/20 px-4 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-400/30"
                >
                  通过并入库
                </button>
                <button
                  type="button"
                  onClick={() => resolve(item.id, "reject")}
                  className="rounded-full border border-rose-400/30 px-4 py-1.5 text-xs text-rose-300 hover:bg-rose-400/10"
                >
                  拒绝
                </button>
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-500">
                {item.status === "approved"
                  ? `已通过${
                      item.category
                        ? `，沉淀到「${KNOWLEDGE_CATEGORIES[item.category].label}」`
                        : ""
                    }`
                  : "已拒绝"}
                {item.resolvedAt &&
                  ` · ${new Date(item.resolvedAt).toLocaleString()}`}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ---------- 修正审核 Tab ----------

interface CorrectionData {
  id: string;
  docId: string;
  docTitle: string;
  owner: string;
  question?: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
}

function CorrectionTab() {
  const [items, setItems] = useState<CorrectionData[]>([]);
  const [status, setStatus] = useState<AuditStatus>("pending");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetch(`/api/admin/corrections?status=${status}`)
      .then((r) => r.json())
      .then((d) => {
        const list = (d.items ?? []) as CorrectionData[];
        setItems(list);
        setDrafts(Object.fromEntries(list.map((i) => [i.id, i.content])));
      })
      .catch(() => setError("加载修正列表失败"));
  }, [status]);

  useEffect(load, [load]);

  async function resolve(id: string, action: "approve" | "reject") {
    setError("");
    setNotice("");
    const res = await fetch(`/api/admin/corrections/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, content: drafts[id] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "操作失败");
      return;
    }
    setNotice(
      action === "approve"
        ? "已通过：修正内容以「修正补充」写入目标文档并重新向量化"
        : "已拒绝该修正",
    );
    load();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">
        班班在百事通使用过程中提交的知识修正。审核内容可直接编辑，通过后将以「修正补充」块写入对应知识文档并重新分块向量化。
      </p>
      <div className="flex gap-2">
        {(Object.keys(AUDIT_STATUS_LABELS) as AuditStatus[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              status === s
                ? "bg-indigo-500 text-white"
                : "bg-white/10 text-slate-300 hover:bg-white/15"
            }`}
          >
            {AUDIT_STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      {error && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          {notice}
        </p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">暂无待审核的修正。</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">目标文档：</span>
              <span className="font-medium text-white">{item.docTitle}</span>
              <span className="text-xs text-slate-500">
                {item.owner} 提交 · {new Date(item.createdAt).toLocaleString()}
              </span>
            </div>
            {item.question && (
              <div className="mt-1.5 rounded-lg bg-black/20 px-3 py-1.5 text-xs text-slate-400">
                关联问题：{item.question}
              </div>
            )}
            <textarea
              value={drafts[item.id] ?? item.content}
              onChange={(e) =>
                setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
              }
              rows={4}
              readOnly={status !== "pending"}
              className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50 read-only:opacity-70"
            />
            {status === "pending" ? (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => resolve(item.id, "approve")}
                  className="rounded-full bg-emerald-400/20 px-4 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-400/30"
                >
                  通过并写入文档
                </button>
                <button
                  type="button"
                  onClick={() => resolve(item.id, "reject")}
                  className="rounded-full border border-rose-400/30 px-4 py-1.5 text-xs text-rose-300 hover:bg-rose-400/10"
                >
                  拒绝
                </button>
              </div>
            ) : (
              <div className="mt-2 text-xs text-slate-500">
                {item.status === "approved" ? "已通过并写入目标文档" : "已拒绝"}
                {item.resolvedAt &&
                  ` · ${new Date(item.resolvedAt).toLocaleString()}`}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ---------- 抽检视图 Tab ----------

function InspectionTab() {
  const [data, setData] = useState<InspectionData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/inspection")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("加载抽检数据失败"));
  }, []);

  if (error) return <p className="text-rose-300">{error}</p>;
  if (!data) return <p className="text-slate-400">加载中…</p>;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-sm font-medium text-slate-200">
          团队高频问题（全员问答统计，共 {data.qaCount} 条）
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.hotTopics.length === 0 && (
            <span className="text-xs text-slate-500">暂无统计数据</span>
          )}
          {data.hotTopics.map((t) => (
            <span
              key={t.label}
              className="rounded-full bg-indigo-500/20 px-3 py-1.5 text-xs text-indigo-200"
            >
              {t.label} · {t.count} 次
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-200">
          对练会话抽检（{data.sessions.length}）
        </h2>
        {data.sessions.length === 0 ? (
          <p className="text-sm text-slate-500">暂无对练记录。</p>
        ) : (
          <div className="space-y-2">
            {data.sessions.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm"
              >
                <div>
                  <span className="text-white">{s.owner}</span>
                  <span className="ml-2 text-slate-400">
                    {s.scenario} · {s.persona}
                  </span>
                  <span className="ml-2 text-xs text-slate-500">
                    {s.messageCount} 条消息 ·{" "}
                    {new Date(s.updatedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {s.score !== null ? (
                    <span className="rounded-full bg-cyan-400/20 px-2.5 py-1 text-cyan-200">
                      {s.score} 分
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-slate-400">
                      未考核
                    </span>
                  )}
                  <Link
                    href={`/train/${s.id}`}
                    className="rounded-full border border-white/15 px-3 py-1 text-slate-200 hover:bg-white/10"
                  >
                    查看
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-200">
          反馈记录（最近 {data.feedback.length} 条）
        </h2>
        {data.feedback.length === 0 ? (
          <p className="text-sm text-slate-500">暂无反馈。</p>
        ) : (
          <div className="space-y-1.5">
            {data.feedback.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400"
              >
                <span
                  className={f.rating === "up" ? "text-emerald-400" : "text-rose-400"}
                >
                  {f.rating === "up" ? "推荐" : "不推荐"}
                </span>
                <span className="ml-2">{f.target === "train" ? "对练" : "百事通"}</span>
                <span className="ml-2">{f.owner ?? "anonymous"}</span>
                <span className="ml-2 text-slate-500">
                  {new Date(f.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-slate-200">
          最近问答（{data.recentQa.length}）
        </h2>
        {data.recentQa.length === 0 ? (
          <p className="text-sm text-slate-500">暂无问答记录。</p>
        ) : (
          <div className="space-y-1.5">
            {data.recentQa.map((q) => (
              <div
                key={q.id}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"
              >
                <span className="text-slate-200">{q.question}</span>
                <span className="ml-2 text-slate-500">
                  {q.owner} · {new Date(q.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
