"use client";

import { getIdentity, subscribeIdentity } from "./identity";
import { useState, useSyncExternalStore } from "react";

/**
 * 监听「使用过程中身份被清除」：一旦从有身份变为无身份即返回 true（并保持）。
 * 用于立即终止正在进行的功能（对练、问答），已有服务端记录不受影响。
 */
export function useIdentityCleared(): boolean {
  const identity = useSyncExternalStore(subscribeIdentity, getIdentity, () => "");
  const [state, setState] = useState({ prev: identity, cleared: false });
  if (state.prev !== identity) {
    setState({
      prev: identity,
      cleared:
        state.cleared || (state.prev !== "" && identity === ""),
    });
  }
  return state.cleared;
}
