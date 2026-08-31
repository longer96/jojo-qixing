# 启星AI · 首席内训官（第一阶段 MVP）

基于方案《运营星大脑：启星AI三阶段赋能体系》落地的 **第一阶段 Web 应用**：情景模拟、智能考核、百事通问答、推荐/不推荐反馈闭环。

完整说明见：**[docs/启星AI使用说明.md](./docs/启星AI使用说明.md)**

## 功能

- **情景模拟**：炸群 / 学触 / 续费 / 退费挽单；家长人设：焦虑、挑剔、沉默、捧场
- **智能考核**：沟通流畅度、关键话术命中率、异议处理有效性、情绪稳定性 + 优化建议
- **百事通**：内置 SOP 知识检索问答
- **准确性闭环**：对 AI 回复点推荐 / 不推荐，可在「历史与反馈」查看

## 快速开始

```bash
npm install
npm run build
npm run start
```

本机：[http://localhost:3000](http://localhost:3000)  
局域网：`http://<你的局域网IP>:3000`（已绑定 `0.0.0.0`）

> 局域网请优先用 **生产模式**（`npm run start`）。若用 `npm run dev`，需在 `next.config.ts` 的 `allowedDevOrigins` 里加入你的局域网 IP，否则会出现「页面能开、按钮点不动」。

聊天网关：`https://token.xjjj.co/v1`（密钥写在 `lib/xai.ts`）。  
默认模型：`Qwen3.8-27B-dflash2`（原 `Qwen3.8-27B` 网关侧经常无响应，已内置回退）。

强制演示模式（不走真实接口）：

```bash
MOCK_AI=1 npm run dev
```

## 技术栈

- Next.js App Router + TypeScript + Tailwind
- OpenAI 兼容接口（`token.xjjj.co`）
- 会话与反馈落盘在 `.data/`（已 gitignore）

## 目录要点

```
app/                 页面与 API
components/          UI 组件
content/knowledge/   百事通种子知识
lib/                 类型、提示词、会话、AI 封装
```

## 说明

本仓库仅实现 PPT 中的 **第一阶段（0-6 个月 · 首席内训官）**。实时话术辅助、用户洞察看板、无人化续费等属于后续阶段。
