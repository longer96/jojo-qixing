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
  /** 会话归属人（昵称/工号），缺省视为 anonymous */
  owner?: string;
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
  /** 反馈提交人（昵称/工号），缺省视为 anonymous */
  owner?: string;
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

// ============ 知识库体系（阶段B） ============

export type KnowledgeCategory =
  | "zhaqun"
  | "xuechu"
  | "xufei"
  | "tuifei"
  | "sop"
  | "product"
  | "cases";

export const KNOWLEDGE_CATEGORIES: Record<
  KnowledgeCategory,
  { id: KnowledgeCategory; label: string }
> = {
  zhaqun: { id: "zhaqun", label: "炸群控场" },
  xuechu: { id: "xuechu", label: "学触沟通" },
  xufei: { id: "xufei", label: "续费转化" },
  tuifei: { id: "tuifei", label: "退费挽单" },
  sop: { id: "sop", label: "服务SOP" },
  product: { id: "product", label: "产品知识" },
  cases: { id: "cases", label: "优秀案例" },
};

export const KNOWLEDGE_CATEGORY_LIST = Object.values(KNOWLEDGE_CATEGORIES);

export interface KnowledgeChunk {
  id: string;
  text: string;
  /** Embedding 向量；网关不支持或未生成时缺省，检索自动降级为关键词 */
  vector?: number[];
}

export type KnowledgeSource = "seed" | "upload" | "feedback";

export interface KnowledgeDoc {
  id: string;
  title: string;
  category: KnowledgeCategory;
  enabled: boolean;
  source: KnowledgeSource;
  chunks: KnowledgeChunk[];
  createdAt: string;
  updatedAt: string;
}

/** 检索命中的知识片段（chunk 级） */
export interface RetrievedChunk {
  docId: string;
  docTitle: string;
  category: KnowledgeCategory;
  text: string;
  score: number;
}

/** 百事通问答历史（按用户沉淀，用于个性化与高频统计） */
export interface QaRecord {
  id: string;
  owner: string;
  question: string;
  answer: string;
  knowledgeDocIds: string[];
  createdAt: string;
}

/** 待审核池：被「推荐」的优质回答，管理员确认后沉淀进知识库 */
export interface ReviewItem {
  id: string;
  qaId: string;
  question: string;
  answer: string;
  owner: string;
  status: "pending" | "approved" | "rejected";
  category?: KnowledgeCategory;
  createdAt: string;
  resolvedAt?: string;
}

/** 知识修正：班班在使用百事通时提交的纠错/补充，管理员审核通过后写入对应文档 */
export interface CorrectionItem {
  id: string;
  docId: string;
  /** 提交时目标文档标题快照 */
  docTitle: string;
  owner: string;
  /** 关联的问答（可选） */
  qaId?: string;
  question?: string;
  /** 修正内容（管理员审核时可编辑） */
  content: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string;
}
