import { promises as fs } from "fs";
import path from "path";

/** 本地 JSON 文件存储的共享基建：串行写队列 + 原子写 */
export const DATA_DIR = path.join(process.cwd(), ".data");

let queue: Promise<unknown> = Promise.resolve();

/** 进程内串行队列：所有「读-改-写」操作排队执行，避免并发覆盖 */
export function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => undefined);
  return next;
}

export async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** 原子写：先写临时文件再 rename，避免写一半进程中断导致 JSON 损坏 */
export async function writeJsonAtomic(file: string, data: unknown) {
  await ensureDataDir();
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}
