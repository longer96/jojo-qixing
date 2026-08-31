export type ScenarioId = "zhaqun" | "xuechu" | "xufei" | "tuifei";

export type ParentPersona = "焦虑型" | "挑剔型" | "沉默型" | "捧场型";

export type RefundReason = "效果" | "时间" | "价格" | "服务";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: Exclude<ChatRole, "system">;
  content: string;
  createdAt: string;
}

export interface TrainSession {
  id: string;
  scenarioId: ScenarioId;
  persona: ParentPersona;
  refundReason?: RefundReason;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  status: "active" | "evaluated";
  report?: EvaluationReport;
}

export interface ScoreDimension {
  name: string;
  score: number;
  comment: string;
}

export interface EvaluationReport {
  overallScore: number;
  dimensions: ScoreDimension[];
  suggestions: string[];
  rewrites: { original: string; improved: string; reason: string }[];
  summary: string;
  generatedAt: string;
}

export interface FeedbackItem {
  id: string;
  target: "train" | "baishitong";
  sessionId?: string;
  messageId?: string;
  rating: "up" | "down";
  note?: string;
  createdAt: string;
}

export const SCENARIOS: Record<
  ScenarioId,
  { id: ScenarioId; name: string; description: string; tips: string }
> = {
  zhaqun: {
    id: "zhaqun",
    name: "炸群控场",
    description: "开班关键节点家长集中提出异议，训练控场、沟通思路与话术。",
    tips: "先安抚情绪，再统一回应共性问题，最后一对一跟进。",
  },
  xuechu: {
    id: "xuechu",
    name: "学触沟通",
    description: "学情触达中处理家长疑问与焦虑，练习价值传递与预期管理。",
    tips: "用具体学习证据说话，给出可执行的下一步。",
  },
  xufei: {
    id: "xufei",
    name: "续费转化",
    description: "续费 RP 场景中传递长期价值，处理价格/效果等异议。",
    tips: "先共鸣再挖需求，最后用成果与规划闭环。",
  },
  tuifei: {
    id: "tuifei",
    name: "退费挽单",
    description: "家长因效果、时间、价格或服务申请退费，练习原因挖掘与挽单。",
    tips: "先挖真因，再管理预期，提供可接受的替代方案。",
  },
};

export const PERSONAS: ParentPersona[] = [
  "焦虑型",
  "挑剔型",
  "沉默型",
  "捧场型",
];

export const REFUND_REASONS: RefundReason[] = [
  "效果",
  "时间",
  "价格",
  "服务",
];
