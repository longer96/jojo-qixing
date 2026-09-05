import { addCorrection } from "@/lib/corrections";
import { getRequestUser } from "@/lib/user";
import { NextResponse } from "next/server";

/** 班班提交知识修正（百事通使用过程中） */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      docId?: string;
      content?: string;
      qaId?: string;
      question?: string;
    };
    if (!body.docId) {
      return NextResponse.json({ error: "缺少目标文档" }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "修正内容不能为空" }, { status: 400 });
    }
    const result = await addCorrection({
      docId: body.docId,
      owner: getRequestUser(req),
      content: body.content,
      qaId: body.qaId,
      question: body.question?.slice(0, 200),
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ item: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "提交修正失败" }, { status: 500 });
  }
}
