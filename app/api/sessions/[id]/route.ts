import { NextResponse } from "next/server";
import { deleteSession, getSession } from "@/lib/sessions";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }
  return NextResponse.json({ session });
}

/** 「这局不算，重来」：仅允许删除未考核的会话 */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ok = await deleteSession(id);
  if (!ok) {
    return NextResponse.json(
      { error: "会话不存在或已完成考核，不可删除" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
