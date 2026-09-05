import { deleteKnowledgeDoc, updateKnowledgeDoc } from "@/lib/knowledge";
import { KNOWLEDGE_CATEGORIES, type KnowledgeCategory } from "@/lib/types";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      title?: string;
      category?: string;
      enabled?: boolean;
      content?: string;
    };
    if (
      body.category !== undefined &&
      !(body.category in KNOWLEDGE_CATEGORIES)
    ) {
      return NextResponse.json({ error: "无效分类" }, { status: 400 });
    }
    const doc = await updateKnowledgeDoc(id, {
      title: body.title,
      category: body.category as KnowledgeCategory | undefined,
      enabled: body.enabled,
      content: body.content,
    });
    if (!doc) {
      return NextResponse.json({ error: "文档不存在" }, { status: 404 });
    }
    return NextResponse.json({
      doc: {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        enabled: doc.enabled,
        chunkCount: doc.chunks.length,
        vectorCount: doc.chunks.filter((c) => c.vector).length,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "更新文档失败" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = await deleteKnowledgeDoc(id);
  if (!ok) {
    return NextResponse.json({ error: "文档不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
