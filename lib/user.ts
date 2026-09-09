/**
 * 轻量身份标识（阶段A）：客户端通过请求头携带昵称/工号，
 * 服务端据此做会话与反馈的归属隔离。后续企业微信 OAuth 会替换此机制。
 */
export const USER_HEADER = "x-qixing-user";

export const ANONYMOUS_USER = "anonymous";

export function isAnonymousUser(user: string): boolean {
  return user === ANONYMOUS_USER;
}

export function getRequestUser(req: Request): string {
  const raw = req.headers.get(USER_HEADER)?.trim() ?? "";
  if (!raw) return ANONYMOUS_USER;
  // 客户端对昵称做了 encodeURIComponent（HTTP header 仅允许 ISO-8859-1）
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // 兼容未编码的旧请求头
    decoded = raw;
  }
  // 限制长度并去掉控制字符，避免异常输入写爆存储
  const cleaned = decoded.replace(/[\x00-\x1f]/g, "").slice(0, 32);
  return cleaned || ANONYMOUS_USER;
}
