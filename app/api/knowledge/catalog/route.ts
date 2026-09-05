import { getKnowledgeCatalog } from "@/lib/knowledge";
import { NextResponse } from "next/server";

/** 公开知识目录（id/标题/分类），前端展示引用来源用 */
export async function GET() {
  const catalog = await getKnowledgeCatalog();
  return NextResponse.json({ catalog });
}
