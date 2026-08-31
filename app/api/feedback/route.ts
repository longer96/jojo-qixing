import { NextResponse } from "next/server";
import { addFeedback, readFeedback } from "@/lib/sessions";

export async function GET() {
  const feedback = await readFeedback();
  return NextResponse.json({ feedback });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      target?: "train" | "baishitong";
      sessionId?: string;
      messageId?: string;
      rating?: "up" | "down";
      note?: string;
    };

    if (!body.target || !body.rating) {
      return NextResponse.json({ error: "缺少必要字段" }, { status: 400 });
    }
    if (body.rating !== "up" && body.rating !== "down") {
      return NextResponse.json({ error: "rating 无效" }, { status: 400 });
    }

    const item = await addFeedback({
      target: body.target,
      sessionId: body.sessionId,
      messageId: body.messageId,
      rating: body.rating,
      note: body.note,
    });

    return NextResponse.json({ item });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "反馈提交失败" }, { status: 500 });
  }
}
