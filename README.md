# ScreenCraft 大屏配置系统

> 面向运营/业务人员的拖拽式数据大屏配置系统：编辑器 + 管理端 + 展示端 + API 数据接入 + AI 客服。
> 工程为 pnpm workspace（`frontend/` + `backend/` + `packages/shared/`），按 `docs/milestones.md` 推进。

## 文档导航（开发必读，按序）

| 文档 | 内容 | 权威范围 |
|---|---|---|
| `.cursorrules` | Cursor 开发约束（依赖白名单 / 接口约定 / 边界规则） | 行为约束 |
| `docs/PRD.md` | 产品需求（v0.3，需求已冻结，待审清单全部关闭） | 需求 |
| `docs/api.md` | 接口定义（§2 TS 接口 = 唯一数据契约） | 接口 |
| `docs/architecture.md` | 技术架构（workspace 结构 / 注册表 / 测试策略） | 架构 |
| `docs/design.md` | 设计规范（tokens / 边框套系 / 布局尺寸 / 适配） | 视觉 |
| `docs/milestones.md` | 开发里程碑 M0~M8 与验收清单 | 节奏与验收 |
| `docs/golden-sample.md` | 组件模板黄金样例（注册记录标准结构） | 组件量产模子 |
| `designs/ui/screencraft-ui/` | 高保真可交互原型（打开 `index.html`）+ `UI-SPEC.md` | 视觉细节 |
| `.work/design-contract.md` | 原型冻结契约（原型内部的实现规则） | 仅原型 |

冲突裁决：功能以 PRD/api.md 为准，视觉以原型 + design.md 为准，开发行为以 `.cursorrules` 为准。

## 快速预览原型

浏览器直接打开 `designs/ui/screencraft-ui/index.html`（零依赖、离线可用）。
演示账号：`admin / ScreenCraft@2026`。

## 技术栈（摘要）

- **前端**：Vue3 + TS + Vite + Pinia + Vue Router + Element Plus（管理端交互控件）+ ECharts 5 + vue-draggable-resizable-gorkys + vxe-table + CodeMirror 6 + lucide-vue-next + html2canvas + Axios（统一封装）
- **后端**：NestJS + MongoDB（mongoose）+ MySQL 只读连接（SQL 生成类数据源）+ bcrypt + JWT
- **工程**：pnpm workspace（`frontend/` + `backend/` + `packages/shared/` 共享契约包）；Node ≥ 20；TS strict

## 环境变量

见根目录 `.env.example`（脚手架搭建时拆分为 `backend/.env` 与 `frontend/.env`）。
关键项：`MONGO_URI`、`JWT_SECRET`、`WEATHER_KEY`（腾讯天气，仅后端）、`BUSINESS_DB_DSN`（只读业务库）、`LLM_*`（AI 客服）。

## 启动

```bash
pnpm i
pnpm mongo:start                    # 启动本机 MongoDB（27017）
pnpm --filter backend seed          # 初始化管理员 admin / ScreenCraft@2026（首登强制改密）+ 演示账号 demo
pnpm dev                            # frontend:5173 / backend:3000
pnpm test                           # shared + backend 单测（必须通过才能提交）
```

## 开发节奏

按 `docs/milestones.md`：M0 脚手架 → M1 登录/用户 → M2 列表页 → M3 编辑器骨架 → M4 注册表+黄金样例（**用户验收后再量产**）→ M5 API 配置 → M6 交互事件 → M7 展示页 → M8 变体量产 + AI 客服 + 收尾。每完成一个里程碑打 tag。
