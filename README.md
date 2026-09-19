# 启星AI · 首席内训官（第一阶段 MVP）

基于方案《运营星大脑：启星AI三阶段赋能体系》落地的 **第一阶段 Web 应用**：情景模拟、智能考核、百事通问答、推荐/不推荐反馈闭环。

完整说明见：**[docs/启星AI使用说明.md](./docs/启星AI使用说明.md)**

## 功能

- **情景模拟**：炸群 / 学触 / 续费 / 退费挽单；14 个家长人设（直系/隔代/决策人/学员）带难度星级与场景适配矩阵，提示词按「通用骨架 × 人设卡 × 场景差异」装配
- **智能考核**：沟通流畅度、关键话术命中率、异议处理有效性、情绪稳定性 + 优化建议 + 标准思路对照
- **成长体系**：能力雷达、等级/徽章/连练天数、历史薄弱项记忆施压、高分对局话术蒸馏（`/admin` 一键生成优秀案例草稿）
- **百事通**：内置 SOP 知识检索问答
- **准确性闭环**：对 AI 回复点推荐 / 不推荐，可在「历史与反馈」查看
- **身份隔离**：首次使用提示设置昵称/工号；对练记录与反馈按身份隔离；不设置身份则不保留历史记录；使用中清除身份会立即结束当前功能（记录保留在原身份名下）
- **移动端 H5**：桌面与手机浏览器均可使用
- **知识库体系**（`/admin`）：支持 Word(.docx) / PPT(.pptx) / Excel(.xlsx/.xls) / PDF(.pdf) / md / txt 上传入库，手动新建 / 编辑 / 启停 / 删除，七类分类（炸群/学触/续费/退费/SOP/产品知识/优秀案例）
- **批量导入总入口**（`/admin` 顶部拖拽区）：一次丢入最多 20 个文件，按文件名+内容关键词自动归类到对应知识模块；同名文件重复导入自动覆盖更新，避免重复文档
- **知识修正闭环**：百事通回答下方「修正知识」提交纠错/补充 → `/admin` 修正审核 Tab 编辑审核 → 通过后以「修正补充」块写入目标文档并重新向量化
- **向量检索**：Embedding + 本地向量库，向量与关键词混合打分；网关不支持 embeddings 时自动降级关键词；回答标注引用来源
- **知识自增长**：百事通回答点「推荐」→ 待审核池 → 管理员选分类确认后沉淀进知识库
- **个性化作答**：融合①本人历史考核薄弱项 ②全员高频问题统计 ③知识库检索
- **抽检视图**（`/admin` 第三 Tab）：全量对练会话、反馈记录、高频问题统计（组长/主管闭环）

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
| `AI_API_KEY` | 是 | 网关密钥，放在 `.env.local`，不要提交到 Git（兜底变量名 `OPENAI_API_KEY`） |
| `AI_API_BASE_URL` | 否 | 默认 `https://token.xjjj.co/v1`（兜底变量名 `OPENAI_BASE_URL`） |
| `AI_MODEL` | 否 | 默认 `Qwen3.8-27B-dflash2` |
| `AI_FALLBACK_MODELS` | 否 | 主模型失败时的回退模型链，逗号分隔；自定义 `AI_MODEL` 后默认不回退 |
| `AI_EMBEDDING_MODEL` | 否 | 知识库向量检索的 Embedding 模型，默认 `text-embedding-3-small`；网关不支持时自动降级关键词检索 |
| `MOCK_AI` | 否 | 设为 `1` 启用本地模拟回复 |

`.env*` 已在 `.gitignore` 中忽略；仅 `.env.example` 会提交。

### 切换其他模型 / 网关

本项目走 **OpenAI 兼容 Chat Completions** 协议，更换模型只需改 `.env.local` 三个变量，例如：

```bash
# DeepSeek
AI_API_KEY=sk-你的deepseek密钥
AI_API_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat

# 豆包方舟
AI_API_KEY=你的方舟密钥
AI_API_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
AI_MODEL=doubao-pro-32k
```

改完执行 `npm run build && npm run start` 重启生效。页面顶部绿色横幅会显示当前接入的模型与网关。

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
