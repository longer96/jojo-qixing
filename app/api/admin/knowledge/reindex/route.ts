import { reindexKnowledgeEmbeddings } from "@/lib/knowledge";
import { NextResponse } from "next/server";

/** 为缺失向量的分块重建 Embedding（网关恢复可用后手动触发） */
export async function POST() {
  try {
    const result = await reindexKnowledgeEmbeddings();
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "重建向量失败" }, { status: 500 });
  }
}
