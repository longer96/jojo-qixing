import { getAiConfigStatus } from "@/lib/xai";

export function ConfigBanner() {
  const status = getAiConfigStatus();

  if (status.kind === "missing_key") {
    return (
      <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
        <p className="font-medium text-amber-100">尚未配置 AI 密钥，对话功能不可用</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-amber-100/90">
          <li>
            复制 <code className="rounded bg-black/20 px-1">.env.example</code> 为{" "}
            <code className="rounded bg-black/20 px-1">.env.local</code>
          </li>
          <li>
            填写 <code className="rounded bg-black/20 px-1">AI_API_KEY=你的密钥</code>
          </li>
          <li>
            执行 <code className="rounded bg-black/20 px-1">npm run build && npm run start</code>{" "}
            重启服务
          </li>
        </ol>
        <p className="mt-2 text-xs text-amber-100/70">
          详细说明见 <code className="rounded bg-black/20 px-1">docs/启星AI使用说明.md</code>
          。也可临时使用 <code className="rounded bg-black/20 px-1">MOCK_AI=1</code>{" "}
          进入本地演示模式。
        </p>
      </div>
    );
  }

  if (status.kind === "mock") {
    return (
      <div className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
        已开启 <code className="mx-1 rounded bg-black/20 px-1">MOCK_AI</code>
        ，当前为本地模拟回复，不会调用真实大模型。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
      已接入模型 <code className="mx-1 rounded bg-black/20 px-1">{status.model}</code>
      <span className="text-emerald-100/70">（{status.baseUrl}）</span>
    </div>
  );
}
