import {
  createKnowledgeDoc,
  listKnowledgeDocs,
} from "@/lib/knowledge";
import { KNOWLEDGE_CATEGORIES, type KnowledgeCategory } from "@/lib/types";
import { NextResponse } from "next/server";

function serialize(doc: Awaited<ReturnType<typeof listKnowledgeDocs>>[number]) {
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    enabled: doc.enabled,
    source: doc.source,
    chunkCount: doc.chunks.length,
    vectorCount: doc.chunks.filter((c) => c.vector).length,
    content: doc.chunks.map((c) => c.text).join("\n\n"),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function GET() {
  const docs = await listKnowledgeDocs();
  return NextResponse.json({ docs: docs.map(serialize) });
}

/** 直接以文本新建知识文档（管理后台手动录入） */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      title?: string;
      category?: string;
      content?: string;
    };
    const category = body.category as KnowledgeCategory;
    if (!category || !(category in KNOWLEDGE_CATEGORIES)) {
      return NextResponse.json({ error: "无效分类" }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
    }
    const doc = await createKnowledgeDoc({
      title: body.title?.trim() || "未命名文档",
      category,
      source: "upload",
      content: body.content,
    });
    return NextResponse.json({ doc: serialize(doc) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "创建文档失败" }, { status: 500 });
  }
}
