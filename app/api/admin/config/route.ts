import { getAiConfigStatus } from "@/lib/xai";
import { NextResponse } from "next/server";

/** 管理后台查看当前模型/网关配置（内部信息，不在前台展示） */
export async function GET() {
  const status = getAiConfigStatus();
  return NextResponse.json({
    kind: status.kind,
    model: "model" in status ? status.model : undefined,
    baseUrl: "baseUrl" in status ? status.baseUrl : undefined,
  });
}
