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
cp .env.example .env.local
# 编辑 .env.local，填写 AI_API_KEY=你的密钥
npm run build
npm run start
```

- 本机：http://localhost:3000  
- 局域网：`http://<你的局域网IP>:3000`（已绑定 `0.0.0.0`）

> 未配置 `AI_API_KEY` 时，页面顶部会显示黄色提示，对话接口也会返回明确错误。  
> 局域网请优先用生产模式（`npm run start`）。开发模式需配置 `allowedDevOrigins`。

临时本地演示（不调真实模型）：

```bash
MOCK_AI=1 npm run start
```

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `AI_API_KEY` | 是 | 网关密钥，放在 `.env.local`，不要提交到 Git |
| `AI_API_BASE_URL` | 否 | 默认 `https://token.xjjj.co/v1` |
| `AI_MODEL` | 否 | 默认 `Qwen3.8-27B-dflash2` |
| `MOCK_AI` | 否 | 设为 `1` 启用本地模拟回复 |

`.env*` 已在 `.gitignore` 中忽略；仅 `.env.example` 会提交。

## 推送到 GitHub 前检查

- [ ] 确认没有提交 `.env.local`
- [ ] 代码中无硬编码 `sk-...` 密钥
- [ ] README / 文档中的密钥说明仅为占位符

```bash
# 自检：不应搜到真实 sk-
git grep -n "sk-" -- ':!.env.example' ':!docs' || true
```

## 技术栈

- Next.js App Router + TypeScript + Tailwind
- OpenAI 兼容 Chat Completions 网关
- 会话与反馈落盘在 `.data/`（已 gitignore）

## 目录要点

```
app/                 页面与 API
components/          UI 组件（含未配置 Key 提示横幅）
content/knowledge/   百事通种子知识
docs/                项目文档
lib/                 类型、提示词、会话、AI 封装
.env.example         环境变量模板
```

## 说明

本仓库仅实现 PPT 中的 **第一阶段（0-6 个月 · 首席内训官）**。实时话术辅助、用户洞察看板、无人化续费等属于后续阶段。
