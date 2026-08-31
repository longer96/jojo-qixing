# 启星AI · 首席内训官 — 项目说明文档

> 对应方案：《运营星大脑：启星AI三阶段赋能体系构建决赛方案》  
> 当前实现范围：**第一阶段（0–6 个月）— 首席内训官**

---

## 1. 产品是什么

启星AI 不是单一聊天机器人，而是面向叫叫运营「班班」的 **全链路能力成长与赋能平台**。

方案中的三阶段定位：

| 阶段 | 时间 | 角色 | 核心能力 |
| --- | --- | --- | --- |
| 第一阶段 | 0–6 个月 | 首席内训官 | 情景模拟、智能考核、百事通 |
| 第二阶段 | 6–12 个月 | 全能协理官 | 实时话术辅助、常规问题托管、用户洞察 |
| 第三阶段 | 12 个月+ | 超级运营官 | 无人化续费、分层自动运营、洞察引擎 |

**本项目已落地第一阶段 MVP**，解决培训痛点：班班上手慢、实战演练成本高、经验难沉淀。

---

## 2. 已实现功能

### 2.1 情景模拟

路径：`/train` → `/train/[sessionId]`

可选场景：

- 炸群控场
- 学触沟通
- 续费转化
- 退费挽单（可再选原因：效果 / 时间 / 价格 / 服务）

可选家长人设：

- 焦虑型、挑剔型、沉默型、捧场型

对练能力：

- AI 扮演家长开场并发起异议
- 班班输入话术进行多轮对练
- 「要个思路提示」（给思路，不直接给完整标准答案）
- 对 AI 回复点「推荐 / 不推荐」

### 2.2 智能考核

路径：`/report/[sessionId]`

结束对练后自动生成报告，维度对齐方案：

1. 沟通流畅度
2. 关键话术命中率
3. 异议处理有效性
4. 情绪稳定性

同时包含：总评、个性化优化建议、示范改写。

### 2.3 百事通

路径：`/baishitong`

内置知识（`content/knowledge/`）：

- 开班欢迎与炸群应对框架
- 学触节点话术原则
- 续费价值传递结构
- 退费挽单四因应对
- 敏感表达注意事项

支持即问即答，并尽量标注参考依据。

### 2.4 历史与反馈闭环

路径：`/history`

- 查看历史对练会话与考核结果
- 查看「推荐 / 不推荐」反馈记录

---

## 3. 页面与路由

| 路径 | 说明 |
| --- | --- |
| `/` | 首页与产品入口 |
| `/train` | 场景 / 人设选择 |
| `/train/[sessionId]` | 对练聊天室 |
| `/report/[sessionId]` | 考核报告 |
| `/baishitong` | 百事通问答 |
| `/history` | 历史会话与反馈 |

主要 API：

| 接口 | 作用 |
| --- | --- |
| `POST /api/train/start` | 创建对练会话 |
| `POST /api/train/chat` | 家长角色对话 |
| `POST /api/train/hint` | 教练思路提示 |
| `POST /api/train/evaluate` | 生成考核报告 |
| `POST /api/baishitong/chat` | 百事通问答 |
| `POST /api/feedback` | 提交推荐/不推荐 |
| `GET /api/sessions` | 会话列表 |
| `GET /api/sessions/[id]` | 会话详情 |

---

## 4. 启动与局域网访问

### 4.1 安装依赖并配置密钥

```bash
cd /Users/jojo/Desktop/ai/lsj
npm install
cp .env.example .env.local
```

编辑 `.env.local`，至少填写：

```bash
AI_API_KEY=你的密钥
```

未配置密钥时：

- 页面顶部会出现 **黄色提示横幅**
- 调用对话 / 考核 / 百事通接口会返回明确错误，不会静默失败

### 4.2 推荐：生产模式（适合局域网分享）

```bash
npm run build
npm run start
```

- 本机：http://localhost:3000  
- 局域网：http://\<你的电脑局域网IP\>:3000  

服务已绑定 `0.0.0.0:3000`，同 Wi-Fi 设备可访问。

查看本机局域网 IP（macOS）：

```bash
ipconfig getifaddr en0
# 或
ifconfig | grep "inet "
```

### 4.3 开发模式

```bash
npm run dev
```

注意：Next.js 开发模式默认拦截非 localhost 的跨域开发资源。  
若用局域网 IP 打开出现 **「页面能开、按钮点不动」**，请在 `next.config.ts` 的 `allowedDevOrigins` 中加入你的 IP，然后重启：

```ts
allowedDevOrigins: [
  "10.130.31.165", // 改成你的局域网 IP
  "127.0.0.1",
  "localhost",
],
```

**局域网演示请优先使用生产模式（`npm run start`）。**

### 4.4 演示模式（不调真实大模型）

```bash
MOCK_AI=1 npm run start
# 或
MOCK_AI=1 npm run dev
```

---

## 5. AI 接口配置（环境变量）

密钥 **不得** 写进源代码。统一通过环境变量配置，读取逻辑在 `lib/xai.ts`。

### 5.1 变量说明

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `AI_API_KEY` | **是** | 无 | 网关 Bearer Token |
| `AI_API_BASE_URL` | 否 | `https://token.xjjj.co/v1` | OpenAI 兼容网关 |
| `AI_MODEL` | 否 | `Qwen3.8-27B-dflash2` | 默认对话模型 |
| `MOCK_AI` | 否 | 关闭 | 设为 `1` 时使用本地模拟回复 |

兼容别名：也支持 `OPENAI_API_KEY` / `OPENAI_BASE_URL`。

回退模型顺序（代码内置）：`AI_MODEL` → `qwen3.8-flash` → `Qwen3.8-27B`

说明：

- 原模型 `Qwen3.8-27B` 在网关侧曾出现长时间无响应，因此默认使用 `Qwen3.8-27B-dflash2`
- 请求会关闭 thinking（`enable_thinking: false`），降低延迟
- 修改 `.env.local` 后需重启（生产模式需重新 `build && start`）

### 5.2 本地文件约定

| 文件 | 是否提交 Git | 用途 |
| --- | --- | --- |
| `.env.example` | ✅ 提交 | 模板，无真实密钥 |
| `.env.local` | ❌ 忽略 | 本机真实配置 |
| `.env` / `.env.production` | ❌ 忽略 | 可选环境覆盖 |

### 5.3 未配置 Key 时的表现

1. 全站顶部黄色横幅：提示如何复制 `.env.example` → `.env.local` 并填写 `AI_API_KEY`
2. API 返回类似：`未配置 AI_API_KEY。请复制 .env.example 为 .env.local...`
3. 若设置 `MOCK_AI=1`，则显示蓝色演示横幅，可用模拟回复体验流程

### 5.4 手工探测上游

```bash
curl https://token.xjjj.co/v1/chat/completions \
  -H "Authorization: Bearer <你的key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3.8-27B-dflash2",
    "messages": [{"role":"user","content":"只回ok"}],
    "temperature": 0.7,
    "enable_thinking": false
  }'
```

### 5.5 推送到 GitHub

```bash
# 1. 确认本地有 .env.local，且未被 git 跟踪
git status
git check-ignore -v .env.local

# 2. 确认代码中没有硬编码密钥
git grep -n "sk-" -- ':!.env.example' || echo "未发现 sk- 硬编码"

# 3. 正常提交推送
git add .
git commit -m "..."
git push
```

协作同事克隆后只需：

```bash
cp .env.example .env.local
# 填入自己的 AI_API_KEY
npm install && npm run build && npm run start
```

---

## 6. 使用流程（给班班）

1. 打开首页，点击 **开始情景模拟**  
2. 选择场景与家长人设（退费场景再选原因）  
3. 点击 **开始对练**，进入聊天室  
4. 按真实沟通方式回复家长；卡住时可点 **要个思路提示**  
5. 练够轮次后点 **结束对练并考核**  
6. 查看四维分数、建议与示范改写  
7. 日常业务疑问可去 **百事通** 提问  
8. 在 **历史与反馈** 回看练习记录

---

## 7. 目录结构

```text
lsj/
├── app/                      # 页面与 API 路由
│   ├── api/                  # 后端接口
│   ├── train/                # 情景模拟
│   ├── report/               # 考核报告
│   ├── baishitong/           # 百事通
│   └── history/              # 历史与反馈
├── components/               # 通用 UI 组件（含 ConfigBanner）
├── content/knowledge/        # 百事通种子知识
├── docs/                     # 项目文档（本文件）
├── lib/
│   ├── xai.ts                # AI 环境变量读取与调用封装
│   ├── prompts.ts            # 系统提示词
│   ├── sessions.ts           # 会话/反馈存储
│   ├── knowledge.ts          # 知识检索
│   └── types.ts              # 类型与场景枚举
├── .env.example              # 环境变量模板（可提交）
├── .env.local                # 本机密钥（不可提交）
├── .data/                    # 本地会话数据（运行后生成，已忽略提交）
├── next.config.ts            # Next 配置（含局域网白名单）
├── package.json
├── README.md
└── 运营星大脑：启星AI三阶段赋能体系构建决赛方案.pptx
```

---

## 8. 数据存储

- 对练会话、考核报告、反馈记录保存在项目根目录 `.data/`  
- 文件示例：`.data/sessions.json`、`.data/feedback.json`  
- 该目录已加入 `.gitignore`，不会提交到 Git  
- 清空练习数据：删除 `.data/` 后重启服务即可

---

## 9. 常见问题

### Q1：局域网打开后按钮点不动，本地正常？

原因：开发模式跨域拦截。  
处理：改用 `npm run build && npm run start`，或给 `allowedDevOrigins` 加 IP。

### Q2：页面顶部有黄色「尚未配置 AI 密钥」提示？

说明未检测到 `AI_API_KEY`。按横幅步骤创建 `.env.local` 并重启服务。

### Q3：能进页面，但一直对话失败 / 很久没回复？

1. 先确认不是「未配置 Key」问题（见上）  
2. 测网关是否可用（见第 5 节 curl）  
3. 在 `.env.local` 把 `AI_MODEL` 改成 `qwen3.8-flash` 后重启  
4. 看终端与页面错误信息  

### Q4：手机打不开局域网地址？

1. 确认手机与电脑同一 Wi-Fi  
2. 确认服务已 `start` 且绑定 `0.0.0.0`  
3. 检查 Mac 防火墙是否拦截 3000 端口  
4. IP 变更后需重新查看并更新访问地址 / `allowedDevOrigins`

### Q5：如何换成真实叫叫话术库？

替换或补充 `content/knowledge/` 下的 Markdown 文件，重启服务即可被百事通检索使用。

---

## 10. 明确未做（后续阶段）

以下内容在方案中有规划，**本 MVP 未实现**：

- 实时话术侧边栏辅助、敏感词预警  
- 常规问题 AI 托管、用户洞察看板  
- AI 独立续费 / 分层自动运营  
- 语音对练  
- 主管抽检后台、企业账号体系  
- 对接 Coze / 豆包现有 Bot

---

## 11. 验收自检清单

- [ ] 已配置 `.env.local`，且未提交到 Git  
- [ ] 未配置 Key 时首页有黄色提示  
- [ ] 配置 Key 后横幅变为绿色「已接入模型」  
- [ ] `npm run build && npm run start` 成功  
- [ ] 本机可打开首页  
- [ ] 局域网设备可打开同一地址  
- [ ] 情景模拟可选场景并进入对练  
- [ ] 对练至少一轮后可生成考核报告  
- [ ] 百事通能回答「退费挽单怎么挖原因」类问题  
- [ ] 推荐/不推荐可提交，并在历史页看到  

---

## 12. 版本信息

| 项 | 内容 |
| --- | --- |
| 项目名 | qixing-ai |
| 技术栈 | Next.js 16 + TypeScript + Tailwind |
| 阶段 | 第一阶段 MVP |
| 文档更新 | 2026-08-31 |

如需继续做第二阶段（实时辅助 / 用户洞察），可在本项目基础上迭代，无需推倒重来。
