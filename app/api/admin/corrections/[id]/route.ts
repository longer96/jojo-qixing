import { resolveCorrection } from "@/lib/corrections";
import { NextResponse } from "next/server";

/** 审核修正：approve 将修正写入目标文档；reject 仅标记 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      action?: "approve" | "reject";
      content?: string;
    };
    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json({ error: "无效操作" }, { status: 400 });
    }
    const result = await resolveCorrection(id, body.action, body.content);
    if (!result) {
      return NextResponse.json(
        { error: "修正项不存在或已处理" },
        { status: 404 },
      );
    }
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ item: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "审核处理失败" }, { status: 500 });
  }
}
