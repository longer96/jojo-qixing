import { NextResponse } from "next/server";
import { listSessions } from "@/lib/sessions";
import { getRequestUser, isAnonymousUser } from "@/lib/user";

export async function GET(req: Request) {
  const user = getRequestUser(req);
  // 未设置身份的用户不保留、也不展示历史记录
  if (isAnonymousUser(user)) {
    return NextResponse.json({ sessions: [] });
  }
  const sessions = await listSessions(user);
  return NextResponse.json({ sessions });
}
