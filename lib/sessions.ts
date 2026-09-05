import { randomUUID } from "crypto";
import path from "path";
import { DATA_DIR, readJson, withLock, writeJsonAtomic } from "./fileStore";
import type {
  EvaluationReport,
  FeedbackItem,
  ParentPersona,
  RefundReason,
  ScenarioId,
  TrainSession,
} from "./types";

const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const FEEDBACK_FILE = path.join(DATA_DIR, "feedback.json");

type Store = Record<string, TrainSession>;

function readStore(): Promise<Store> {
  return readJson<Store>(SESSIONS_FILE, {});
}

function writeStore(store: Store) {
  return writeJsonAtomic(SESSIONS_FILE, store);
}

export async function createSession(input: {
  scenarioId: ScenarioId;
  persona: ParentPersona;
  refundReason?: RefundReason;
  owner?: string;
}): Promise<TrainSession> {
  return withLock(async () => {
    const store = await readStore();
    const now = new Date().toISOString();
    const session: TrainSession = {
      id: randomUUID(),
      owner: input.owner,
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
  });
}

export async function getSession(id: string): Promise<TrainSession | null> {
  const store = await readStore();
  return store[id] ?? null;
}

export async function listSessions(owner?: string): Promise<TrainSession[]> {
  const store = await readStore();
  return Object.values(store)
    .filter((s) => owner === undefined || (s.owner ?? "anonymous") === owner)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveSession(session: TrainSession): Promise<TrainSession> {
  return withLock(async () => {
    const store = await readStore();
    session.updatedAt = new Date().toISOString();
    store[session.id] = session;
    await writeStore(store);
    return session;
  });
}

export async function appendMessage(
  sessionId: string,
  message: { role: "user" | "assistant"; content: string },
): Promise<TrainSession | null> {
  return withLock(async () => {
    const store = await readStore();
    const session = store[sessionId];
    if (!session) return null;
    session.messages.push({
      id: randomUUID(),
      role: message.role,
      content: message.content,
      createdAt: new Date().toISOString(),
    });
    session.updatedAt = new Date().toISOString();
    await writeStore(store);
    return session;
  });
}

export async function saveReport(
  sessionId: string,
  report: EvaluationReport,
): Promise<TrainSession | null> {
  return withLock(async () => {
    const store = await readStore();
    const session = store[sessionId];
    if (!session) return null;
    session.report = report;
    session.status = "evaluated";
    session.updatedAt = new Date().toISOString();
    await writeStore(store);
    return session;
  });
}

export async function readFeedback(owner?: string): Promise<FeedbackItem[]> {
  const list = await readJson<FeedbackItem[]>(FEEDBACK_FILE, []);
  if (owner === undefined) return list;
  return list.filter((f) => (f.owner ?? "anonymous") === owner);
}

export async function addFeedback(
  item: Omit<FeedbackItem, "id" | "createdAt">,
): Promise<FeedbackItem> {
  return withLock(async () => {
    const list = await readJson<FeedbackItem[]>(FEEDBACK_FILE, []);
    const row: FeedbackItem = {
      ...item,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    list.unshift(row);
    await writeJsonAtomic(FEEDBACK_FILE, list);
    return row;
  });
}
