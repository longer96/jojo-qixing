import { NextResponse } from "next/server";
import { createSession } from "@/lib/sessions";
import {
  PERSONAS,
  REFUND_REASONS,
  SCENARIOS,
  type ParentPersona,
  type RefundReason,
  type ScenarioId,
} from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      scenarioId?: string;
      persona?: string;
      refundReason?: string;
    };

    const scenarioId = body.scenarioId as ScenarioId;
    const persona = body.persona as ParentPersona;
    const refundReason = body.refundReason as RefundReason | undefined;

    if (!scenarioId || !(scenarioId in SCENARIOS)) {
      return NextResponse.json({ error: "无效场景" }, { status: 400 });
    }
    if (!persona || !PERSONAS.includes(persona)) {
      return NextResponse.json({ error: "无效人设" }, { status: 400 });
    }
    if (
      scenarioId === "tuifei" &&
      refundReason &&
      !REFUND_REASONS.includes(refundReason)
    ) {
      return NextResponse.json({ error: "无效退费原因" }, { status: 400 });
    }

    const session = await createSession({
      scenarioId,
      persona,
      refundReason: scenarioId === "tuifei" ? refundReason ?? "效果" : undefined,
    });

    return NextResponse.json({ session });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "创建会话失败" }, { status: 500 });
  }
}
