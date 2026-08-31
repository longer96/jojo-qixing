import { NextResponse } from "next/server";
import { listSessions } from "@/lib/sessions";

export async function GET() {
  const sessions = await listSessions();
  return NextResponse.json({ sessions });
}
