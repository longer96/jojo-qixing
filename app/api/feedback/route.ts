import { NextResponse } from "next/server";
import { addToReviewPool } from "@/lib/reviewPool";
import { addFeedback, readFeedback } from "@/lib/sessions";
import { getRequestUser, isAnonymousUser } from "@/lib/user";

export async function GET(req: Request) {
  const user = getRequestUser(req);
  // 未设置身份的用户不保留、也不展示历史记录
  if (isAnonymousUser(user)) {
    return NextResponse.json({ feedback: [] });
  }
  const feedback = await readFeedback(user);
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

    const user = getRequestUser(req);
    // 匿名用户的反馈不持久化（无历史记录）
    if (isAnonymousUser(user)) {
      return NextResponse.json({ skipped: true });
    }

    const item = await addFeedback({
      owner: user,
      target: body.target,
      sessionId: body.sessionId,
      messageId: body.messageId,
      rating: body.rating,
      note: body.note,
    });

    // 准确性闭环第一层：百事通回答被「推荐」→ 进入待审核池
    if (body.target === "baishitong" && body.rating === "up" && body.messageId) {
      await addToReviewPool({ qaId: body.messageId, owner: user });
    }

    return NextResponse.json({ item });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "反馈提交失败" }, { status: 500 });
  }
}
