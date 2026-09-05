"use client";

import { userHeaders } from "@/lib/identity";
import { useState } from "react";

export function FeedbackButtons(props: {
  target: "train" | "baishitong";
  sessionId?: string;
  messageId?: string;
}) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(next: "up" | "down") {
    if (pending || rating) return;
    setPending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...userHeaders() },
        body: JSON.stringify({
          target: props.target,
          sessionId: props.sessionId,
          messageId: props.messageId,
          rating: next,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.skipped) setSkipped(true);
        setRating(next);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
      <span>这条有帮助吗？</span>
      <button
        type="button"
        disabled={pending || !!rating}
        onClick={() => submit("up")}
        className={`rounded px-1.5 py-0.5 transition hover:bg-white/10 ${
          rating === "up" ? "text-emerald-400" : ""
        }`}
      >
        推荐
      </button>
      <button
        type="button"
        disabled={pending || !!rating}
        onClick={() => submit("down")}
        className={`rounded px-1.5 py-0.5 transition hover:bg-white/10 ${
          rating === "down" ? "text-rose-400" : ""
        }`}
      >
        不推荐
      </button>
      {rating && !skipped && <span className="text-slate-500">已记录</span>}
      {rating && skipped && (
        <span className="text-amber-400/80">未设置身份，未保留</span>
      )}
    </div>
  );
}
