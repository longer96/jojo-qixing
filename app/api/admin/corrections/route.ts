import { listCorrections } from "@/lib/corrections";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") as
    | "pending"
    | "approved"
    | "rejected"
    | null;
  const items = await listCorrections(status ?? undefined);
  return NextResponse.json({ items });
}
