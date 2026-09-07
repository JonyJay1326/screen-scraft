# ScreenCraft 大屏配置系统 — 开发约束（Codex Rules）

> 本文件是 Codex 开发本项目的最高行为约束。需求与契约细节以 docs/ 下六份文档为准。
> 使用时将本文件复制到代码仓库根目录（或迁移为 .cursor/rules/*.mdc）。
> 版本：v0.3（与 docs v0.3 配套：分类值域统一、依赖白名单补全、EP 边界定稿、里程碑纪律）。

## 0. 文档权威（最重要）

- 需求基准：`docs/PRD.md`；接口契约：`docs/api.md`（**第 2 章 TypeScript 接口是唯一数据契约**）；技术架构：`docs/architecture.md`；视觉规范：`docs/design.md`；开发节奏与验收：`docs/milestones.md`；组件模板标准样例：`docs/golden-sample.md`；高保真原型：`designs/ui/screencraft-ui/`（含 `UI-SPEC.md`）。
- 开发任何模块前，必须先阅读对应文档章节；文档与你的推断冲突时，**以文档为准**；原型与文档冲突时，**功能以 PRD/api.md 为准，视觉以原型为准**。
- 文档未覆盖的需求，**停下来向用户确认，禁止猜测实现**；确认后将结论回写对应文档。
- PRD 待审清单已全部关闭（v0.3），按文档结论实现即可，不再有「待确认」项。
- 数据模型不另起炉灶：前后端一律使用 `packages/shared` 中的契约类型（源自 api.md §2：ScreenDoc / PageDoc / ComponentDoc / DataBinding / EventDoc / ApiConfigDoc / UserDoc / 各数据协议）。需要修改契约时，先改 api.md，再改 shared，再同步前后端。
- **按 `docs/milestones.md` 顺序推进，一个里程碑一个 commit 序列；未经用户同意不得跨里程碑开发。**

## 1. 工程与技术栈（不得擅改）

- **单仓 pnpm workspace**：`frontend/`（Vue3 SPA）+ `backend/`（NestJS）+ `packages/shared/`（契约与校验器，前后端共用），布局遵循 architecture.md §1 / §2.1 / §3。
- Node ≥ 20 LTS，包管理器 pnpm，TypeScript `strict: true`；禁止滥用 `any`、禁止无理由 `@ts-ignore`。
- Vue 组件一律 `<script setup lang="ts">` Composition API；状态进 Pinia store，不在组件里散落业务状态。

### 1.1 依赖白名单 — 前端（frontend/）

| 依赖 | 用途 |
|---|---|
| vue / vue-router / pinia | 框架三件套 |
| element-plus | 管理端交互组件（弹窗/表单控件/消息提示，见 §3 EP 边界） |
| echarts（5.x） | 全部图表渲染（按需引入） |
| vue-draggable-resizable-gorkys | 画布组件拖拽/缩放 |
| vxe-table | 静态数据表格（动态行列/右键菜单/单元格编辑） |
| codemirror（6）+ @codemirror/lang-sql | API 配置页 SQL 编辑器 |
| axios | HTTP（仅经统一封装实例使用） |
| lucide-vue-next | 图标（图标名与原型 icons.js 一致） |
| html2canvas | 保存时缩略图快照（视频组件用占位图） |
| sass（dev） | 样式 |

> video.js 用于视频文件播放（自定义控制条/三开关）；**jessibuca 为直播流预留，v1 不安装**。

### 1.2 依赖白名单 — 后端（backend/）

| 依赖 | 用途 |
|---|---|
| @nestjs/*（core/common/platform-express/jwt/mongoose/serve-static 等官方包） | 框架 |
| mongoose | MongoDB ODM |
| mysql2 | SQL 生成类数据源（v1 默认 MySQL，只读账号；驱动抽象预留多库） |
| bcrypt | 密码哈希 |
| class-validator / class-transformer | DTO 校验 |
| axios | 外部 API 代理 / 腾讯天气代理 / LLM API 调用 |
| vitest（dev） | 单测（shared 与 backend 必测项见 architecture.md §6） |

> **引入上表之外的任何依赖前必须先征得用户同意。** AI 检索（BM25 关键词匹配、分块、余弦相似度）一律自研轻量实现，不引第三方库；LLM 调用走 axios 直连 OpenAI 兼容接口（BaseURL/Key 可配），不装 openai SDK。

## 2. 接口约定（硬性）

- v1 只使用 **GET / POST**；**禁止 PUT / DELETE**。更新、删除语义走 `POST /xxx/update`、`POST /xxx/delete` 动作路径。
- BaseURL `/api/v1`；鉴权头 `Authorization: Bearer <token>`。
- 统一响应 `{ code: 0, message: 'ok', data }`；错误码遵循 api.md §4，不得自造。
- 前端所有请求必须经过 `frontend/src/api/` 的统一 Axios 封装（baseURL/超时、token 注入、解包 `{code,message,data}`、401 跳登录、统一 ElMessage 报错）；**业务代码禁止直接使用裸 Axios**；封装只暴露 get/post。
- 后端 Controller 的路径、入参、返回字段必须与 api.md §3 一致，字段命名保持驼峰。

## 3. 前端核心机制

- **组件模板注册表是核心**（architecture.md §2.3，标准样例见 `docs/golden-sample.md`）：
  - 新增组件变体 = 新增一条注册记录（meta + styleSchema + 默认样式 + 默认数据 + 渲染器），**禁止为单个组件改编辑器主流程**。
  - 样式设置面板由 `styleSchema` 声明式生成，禁止逐组件手写表单。
  - 静态数据表格按 `dataProtocol` 生成表头与默认行（vxe-table，支持动态加行加列、右键菜单）。
  - 变体即独立组件：不同样式变体是不同模板，不做"同组件换皮"。
  - **量产变体时严格照抄 golden-sample.md 的结构与字段命名**，先做 1 个交用户验收，通过后再按族批量生成。
- 编辑器状态集中在 screenStore：选中/剪贴板/历史栈；撤销重做用不可变快照栈，拖拽过程节流、拖拽结束记一次。
- 组合：groupId 机制；双击进入组内模式（inGroupId），Esc/点击组外退出。
- 预览页与展示页复用同一运行时渲染器，与编辑器共享组件渲染器，用模式参数区分。
- 适配：展示端根容器按 fitMode（center/width/height/stretch）计算 scale，监听 resize。
- 主题：`data-theme` 切换 CSS 变量（变量表见 design.md §3 与原型 styles.css）；**禁止在组件内硬编码颜色值**；ECharts 使用 ds-dark/ds-light 主题包。
- **Element Plus 边界【定稿】**（详见 design.md §2.4）：
  - 用 EP：ElDialog / ElMessage / 表单控件（输入/下拉/开关/滑杆/取色器/上传等）——覆盖主色 #2F7FF7，不自研。
  - 从原型迁移：tokens、topbar 布局壳、card/tag/chip/table 皮肤、`.ed-*` 编辑器系列——封装为少量布局展示型组件。
  - 大屏运行时（预览/展示页）不引入 EP 重组件。

## 4. 数据与图表

- 图表数据协议四族：axis / combo / radar / nameValue（api.md §2）；指标卡 kpi 族、表格 table、下拉 options、天气 TencentWeatherData。
- 静态数据与 API 返回**必须直接符合协议，禁止做字段映射层**；协议校验用 packages/shared 的校验器。
- 下拉框联动：选中值按**同名参数**注入目标组件 API 的占位符参数后重新取数；首次取数用 API 配置声明的 defaultValue。
- 天气组件只调内置 `GET /weather?adcode=`，**禁止前端直连腾讯接口**（key 只在后端 env，不得出现在任何前端代码/文档/提交中）。
- 轮询：最小间隔 5 秒；天气默认 300 秒；页面切换/组件卸载必须清理定时器。
- 数据异常：请求失败或协议不符 → 渲染「数据加载失败」占位，禁止白屏/抛错崩溃；编辑器内静态数据不符 → 黄色警告不阻断保存。
- 分类值域（大屏/模板共用）：`通用 / 工业 / 政务 / 医疗 / 交通 / 能源`。

## 5. 后端规则

- 模块划分遵循 architecture.md §3（auth/project/screen/template/api-config/data/asset/ai）。
- SQL 生成类 API：**只允许单条 SELECT**（解析校验），参数一律参数化绑定，业务库连接使用只读账号；拒绝写操作与多语句。数据源驱动可配置，v1 默认 MySQL。
- 外部登记类 API 由后端代理：鉴权信息只存后端；URL 域名白名单校验（默认含 apis.map.qq.com）防 SSRF。
- 密钥管理：腾讯天气 key（env `WEATHER_KEY`）、LLM apiKey、外部 API 密钥只存后端配置/加密存储，**任何接口不得返回明文，禁止提交进仓库**。
- 大屏保存为整屏覆盖 + updatedAt 旧版本检测；API 配置被组件引用时禁止删除。
- 密码 bcrypt 哈希；JWT 有效期 7 天；种子脚本初始化首个管理员（admin/ScreenCraft@2026，首次登录强制改密）。
- 管理端接口（/users、/templates/:id/promote、/api-configs、/ai/settings、/ai/kb-docs）一律 admin 角色守卫。

## 6. 安全底线

- XSS：用户输入文本渲染时转义；禁止对用户内容使用 v-html。
- 上传：校验类型与大小（单文件 ≤ 200MB），文件名随机化存储。
- 所有删除类操作前端二次确认；级联删除（项目→大屏）需明确提示影响范围。

## 7. 禁止事项（v1 范围外）

- 不实现：发布流程、字段映射、APP 组件、页面链接组件、GIS 底图、跳转返回栈、多数据库连接管理界面、协同编辑、知识库 docx/pdf 解析、自助注册、displayToken 匿名投放、jessibuca 直播流。
- 不引入 Dify 或任何第三方 AI 平台（RAG 自研：分块→embedding→检索→生成；无 embedding 时降级 BM25）。
- 不做国际化（仅中文）。

## 8. 交付与自检

- 每完成一个功能模块，对照 PRD 对应章节与 `docs/milestones.md` 当前里程碑验收清单逐条自检，并在回复中给出：改动文件清单、对应 PRD 章节、自检结论。
- 每个里程碑完成即 git commit；出问题优先回退而不是让 Agent 修 Agent 的错误。
- 界面中文文案与 PRD / design.md / 原型措辞保持一致。
- 不写无意义注释；代码命名用英文，与用户沟通用中文。
