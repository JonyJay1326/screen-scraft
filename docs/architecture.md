# 大屏配置系统 技术架构（architecture.md）

> 版本：v0.3（交付开发版）。与 PRD v0.3、api.md v0.3 配套。技术栈【已确认】：Vue3 + TS + Vite / Pinia / Element Plus / ECharts / vue-draggable-resizable-gorkys / SCSS+CSS 变量 / Axios；后端 NestJS；数据库 MongoDB。
> v0.3 变更：① 单仓升级为 **pnpm workspace**（frontend / backend / packages/shared），api.md §2 契约接口落到共享包；② 新增 §6 测试策略；③ 依赖白名单全文见 `.cursorrules` §1。
> 接口风格【已确认】：v1 只使用 GET / POST（不使用 PUT / DELETE），更新/删除走 POST 动作路径（见 api.md）。

---

## 1. 总体架构

```
┌──────────────────────── 浏览器（Vue3 SPA） ────────────────────────┐
│  管理端模块：登录 / 项目列表 / 大屏列表 / 模板库 / API配置页 / AI客服 │
│  编辑器模块：画布引擎 / 组件库 / 配置面板 / 事件系统 / 撤销重做       │
│  展示端模块：预览页(全屏) / 展示页(/display/:id) / 适配缩放 / 运行时取数│
└───────────────┬──────────────────────────────────┬────────────────┘
                │ REST /api/v1 (Bearer)            │ /data/:apiId (轮询)
┌───────────────▼──────────────────────────────────▼────────────────┐
│ NestJS 后端                                                        │
│  auth │ project │ screen │ template │ api-config │ data │ asset │ ai│
│  data 模块：SQL 生成执行器(只读+参数化) / 外部 API 代理(鉴权收口)     │
└───────────────┬───────────────────────────────┬───────────────────┘
                │                               │
        ┌───────▼───────┐               ┌───────▼────────┐
        │   MongoDB     │               │ 业务数据库(只读)│
        │ 系统数据存储   │               │ SQL 生成类数据源 │
        └───────────────┘               └────────────────┘
```

- 前端所有 HTTP 请求经 **Axios 统一封装**后使用（见 2.2）【已确认】。
- **单仓 pnpm workspace**【v0.3 新增】：

```
screencraft/
├── pnpm-workspace.yaml
├── frontend/          # Vue3 SPA
├── backend/           # NestJS
└── packages/
    └── shared/        # 共享契约包：api.md §2 全部 TS 接口 + 组件数据协议校验器 + 错误码常量
```

- `packages/shared` 前后端共用（`@screencraft/shared`），是 api.md §2 契约的唯一代码载体；**改契约先改 api.md，再改 shared，再同步前后端**。数据协议校验器（每种协议的合法/非法判断）也在 shared 内实现并配 vitest 单测，前端「静态数据校验/试运行提示」与后端「/data 协议提示」复用同一实现。

## 2. 前端架构

### 2.1 目录结构（建议）

```
src/
├── api/            # Axios 统一封装 + 按模块的接口封装（与 api.md 一一对应）
├── stores/         # Pinia：user / screen(编辑器) / registry
├── registry/       # 组件模板注册表（核心）
│   ├── index.ts            # 注册所有组件模板
│   └── templates/<id>/     # 每个变体：meta.ts(默认尺寸/协议) + configSchema.ts + 预览图
├── components/
│   ├── editor/     # 画布、工具条、面板、页面树、组件库面板
│   ├── runtime/    # 展示端渲染器：ComponentRenderer / ChartRenderer(ECharts封装) ...
│   └── ui/         # 管理端通用 UI
├── views/          # login / projects / screens / editor / preview / display / api-config
├── theme/          # CSS 变量 + ECharts 主题包(ds-dark/ds-light)
└── utils/          # 适配缩放、事件总线、数据协议校验
```

### 2.2 Axios 统一封装（先封装、后使用）【已确认】

- 创建统一实例：`baseURL = /api/v1`、超时时间（普通请求 15s；`/data/:apiId` 取数可按需放宽）。
- 请求拦截器：注入 `Authorization: Bearer <token>`（取自 user store / localStorage）。
- 响应拦截器：统一解包 `{ code, message, data }`——`code === 0` 返回 `data`；非 0 抛出业务错误（携带 code/message）；`401` 清空登录态并跳转登录页（展示页场景给出提示）。
- 方法约定【已确认】：**只暴露 `get` / `post` 两个方法**（v1 不使用 PUT/DELETE）；更新、删除分别调用 `POST /xxx/update`、`POST /xxx/delete`。
- 统一错误提示出口（ElMessage），业务代码只写模块接口（`api/screen.ts`、`api/apiConfig.ts` …），不直接使用裸 Axios。
- 轮询取数基于封装实例实现，间隔最小 5 秒，页面切换/组件卸载时清理定时器。

### 2.3 组件模板注册表（核心设计）【已确认：变体即独立组件】

每个组件变体 = 一条注册记录：

```ts
interface ComponentTemplate {
  id: string;                 // 如 'chart-pie-1'、'kpi-card-8'
  category: 'chart' | 'decoration' | 'media' | 'control';
  group: string;              // 图表/指标卡/表格/装饰/媒体/控件
  label: string;              // 显示名，如「饼图样式1」「指标卡样式8」
  previews: { dark: string; light: string };   // 双主题预览图
  defaultSize: { w: number; h: number };
  defaultTheme: 'dark';
  dataProtocol?: ProtocolKind; // 'axis' | 'combo' | 'radar' | 'nameValue' | 'table' | kpi 族 | 'options' | none
  defaultStyle: Record<string, unknown>;       // 双主题各一份
  styleSchema: StyleField[];  // 驱动右侧「样式设置」面板表单
  hasDataTab: boolean; hasEventTab: boolean;
  renderer: Component;        // 运行时渲染组件（编辑器与展示端共用）
}
```

- 右侧「样式设置」面板由 `styleSchema` 声明式生成（颜色/开关/数值/下拉等字段类型）。
- 「数据绑定」静态表格由 `dataProtocol` 生成表头与默认行。
- 新增组件变体 = 新增一条注册记录，不改编辑器主流程。

### 2.4 编辑器状态（Pinia screenStore）

- 状态：`screen: ScreenDoc`、`selectedIds`、`clipboard`、`history: {past[], future[]}`。
- 撤销/重做：对 `pages/components` 做不可变更新，每次变更压栈（节流合并拖拽过程，拖拽结束记一次）。
- 组件操作（移动/缩放）基于 vue-draggable-resizable-gorkys，事件回调写回 store；比例锁=锁定宽高比缩放。
- 组合：共享 `groupId`，选中任一即选中整组，操作按组计算包围盒；**双击组合进入「组内模式」**（store 记录 `inGroupId`），可单独选中并配置组内组件，点击组外或 Esc 退出【已确认】。
- 保存：携带 `updatedAt` 做旧版本检测；浏览器关闭/刷新有未保存修改时 `beforeunload` 提示【已确认】。

### 2.5 事件系统（运行时）

- 展示端维护 `eventBus`：组件渲染器按 `EventDoc` 绑定 DOM 事件。
- `jumpPage`：切换当前 pageId（v1 仅切换，不做返回栈）。
- `toggleVisibility`：维护 `visibilityOverride: Map<componentId, boolean>`。
- `callApi` / 下拉框联动：对目标组件触发 `refetch(params)`；下拉框 `change` 时把选中 value 按**同名参数**注入目标组件 API 请求（PRD 4.4.6 约定）。
- 首次取数：页面加载时 API 组件用 API 配置声明的参数 `defaultValue` 发起首次请求；下拉框切换后改用选中值注入【已确认】。
- 轮询：组件级 `refreshSec`（最小 5 秒），展示端为每个 API 组件建定时器，页面切换时清理。
- 数据异常：请求失败或返回不符合协议 → 组件渲染「数据加载失败」占位，有轮询则下次轮询自动重试【已确认】。

### 2.6 适配缩放

见 design.md 第 8 章；展示端根容器按 `fitMode` 计算 scale，resize 监听重算。

### 2.7 缩略图生成

保存时前端对画布做快照（ECharts `getDataURL` 合成或 html2canvas）→ 上传 `/assets/upload` → URL 写入 `POST /screens/:id/save`。

## 3. 后端架构（NestJS 模块）

| 模块 | 职责 |
|---|---|
| auth | 登录/JWT 签发/角色守卫（admin/member）；极简用户管理（列表/新建/重置密码/启用禁用）【已确认】 |
| project / screen / template | CRUD、复制、投放标记、模板提升；大屏保存携带 updatedAt 做旧版本检测【已确认】 |
| api-config | 配置 CRUD（**被组件引用时禁止删除**【已确认】）；**试运行**；密钥保管（authSecret 不出后端） |
| data | 运行时取数：① SQL 生成类→参数化只读执行（白名单 SELECT/禁止写操作与多语句），**数据源驱动可配置，v1 默认 MySQL，预留多数据库抽象**【已确认】；② 外部登记类→HTTP 代理（注入鉴权头）；③ **内置天气代理**：腾讯云 LBS 天气 v1（`GET /weather?adcode=`），key 由后端配置注入，固定 `type=now&added_fields=air`【已确认】 |
| asset | 文件上传（本地存储/对象存储抽象；单文件 ≤ 200MB） |
| ai | 知识库文档管理（v1 md/txt）+ 自研轻量 RAG（分块→embedding→向量检索→大模型 API 生成；**embedding 不可用时降级 BM25 关键词检索**）；LLM 配置（BaseURL/Key/Model）管理员可配；不引入 Dify，预留适配器接口【已确认】 |

### 3.1 MongoDB 集合

| 集合 | 文档 | 说明 |
|---|---|---|
| users | 账号/密码哈希/角色/启用状态 | |
| projects | 项目 | |
| screens | ScreenDoc（api.md §2） | pages/components 内嵌；整屏覆盖保存 |
| templates | { scope, category, screenSnapshot } | 快照式存储 |
| api_configs | ApiConfigDoc | 密钥字段加密存储 |
| assets | 文件元数据 | |
| kb_docs | 操作手册文档 | |

### 3.2 安全要点

- SQL 生成类：仅允许单条 SELECT（解析校验），参数一律参数化绑定，连接账号只读权限。
- 外部代理：鉴权信息仅存后端；URL 域名白名单校验防 SSRF（后台可配白名单，`apis.map.qq.com` 默认加入）。
- 第三方密钥：腾讯云天气 key 仅存后端配置、代理时注入，不暴露给浏览器【已确认】。
- 上传：类型/大小限制（v1 单文件 ≤ 200MB，超限提示），分片/直传预留。

## 4. 部署形态（v1）

- 前端静态资源 + NestJS 单实例 + MongoDB；SQL 生成类数据源 v1 内置一个业务库连接（只读账号，默认 MySQL）。
- 展示设备直接访问 `/display/:id` URL（v1 登录态访问，displayToken 预留）。
- 前端请求库：Axios 统一封装（见 2.2），只使用 GET/POST。

## 5. 预留扩展位（v1 不实现）

应用组件、页面链接、GIS 背景（背景 type 枚举预留）；字段映射；SQL 作为组件直连数据源（统一走 api-config）；页面跳转返回栈；多业务库连接管理。

## 6. 测试策略（v0.3 新增）

- **单测（vitest，packages/shared）——强制项**：
  - 数据协议校验器：四种图表族协议（axis/combo/radar/nameValue）+ table + options + 天气结构，每种至少「合法 1 例 + 非法 2 例」（类型错误、缺字段、多余字段容忍策略）。
  - 下拉框同名参数注入逻辑（纯函数部分）。
- **单测（vitest，backend）**：SQL 只读校验器（SELECT 通过 / UPDATE·DELETE·多语句·注释注入拒绝）、JWT 守卫、API 删除保护（引用计数）。
- **手动验收（每个里程碑，见 docs/milestones.md）**：按里程碑文档给出的验收清单逐条过，截图或录屏留档。
- v1 不做前端 E2E 自动化（playwright 预留，不在依赖白名单内）。
- 测试命令：`pnpm -r test`；CI 不强制，但 shared 与 backend 的单测必须本地通过才允许提交。
