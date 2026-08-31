import { NextResponse } from "next/server";
import { getSession } from "@/lib/sessions";

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
