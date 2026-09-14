# 大屏配置系统 技术架构（architecture.md）

> 版本：v0.4（AI 智能样式编辑架构版）。与 PRD v0.4、api.md v0.4 配套。技术栈【已确认】：Vue3 + TS + Vite / Pinia / Element Plus / ECharts / vue-draggable-resizable-gorkys / SCSS+CSS 变量 / Axios；后端 NestJS；数据库 MongoDB。
> v0.4 变更：新增 DeepSeek 模型适配、安全声明式渲染器、动态个人组件注册表、组件实例快照、AI 预览 draft、参考图临时资源与双端校验链路；原知识库客服停止新调用。
> v0.3 变更：① 单仓升级为 **pnpm workspace**（frontend / backend / packages/shared），api.md §2 契约接口落到共享包；② 新增 §6 测试策略；③ 依赖白名单全文见 `.cursorrules` §1。
> 接口风格【已确认】：v1 只使用 GET / POST（不使用 PUT / DELETE），更新/删除走 POST 动作路径（见 api.md）。

---

## 1. 总体架构

```
┌──────────────────────── 浏览器（Vue3 SPA） ────────────────────────┐
│  管理端模块：登录 / 项目列表 / 大屏列表 / 模板库 / API配置页 / AI设置│
│  编辑器模块：画布引擎 / 组件库 / AI设计助手 / 事件系统 / 撤销重做    │
│  展示端模块：预览页(全屏) / 展示页(/display/:id) / 适配缩放 / 运行时取数│
└───────────────┬──────────────────────────────────┬────────────────┘
                │ REST /api/v1 (Bearer)            │ /data/:apiId (轮询)
┌───────────────▼──────────────────────────────────▼────────────────┐
│ NestJS 后端                                                        │
│ auth │ project │ screen │ template │ component-preset │ data │ asset │ ai│
│ data：只读 SQL / 外部 API 代理；ai：DeepSeek / 方案校验 / 限流统计    │
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
    └── shared/        # 共享契约、样式字段目录、安全 spec/数据协议校验器、错误码
```

- `packages/shared` 前后端共用（`@screencraft/shared`），是 api.md §2 契约的唯一代码载体；**改契约先改 api.md，再改 shared，再同步前后端**。数据协议、AI 修改操作、`StyleField`、安全图表/边框描述和动态组件快照校验器均在 shared 实现并配 vitest 单测，避免前后端各维护一份白名单。

## 2. 前端架构

### 2.1 目录结构（建议）

```
src/
├── api/            # Axios 统一封装 + 按模块的接口封装（与 api.md 一一对应）
├── stores/         # Pinia：user / screen(编辑器唯一真源) / registry(内置+动态预设)
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

AI 新增前端模块：`components/editor/ai/`（面板、差异列表、预览控制）、`api/aiEditor.ts`、`api/componentPreset.ts`。安全渲染器固定在 `components/runtime/safe/`，不得从服务端接收 Vue 组件路径或动态代码。

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
  dataProtocol?: ProtocolKind; // 'axis' | 'combo' | 'radar' | 'nameValue' | 'table' | kpi 族 | 'options' | none
  defaultStyle: { dark: Record<string, unknown>; light: Record<string, unknown> };
  styleSchema: StyleField[];  // 驱动右侧「样式设置」面板表单
  hasDataTab: boolean; hasEventTab: boolean;
  renderer: Component;        // 运行时渲染组件（编辑器与展示端共用）
}
```

- 右侧「样式设置」面板由 `styleSchema` 声明式生成（颜色/开关/数值/下拉等字段类型）。
- 「数据绑定」静态表格由 `dataProtocol` 生成表头与默认行。
- 新增组件变体 = 新增一条注册记录，不改编辑器主流程。

#### 2.3.1 共享元数据与 AI 写入目录

- `StyleField`、`ProtocolKind` 和不含 Vue `Component` 的模板元数据进入 `packages/shared`；前端注册表只补充实际 renderer 和预览资源。
- 每个 `StyleField` 显式声明 `aiWritable`。后端按共享目录过滤模型输出，前端应用前用同一校验器复检。
- 内置组件由 `templateId` 解析共享元数据；动态组件从 `ComponentDoc.definitionSnapshot` 解析。客户端传入的 schema 一律按安全 renderer 的字段目录重新校验，不作为信任源。

#### 2.3.2 动态注册表与实例快照

解析顺序固定为：

1. 命中内置注册表：使用内置 renderer 与共享模板元数据。
2. `definitionSnapshot` 存在且合法：按 `rendererKey` 选择固定安全 renderer，以快照渲染。
3. 两者均失败：显示“组件配置不可用”占位并记录错误。

个人组件添加到画布时，复制完整定义到实例快照；`presetId` 只用于追踪，不参与渲染。更新或删除预设不扫描、不覆盖已有大屏。`rendererKey` 允许 `echarts-safe-v1`、`border-parametric-v1`、`border-nine-slice-v1`。九宫格边框的 `assetId` 必须指向当前用户拥有的永久边框资产；禁止外部 URL 与未登记 ID。

### 2.4 编辑器状态（Pinia screenStore）

- 状态：`screen: ScreenDoc`、`selectedIds`、`clipboard`、`history: {past[], future[]}`。
- 撤销/重做：对 `pages/components` 做不可变更新，每次变更压栈（节流合并拖拽过程，拖拽结束记一次）。
- 组件操作（移动/缩放）基于 vue-draggable-resizable-gorkys，事件回调写回 store；比例锁=锁定宽高比缩放。
- 组合：共享 `groupId`，选中任一即选中整组，操作按组计算包围盒；**双击组合进入「组内模式」**（store 记录 `inGroupId`），可单独选中并配置组内组件，点击组外或 Esc 退出【已确认】。
- 保存：携带 `updatedAt` 做旧版本检测；浏览器关闭/刷新有未保存修改时 `beforeunload` 提示【已确认】。

#### 2.4.1 AI 预览状态

- 唯一正式编辑状态仍是 `screenStore.screen`；新增 `editorRevision: number`，每次正式画布变更后递增。
- AI 请求记录请求发起时的 `editorRevision`。返回方案只能在版本一致时进入预览；画布发生新变更后，当前方案立即标记过期。
- `previewDraft` 是从正式 screen 派生的只读覆盖层，不写历史栈、不改变 dirty、不调用保存接口。关闭面板、取消预览或重新提交时销毁。
- “应用”先在内存副本完成全部操作并再次校验；全部成功后通过单个 `applyAiPlan` action 替换正式状态、压入一次历史快照并递增版本。任一不可恢复错误时保持原状态。
- `updatedAt` 只用于服务端保存并发检测，不能代替本地 `editorRevision`。

### 2.5 事件系统（运行时）

- 展示端维护 `eventBus`：组件渲染器按 `EventDoc` 绑定 DOM 事件。
- `jumpPage`：切换当前 pageId（v1 仅切换，不做返回栈）。
- `toggleVisibility`：维护 `visibilityOverride: Map<componentId, boolean>`。
- `callApi` / 下拉框联动：对目标组件触发 `refetch(params)`；下拉框 `change` 时把选中 value 按**同名参数**注入目标组件 API 请求（PRD 4.4.6 约定）。
- 首次取数：页面加载时 API 组件用 API 配置声明的参数 `defaultValue` 发起首次请求；下拉框切换后改用选中值注入【已确认】。
- 轮询：组件级 `refreshSec`（默认 30 秒，最小 5 秒；天气默认 300 秒），统一使用请求完成后的 `setTimeout` 调度并加入 ±10% 抖动，禁止慢请求重叠。
- 请求调度：当前页 API/天气请求统一进入最多 6 并发的队列；相同 API + 参数的并发请求合并。页面切换、组件隐藏/卸载、联动参数变化时取消旧请求，并用请求版本号丢弃迟到响应。
- 渲染调度：当前页可见组件按每帧 4 个渐进挂载；隐藏组件不挂载、不取数，运行时重新显示后再恢复取数。
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
| data | 运行时取数：① SQL 生成类→参数化只读执行（白名单 SELECT/禁止写操作与多语句），**数据源驱动可配置，v1 默认 MySQL，预留多数据库抽象**【已确认】；② 外部登记类→HTTP 代理（注入鉴权头）；③ 演示 Mock→MongoDB `mock_datasets`（仅种子生成）；④ **内置天气代理**：腾讯云 LBS 天气 v1（`GET /weather?adcode=`），key 由后端配置注入，固定 `type=now&added_fields=air`【已确认】 |
| asset | 文件上传（本地存储/对象存储抽象；单文件 ≤ 200MB） |
| ai | DeepSeek 配置、文本/视觉能力测试、AI 方案编排、结构化输出解析、共享契约校验、用户级限流与调用统计；兼容期保留旧客服接口但不进入新调用链 |
| component-preset | 个人/公共组件预设 CRUD、所有权校验、复制、版本号递增和管理员提升 |
| ai-reference-asset | AI 参考图上传、真实文件头校验、10MB 限制、所有权和 TTL 清理 |
| ai-border-asset | 永久九宫格边框图上传（PNG/WebP）、归属隔离、删除；供 `SafeNineSliceSpec.assetId` 引用 |

### 3.1 DeepSeek 模型适配

- 默认 BaseURL `https://api.deepseek.com`；文本模型默认 `deepseek-v4-flash`，视觉模型默认 `deepseek-v4-flash-vision-exp`，均允许管理员修改。
- 统一走 Axios 直连 OpenAI 兼容 Chat Completions，不新增 SDK。文本方案启用 JSON Output，并在 prompt 中明确 JSON 结构；能力探测与结构化调用关闭默认 `thinking`（V4 默认开启，否则 `max_tokens` 易被 CoT 占满导致 `content` 为空）；模型返回空内容时自动重试一次。
- 视觉请求将经过文件头校验的图片以内联 Base64 放入 user message，并使用 `detail='original'`；不生成公网 URL，不把图片放入 system/assistant message。
- 整屏截图能力测试复用同一私有参考图与视觉请求链路，返回不修改的上游原始 JSON、确定性归一化的解析值和共享契约问题。解析层按坐标重排行优先顺序，在背景已明确为三维/视频时移除重复输出的场景控制栏，将同列紧贴、名称同源且主体标题为空的游离标题并入主体，并纠正 `notes` 明确自述为仪表盘且具备多项设备状态证据的 KPI 类型；不根据文字猜测图表拆分坐标。页面级视觉底层写入可选 `canvas.backgroundLayer` 诊断字段，按 `image / interactiveScene / video / unknown` 区分静态图片、三维/GIS、视频和不确定背景；背景层不进入组件排序和重叠检查，也不携带 URL、Base64 或永久资产。组件识别推荐不超过 20 项，超过时提示人工检查，硬上限为 32 项；共享校验覆盖背景层字段、场景控制重复识别、游离标题、KPI 与图表互相误并、数量、阅读顺序、组件大面积重叠、标题来源和系列数语义。诊断结果不进入 `screenStore`、历史栈或 MongoDB，也不能作为组件定义渲染。
- 前端从解析值复制生成唯一的本地结构草稿，参考图覆盖框和编辑列表共用该草稿状态；名称、类型、包含状态和边界修改即时同步。确认只设置面板内状态，上传新图、重新识别、删除图片或关闭面板时统一清理。
- 几何归一化仅处理可验证的包含关系：当 KPI 父边界完整包含同高靠边或同宽靠边的图表子区域时，沿子区域边缘收缩 KPI；缺少子区域、图表位于中间或剩余空间不足时保持原值并交由校验/人工处理。
- 模型响应始终按不可信字符串解析：限制响应体大小 → JSON 解析 → shared 结构校验 → 目标 styleSchema 语义校验 → 危险键递归扫描。任何一步失败均不返回可应用操作。
- 自定义图表采用版本化安全投影：历史 SafeChartSpec v1 直接严格校验；新模型结果投影为 v2，正式字段递归归一化/补默认值，其他纯 JSON 视觉字段投影到 `root/grid/legend/axis/coordinate/series` 等固定 renderer 目标。归一化和补默认值不降级，视觉信息真实丢失才进入 warnings；投影后再由 shared 终检。
- 图片中文字只作为待分析内容，系统提示明确禁止执行图片指令。模型不能访问工具、网络、数据库或业务 API。
- API Key 加密存储，只写不读；测试连接与调用日志不得记录密钥、Authorization、Base64 图片或完整用户大屏数据。

### 3.2 AI 方案请求链路

```text
编辑器选择范围 → 构造最小上下文 + editorRevision → 后端鉴权/限流/范围校验
→ DeepSeek JSON 输出 → 后端双层校验与裁剪 → 前端共享校验
→ previewDraft 预览 → 版本复检 → 单次 applyAiPlan → 用户手动保存大屏
```

- 服务端验证用户可访问 `screenId`，并确认 page/target 关系；动态实例重新校验 `definitionSnapshot`。
- 选中组件必须至少 1 个；当前页最多 50 个组件；整屏功能默认关闭，启用后最多 200 个组件。
- 只发送目标组件的标识、主题、当前样式、锁定/隐藏状态和必要快照；禁止发送 API 密钥、Authorization、API 配置、真实接口响应和无关页面数据。
- 请求支持取消。取消只能中断等待和丢弃结果；若上游已开始推理，仍按调用统计记录。

### 3.3 MongoDB 集合

| 集合 | 文档 | 说明 |
|---|---|---|
| users | 账号/密码哈希/角色/启用状态 | |
| projects | 项目 | |
| screens | ScreenDoc（api.md §2） | pages/components 内嵌；整屏覆盖保存 |
| templates | { scope, category, screenSnapshot } | 快照式存储 |
| api_configs | ApiConfigDoc | 密钥字段加密存储 |
| mock_datasets | MockDataset | 演示图表协议数据，按 `mockKey` 与参数读取 |

API 配置以 `dataProtocol` 作为组件绑定兼容性的唯一判断依据；前端不通过接口名称或返回字段猜测图表类型。历史未声明协议的配置保留，但不进入新的组件绑定候选项。
| assets | 文件元数据 | |
| kb_docs | 操作手册文档 | |
| component_presets | 个人/公共组件定义、ownerId、当前 specVersion | 实例不依赖此集合存活 |
| ai_reference_assets | 临时参考图元数据、ownerId、expiresAt | TTL 到期删除元数据与文件 |
| ai_border_assets | 永久边框图元数据、ownerId、url | 无 TTL；删除不扫描大屏，实例保留快照但资源可失效 |
| ai_usage | 用户、能力类型、模型、结果、耗时、token 统计 | 不记录 prompt、图片和密钥 |

`kb_docs` 为 v0.3 遗留数据，v0.4 升级不删除；新功能不读取该集合。

### 3.4 安全要点

- SQL 生成类：仅允许单条 SELECT（解析校验），参数一律参数化绑定，连接账号只读权限。
- 外部代理：鉴权信息仅存后端；URL 域名白名单校验防 SSRF（后台可配白名单，`apis.map.qq.com` 默认加入）。
- 第三方密钥：腾讯云天气 key 仅存后端配置、代理时注入，不暴露给浏览器【已确认】。
- 上传：类型/大小限制（v1 单文件 ≤ 200MB，超限提示），分片/直传预留。
- AI 参考图使用独立上传入口和 10MB 上限、8192px 单边上限、默认 24 小时 TTL，同时校验扩展名、MIME、PNG/JPEG/WebP 文件头、图片尺寸与 ownerId；不得复用通用资源接口的宽松规则。
- 九宫格边框永久资产使用独立上传入口（仅 PNG/WebP），校验文件头与 ownerId；`safeSpec.assetId` 禁止外部 URL；保存大屏时校验资产存在且归属当前用户；删除资产不改写已有大屏快照。
- 有参考图生成边框时，模型可返回参数化 `SafeBorderSpec` 或图片九宫格 `SafeNineSliceSpec`；后者由服务端把参考图转存为永久边框资产并注入 `assetId`。遮挡/水印等无法精确还原时写入 `warnings` 并将 `fidelity` 置为 `approximate`。
- AI 对象递归拒绝 `__proto__`、`prototype`、`constructor`；安全图表拒绝函数 formatter、renderItem、HTML、CSS、完整 SVG/XML、外部 URL 和数据注入。纯文本 formatter 使用固定占位符语法；`path://` 限制长度、命令数和坐标范围；视觉树限制深度、字段数、数组长度和高成本数值。
- ECharts renderer 只由本地适配器把 SafeChartSpec v1/v2 与既有数据协议组装为 option；模型不能提供 series data、dataset、事件、动画回调或不受控根节点。v2 `visual` 只能合并到既有 renderer 节点，页面级目标仍为最多 200 个组件，异常 spec 显示“组件配置不可用”。
- 个人预设的 ownerId/scope/specVersion 由后端写入；普通用户不能读取、更新、复制或删除他人的个人预设。

## 4. 部署形态（v1）

- 前端静态资源 + NestJS 单实例 + MongoDB；SQL 生成类数据源 v1 内置一个业务库连接（只读账号，默认 MySQL）。
- 展示设备直接访问 `/display/:id` URL（v1 登录态访问，displayToken 预留）。
- 前端请求库：Axios 统一封装（见 2.2），只使用 GET/POST。

## 5. 预留扩展位（v1 不实现）

应用组件、页面链接、GIS 背景（背景 type 枚举预留）；字段映射；SQL 作为组件直连数据源（统一走 api-config）；页面跳转返回栈；多业务库连接管理；AI 生成/执行代码；AI 修改布局、数据、事件；组件市场；个人组件历史版本回滚。

## 6. 测试策略

- **单测（vitest，packages/shared）——强制项**：
  - 数据协议校验器：四种图表族协议（axis/combo/radar/nameValue）+ table + options + 天气结构，每种至少「合法 1 例 + 非法 2 例」（类型错误、缺字段、多余字段容忍策略）。
  - 下拉框同名参数注入逻辑（纯函数部分）。
- **单测（vitest，backend）**：SQL 只读校验器（SELECT 通过 / UPDATE·DELETE·多语句·注释注入拒绝）、JWT 守卫、API 删除保护（引用计数）。
- **AI shared 强制单测**：每个 AI 契约合法/非法样例；styleSchema 字段、数值范围、枚举、危险键、深度/长度限制；SafeChartSpec/SafeBorderSpec；实例快照。
- **AI backend 强制单测**：DeepSeek 空响应单次重试、超时/限流/无视觉能力；跨用户预设访问拒绝；参考图伪装文件和超限拒绝；方案目标越权、过期与范围超限。
- **AI frontend 强制测试**：previewDraft 不污染 screen/history/dirty；应用一次只产生一条历史；画布变化使方案过期；取消请求和组件卸载清理。
- **手动验收（每个里程碑，见 docs/milestones.md）**：按里程碑文档给出的验收清单逐条过，截图或录屏留档。
- v1 不做前端 E2E 自动化（playwright 预留，不在依赖白名单内）。
- 测试命令：`pnpm -r test`；CI 不强制，但 shared 与 backend 的单测必须本地通过才允许提交。
