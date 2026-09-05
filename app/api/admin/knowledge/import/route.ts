import { classifyDocument } from "@/lib/classify";
import { extractTextFromFile, isSupportedFile } from "@/lib/fileParsers";
import { upsertKnowledgeDocByTitle } from "@/lib/knowledge";
import { NextResponse } from "next/server";

interface ImportResult {
  file: string;
  ok: boolean;
  title?: string;
  category?: string;
  mode?: "created" | "updated";
  chunkCount?: number;
  vectorCount?: number;
  error?: string;
}

/**
 * 批量导入总入口：一次丢入多个文件（Word/PPT/Excel/PDF/md），
 * 逐个解析文本 → 按文件名+内容自动分类 → 分块向量化入库。
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }
    if (files.length > 20) {
      return NextResponse.json(
        { error: "单次最多导入 20 个文件" },
        { status: 400 },
      );
    }

    const results: ImportResult[] = [];
    for (const file of files) {
      try {
        if (!isSupportedFile(file.name)) {
          results.push({
            file: file.name,
            ok: false,
            error: "不支持的文件类型（支持 Word/PPT/Excel/PDF/md/txt）",
          });
          continue;
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const text = await extractTextFromFile(file.name, buffer);
        if (!text) {
          results.push({
            file: file.name,
            ok: false,
            error: "未能解析出文本内容",
          });
          continue;
        }
        const { category } = classifyDocument(file.name, text);
        const title = file.name.replace(/\.[^.]+$/, "");
        const { doc, created } = await upsertKnowledgeDocByTitle({
          title,
          category,
          source: "upload",
          content: text,
        });
        results.push({
          file: file.name,
          ok: true,
          title: doc.title,
          category: doc.category,
          mode: created ? "created" : "updated",
          chunkCount: doc.chunks.length,
          vectorCount: doc.chunks.filter((c) => c.vector).length,
        });
      } catch (e) {
        results.push({
          file: file.name,
          ok: false,
          error: e instanceof Error ? e.message : "解析失败",
        });
      }
    }

    return NextResponse.json({
      results,
      succeeded: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "批量导入失败" }, { status: 500 });
  }
}
