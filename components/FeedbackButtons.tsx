"use client";

import { useState } from "react";

export function FeedbackButtons(props: {
  target: "train" | "baishitong";
  sessionId?: string;
  messageId?: string;
}) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(next: "up" | "down") {
    if (pending || rating) return;
    setPending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: props.target,
          sessionId: props.sessionId,
          messageId: props.messageId,
          rating: next,
        }),
      });
      if (res.ok) setRating(next);
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
      {rating && <span className="text-slate-500">已记录</span>}
    </div>
  );
}
