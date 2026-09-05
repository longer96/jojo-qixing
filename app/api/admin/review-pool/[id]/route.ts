import { resolveReviewItem } from "@/lib/reviewPool";
import { KNOWLEDGE_CATEGORIES, type KnowledgeCategory } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      action?: "approve" | "reject";
      category?: string;
    };
    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json({ error: "无效操作" }, { status: 400 });
    }
    if (
      body.category !== undefined &&
      !(body.category in KNOWLEDGE_CATEGORIES)
    ) {
      return NextResponse.json({ error: "无效分类" }, { status: 400 });
    }
    const item = await resolveReviewItem(
      id,
      body.action,
      body.category as KnowledgeCategory | undefined,
    );
    if (!item) {
      return NextResponse.json(
        { error: "审核项不存在或已处理" },
        { status: 404 },
      );
    }
    return NextResponse.json({ item });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "审核处理失败" }, { status: 500 });
  }
}
