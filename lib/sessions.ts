import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type {
  EvaluationReport,
  FeedbackItem,
  ParentPersona,
  RefundReason,
  ScenarioId,
  TrainSession,
} from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

type Store = Record<string, TrainSession>;

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(SESSIONS_FILE, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

async function writeStore(store: Store) {
  await ensureDataDir();
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(store, null, 2), "utf8");
}

export async function createSession(input: {
  scenarioId: ScenarioId;
  persona: ParentPersona;
  refundReason?: RefundReason;
}): Promise<TrainSession> {
  const store = await readStore();
  const now = new Date().toISOString();
  const session: TrainSession = {
    id: randomUUID(),
    scenarioId: input.scenarioId,
    persona: input.persona,
    refundReason: input.refundReason,
    messages: [],
    createdAt: now,
    updatedAt: now,
    status: "active",
  };
  store[session.id] = session;
  await writeStore(store);
  return session;
}

export async function getSession(id: string): Promise<TrainSession | null> {
  const store = await readStore();
  return store[id] ?? null;
}

export async function listSessions(): Promise<TrainSession[]> {
  const store = await readStore();
  return Object.values(store).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function saveSession(session: TrainSession): Promise<TrainSession> {
  const store = await readStore();
  session.updatedAt = new Date().toISOString();
  store[session.id] = session;
  await writeStore(store);
  return session;
}

export async function appendMessage(
  sessionId: string,
  message: { role: "user" | "assistant"; content: string },
): Promise<TrainSession | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  session.messages.push({
    id: randomUUID(),
    role: message.role,
    content: message.content,
    createdAt: new Date().toISOString(),
  });
  return saveSession(session);
}

export async function saveReport(
  sessionId: string,
  report: EvaluationReport,
): Promise<TrainSession | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  session.report = report;
  session.status = "evaluated";
  return saveSession(session);
}

export async function readFeedback(): Promise<FeedbackItem[]> {
  try {
    const raw = await fs.readFile(FEEDBACK_FILE, "utf8");
    return JSON.parse(raw) as FeedbackItem[];
  } catch {
    return [];
  }
}

export async function addFeedback(
  item: Omit<FeedbackItem, "id" | "createdAt">,
): Promise<FeedbackItem> {
  const list = await readFeedback();
  const row: FeedbackItem = {
    ...item,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  list.unshift(row);
  await ensureDataDir();
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(list, null, 2), "utf8");
  return row;
}
