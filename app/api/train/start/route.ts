import { NextResponse } from "next/server";
import { getPersona, getSceneFit, hasPersona } from "@/lib/personas";
import { createSession } from "@/lib/sessions";
import { getRequestUser } from "@/lib/user";
import {
  REFUND_REASONS,
  SCENARIOS,
  type RefundReason,
  type ScenarioId,
  type TrainDifficulty,
} from "@/lib/types";

const DIFFICULTIES: TrainDifficulty[] = ["novice", "skilled", "master"];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      scenarioId?: string;
      personaId?: string;
      refundReason?: string;
      difficulty?: string;
      viewedTips?: boolean;
    };

    const scenarioId = body.scenarioId as ScenarioId;
    const refundReason = body.refundReason as RefundReason | undefined;
    const difficulty = (body.difficulty ?? "skilled") as TrainDifficulty;

    if (!scenarioId || !(scenarioId in SCENARIOS)) {
      return NextResponse.json({ error: "无效场景" }, { status: 400 });
    }
    if (!body.personaId || !hasPersona(body.personaId)) {
      return NextResponse.json({ error: "无效人设" }, { status: 400 });
    }
    if (!DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json({ error: "无效难度" }, { status: 400 });
    }
    if (
      scenarioId === "tuifei" &&
      refundReason &&
      !REFUND_REASONS.includes(refundReason)
    ) {
      return NextResponse.json({ error: "无效退费原因" }, { status: 400 });
    }

    // 场景 × 人设 适配约束：block 拒绝开局，warn 放行但打非典型标记
    const persona = getPersona(body.personaId);
    const fit = getSceneFit(persona, scenarioId);
    if (fit.level === "block") {
      return NextResponse.json(
        { error: fit.reason ?? "该人设不适合此场景" },
        { status: 400 },
      );
    }

    const session = await createSession({
      scenarioId,
      persona: persona.id,
      refundReason: scenarioId === "tuifei" ? refundReason ?? "效果" : undefined,
      difficulty,
      atypical: fit.level === "warn",
      viewedTips: Boolean(body.viewedTips),
      owner: getRequestUser(req),
    });

    return NextResponse.json({ session });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "创建会话失败" }, { status: 500 });
  }
}
