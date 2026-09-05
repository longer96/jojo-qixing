import { classifyDocument } from "@/lib/classify";
import { extractTextFromFile, isSupportedFile } from "@/lib/fileParsers";
import { createKnowledgeDoc } from "@/lib/knowledge";
import { KNOWLEDGE_CATEGORIES, type KnowledgeCategory } from "@/lib/types";
import { NextResponse } from "next/server";

/**
 * 单文件上传入库：支持 Word/PPT/Excel/PDF/md。
 * category 传 "auto" 或不传时按文件名+内容自动分类。
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const categoryInput = (form.get("category") as string | null)?.trim();
    const titleInput = (form.get("title") as string | null)?.trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }
    if (!isSupportedFile(file.name)) {
      return NextResponse.json(
        { error: "不支持的文件类型（支持 Word/PPT/Excel/PDF/md/txt）" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromFile(file.name, buffer);
    if (!text) {
      return NextResponse.json(
        { error: "未能从文档中解析出文本内容" },
        { status: 400 },
      );
    }

    let category: KnowledgeCategory;
    if (categoryInput && categoryInput !== "auto") {
      if (!(categoryInput in KNOWLEDGE_CATEGORIES)) {
        return NextResponse.json({ error: "无效分类" }, { status: 400 });
      }
      category = categoryInput as KnowledgeCategory;
    } else {
      category = classifyDocument(file.name, text).category;
    }

    const doc = await createKnowledgeDoc({
      title: titleInput || file.name.replace(/\.[^.]+$/, ""),
      category,
      source: "upload",
      content: text,
    });

    return NextResponse.json({
      doc: {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        chunkCount: doc.chunks.length,
        vectorCount: doc.chunks.filter((c) => c.vector).length,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "文档上传解析失败" }, { status: 500 });
  }
}
