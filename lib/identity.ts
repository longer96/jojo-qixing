"use client";

/**
 * 客户端身份标识：昵称/工号存 localStorage，所有需要归属隔离的
 * 请求通过 userHeaders() 带上身份头。阶段C将替换为企业微信 OAuth。
 */
const STORAGE_KEY = "qixing.identity";

export function getIdentity(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export const IDENTITY_EVENT = "qixing:identity-changed";

export function setIdentity(name: string) {
  if (typeof window === "undefined") return;
  const value = name.trim().slice(0, 32);
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new Event(IDENTITY_EVENT));
  } catch {
    // localStorage 不可用时静默降级为匿名
  }
}

/**
 * 需要归属隔离的请求统一携带身份头。
 * 必须 encodeURIComponent：HTTP header 仅允许 ISO-8859-1，
 * 中文昵称直接写入会在浏览器抛
 * “字符串包含非ISO-8859-1编码点”。
 */
export function userHeaders(): Record<string, string> {
  const name = getIdentity();
  return name ? { "x-qixing-user": encodeURIComponent(name) } : {};
}

/** 订阅身份变化（含跨标签页 storage 事件），供 useSyncExternalStore 使用 */
export function subscribeIdentity(callback: () => void) {
  window.addEventListener(IDENTITY_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(IDENTITY_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
