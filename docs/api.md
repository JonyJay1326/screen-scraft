# 大屏配置系统 接口定义（api.md）

> 版本：v0.4（AI 智能样式编辑契约版）。与 PRD v0.4、architecture.md v0.4 配套；数据模型以本文第 2 章 TypeScript 接口为唯一契约。
> v0.4 变更：① `ComponentDoc` 增加安全组件定义快照；② `StyleField`、AI 修改方案、安全图表/边框描述和个人组件预设进入共享契约；③ 新增 AI 编辑、参考图和个人组件接口；④ DeepSeek 文本/视觉模型配置取代面向用户的知识库客服；⑤ 旧 `/ai/chat`、`/ai/kb-docs*` 进入废弃期但不删除数据。
> v0.3 变更：① §2 `category` 值域统一为「通用/工业/政务/医疗/交通/能源」（与冻结原型一致）；② §3.9 移除明文密钥，改为环境变量 `WEATHER_KEY`；③ 原【待确认 12】各项已全部确认（PRD §10-12），正文中【待确认 12】标注均按默认方案生效。
> v0.3.1 补丁（开发确认）：① `UserDoc` 增加 `mustChangePassword`；② 新增 `POST /auth/change-password`；③ 种子管理员与管理员重置密码后强制改密，改密成功后旧 JWT 失效；④ 大屏保存 `updatedAt` 冲突复用错误码 4001；⑤ 新增 `GET /health` 供脚手架探活。
> 约定：BaseURL `/api/v1`；鉴权 `Authorization: Bearer <token>`；统一响应 `{ code: 0, message: 'ok', data }`，非 0 为错误码；分页 `{ list, total, page, pageSize }`。
> **请求方法约定【已确认】：v1 接口只使用 GET / POST，不使用 PUT / DELETE。更新、删除操作统一走 `POST /xxx/update`、`POST /xxx/delete` 动作路径。**

---

## 1. 通用约定

- 所有 ID 为字符串（MongoDB ObjectId）。
- 时间字段为 ISO8601 字符串。
- JWT 有效期 7 天，无 refresh token，过期重新登录【已确认】。
- 文件上传：`POST /assets/upload`，multipart，返回 `{ url }`。
- 展示页/预览页取数接口 v1 使用登录态访问；为投放设备预留 `displayToken` 大屏级只读令牌（v1 可不启用）。

---

## 2. 核心数据模型（契约）

```ts
// ---------- 大屏 ----------
interface ScreenDoc {
  _id: string;
  projectId: string;
  name: string;
  category: '通用' | '工业' | '政务' | '医疗' | '交通' | '能源';   // 与模板分类共用同一值域（v0.3 统一，以冻结原型为准）
  deployed: boolean;                 // 使用中（投放标记）
  fitMode: 'center' | 'width' | 'height' | 'stretch';
  canvas: { width: number; height: number };   // v1 固定 1920x1080
  pages: PageDoc[];
  thumbnail?: string;                // 缩略图 URL
  createdAt: string;
  updatedAt: string;
}

interface PageDoc {
  id: string;
  name: string;
  parentId: string | null;           // 页面嵌套（组织分组语义）
  background: {
    type: 'normal';                  // 应用组件/页面链接/GIS 预留
    color: string;
    opacity: number;                 // 0~100
    image?: string;
    fill: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  };
  components: ComponentDoc[];
}

interface ComponentDoc {
  id: string;
  templateId: string;                // 组件模板（变体）ID，见 architecture.md 注册表
  name: string;
  x: number; y: number; w: number; h: number;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
  groupId: string | null;            // 同组共享 groupId
  theme: 'dark' | 'light';
  style: Record<string, unknown>;    // 样式配置，schema 由 templateId 决定
  data?: DataBinding;
  events: EventDoc[];
  definitionSnapshot?: ComponentDefinitionSnapshot; // 仅动态/AI 组件必填；内置组件省略
}

// ---------- 共享样式字段与动态组件快照 ----------
type StyleFieldType = 'text' | 'number' | 'switch' | 'color' | 'select' | 'colorList';
type StyleValue = string | number | boolean | string[];
type ProtocolKind =
  | 'axis' | 'combo' | 'radar' | 'nameValue' | 'table' | 'options' | 'weather'
  | 'kpi-1' | 'kpi-2' | 'kpi-3' | 'kpi-5' | 'kpi-8' | 'kpi-list';
type CustomComponentGroup = 'line' | 'bar' | 'pie' | 'combo' | 'funnel' | 'radar' | 'gauge' | 'border';

interface StyleField {
  key: string;
  label: string;
  type: StyleFieldType;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  group: string;                       // 样式面板分组标题
  aiWritable: boolean;               // AI 只允许写入 true 的字段
  readOnly?: boolean;
}

type SafeRendererKey =
  | 'echarts-safe-v1'
  | 'border-parametric-v1'
  | 'border-nine-slice-v1';          // 九宫格图片边框（M9.6）

interface ComponentDefinitionSnapshot {
  source: 'generated' | 'personal' | 'public';
  presetId?: string;                 // 预设删除后只作追踪，不作为渲染依赖
  rendererKey: SafeRendererKey;
  specVersion: number;
  category: 'chart' | 'decoration';
  group: CustomComponentGroup;
  dataProtocol?: ProtocolKind;
  defaultSize: { w: number; h: number };
  styleSchema: StyleField[];
  styleMode: 'editable' | 'locked';
  defaultStyle: {
    dark: Record<string, unknown>;
    light: Record<string, unknown>;
  };
  safeSpec: SafeChartSpec | SafeBorderSpec | SafeNineSliceSpec;
}

interface DataBinding {
  source: 'static' | 'api' | 'builtin';  // builtin=系统内置数据源（v1 仅腾讯云天气）【已确认】
  staticData?: unknown;              // 必须符合该模板的数据协议（PRD 5.2）
  apiId?: string;                    // 全局 API 配置 ID，source=api
  refreshSec?: number;               // 轮询秒数，source=api/builtin；最小 5 秒；天气默认 300 秒【已确认】
  builtin?: { provider: 'tencentWeather'; adcode: string }; // source=builtin：天气组件的城市行政区划代码【已确认】
}

interface EventDoc {
  id: string;
  name: string;
  trigger: 'click' | 'dblclick' | 'mouseenter' | 'mouseleave' | 'change'; // change=下拉框选中
  action: 'jumpPage' | 'jumpLink' | 'toggleVisibility' | 'callApi';
  config: {
    pageId?: string;                                            // jumpPage
    url?: string; openMode?: 'new' | 'current';                 // jumpLink
    targets?: { componentId: string; state: 'show' | 'hide' | 'toggle' }[]; // toggleVisibility
    targetComponentIds?: string[];                              // callApi：触发重新取数的数据组件
  };
}

// ---------- 下拉框联动约定 ----------
// 下拉框选中后，对每条 trigger=change 的事件：取其目标组件所绑定 API 的占位符参数，
// 将选中 value 按【同名】注入后重新请求。选项 value 取值需与目标 API 参数值域匹配。
// 页面加载（首次取数）时，目标组件使用 API 配置中声明的参数 defaultValue 请求；
// 下拉框「默认选中项」在其样式设置中配置【已确认】。

// ---------- API 配置 ----------
interface ApiConfigDoc {
  _id: string;
  name: string;
  type: 'sql' | 'external' | 'mock';
  dataProtocol?: ProtocolKind;        // 新建/更新必填；旧数据可能为空，补充后才参与组件筛选
  sql?: string;                      // type=sql；:paramName 形式引用参数
  mockKey?: string;                  // type=mock；指向 MongoDB mock_datasets，仅种子生成
  external?: {
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    authType?: 'none' | 'bearer' | 'basic';
    authSecretRef?: string;          // 密钥存后端，不返回前端
  };
  params: { name: string; type: 'string' | 'number'; defaultValue?: unknown }[];
  createdAt: string;
  updatedAt: string;
}

// ---------- 用户（管理员管理）【已确认】 ----------
interface UserDoc {
  _id: string;
  username: string;
  role: 'admin' | 'member';
  enabled: boolean;
  mustChangePassword: boolean;        // 首次登录 / 管理员重置后为 true；改密成功后为 false【v0.3.1】
  createdAt: string;
  updatedAt: string;                  // 密码哈希单独存储，接口不返回
}

// ---------- 组件数据协议（与 PRD 5.2 一致） ----------
type AxisData = { categories: string[]; series: { name: string; data: number[] }[] };                       // 折线/柱状
type ComboData = { categories: string[]; series: { name: string; type: 'line' | 'bar'; yAxisIndex?: 0 | 1; data: number[] }[] }; // 组合
type RadarData = { indicators: { name: string; max?: number }[]; series: { name: string; data: number[] }[] };                  // 雷达
type NameValueData = { name: string; value: number }[];                                                    // 饼/漏斗/仪表盘
type TableData = { columns: { key: string; label: string }[]; rows: Record<string, string | number>[] };
type DropdownOptions = { label: string; value: string }[];

// 天气：腾讯云 LBS 天气 v1 原样响应（后端固定以 type=now&added_fields=air 取数），组件读取 result.realtime[0]【已确认】
type TencentWeatherData = {
  status: number;                    // 0 为正常
  message: string;
  result: {
    realtime: {
      province: string; city: string; district: string; adcode: number; update_time: string;
      infos: { weather: string; temperature: number; wind_direction: string; wind_power: string; humidity: number; air_pressure: number };
      air?: { aqi: number; pm10: number; pm25: number; no2: number; o3: number; so2: number; co: number };
    }[];
  };
};

// ---------- AI 安全描述 ----------
type ChartFamily = 'line' | 'bar' | 'pie' | 'combo' | 'funnel' | 'radar' | 'gauge';

interface SafeChartSpecV1 {
  kind: 'chart';
  schemaVersion: 1;
  family: ChartFamily;
  option: SafeChartOptionV1;
}

interface SafeChartOptionV1 {
  grid?: { left: number; right: number; top: number; bottom: number };
  palette?: string[];
  legend?: { show: boolean; position: 'top' | 'topRight' | 'bottom' };
  axis?: { showX: boolean; showY: boolean; labelColor: string; gridColor: string };
  line?: { smooth: boolean; width: number; areaOpacity: number; symbol: 'none' | 'circle' | 'rect' };
  bar?: { width: number; radius: number; stack: boolean; horizontal: boolean };
  pie?: { innerRadius: number; outerRadius: number; roseType: 'none' | 'radius' | 'area' };
  funnel?: { sort: 'ascending' | 'descending'; align: 'left' | 'center' | 'right'; gap: number };
  radar?: { shape: 'polygon' | 'circle'; splitNumber: number; areaOpacity: number };
  gauge?: { min: number; max: number; startAngle: number; endAngle: number; showPointer: boolean; showProgress: boolean };
}

type ChartFidelity = 'exact' | 'approximate';
type SafeChartColor = string | {
  type: 'linear';
  direction: 'vertical' | 'horizontal' | 'diagonal';
  stops: { offset: number; color: string }[];
};

interface SafeChartLabel {
  show: boolean;
  position: 'top' | 'inside' | 'center' | 'outside' | 'right';
  color: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  distance: number;
}

type SafeChartVisualValue =
  | string | number | boolean | null
  | SafeChartVisualValue[]
  | SafeChartVisualObject;
interface SafeChartVisualObject { [key: string]: SafeChartVisualValue }
interface SafeChartVisualOverrides {
  root?: SafeChartVisualObject;
  grid?: SafeChartVisualObject;
  legend?: SafeChartVisualObject;
  axis?: SafeChartVisualObject;
  xAxis?: SafeChartVisualObject;
  yAxis?: SafeChartVisualObject;
  coordinate?: SafeChartVisualObject;
  series?: SafeChartVisualObject;
  lineSeries?: SafeChartVisualObject;
  barSeries?: SafeChartVisualObject;
}
// visual 仅允许纯 JSON 视觉/布局值，并限制深度、字段数、数组长度与高成本数值。
// 禁止数据/series 注入、函数、renderItem、HTML/CSS、完整 SVG/XML、URL/data URI 和危险键。
// formatter 仅允许 {a}/{b}/{c}/{d}/{value}/{name}/{seriesName} 固定占位符纯文本模板；
// path:// 仅允许长度≤4096、命令数≤256、坐标绝对值≤100000 的标准 SVG path 数据。

interface SafeChartSpecV2 {
  kind: 'chart';
  schemaVersion: 2;
  family: ChartFamily;
  fidelity: ChartFidelity;
  option: SafeChartOptionV2;
}

interface SafeChartOptionV2 {
  grid?: { left: number; right: number; top: number; bottom: number; containLabel: boolean };
  palette?: string[];
  backgroundColor?: string;
  visual?: SafeChartVisualOverrides; // 仅保存经过服务端安全投影的纯视觉扩展
  legend?: {
    show: boolean;
    position: 'top' | 'topRight' | 'bottom' | 'left' | 'right';
    orientation: 'horizontal' | 'vertical';
    icon: 'circle' | 'rect' | 'roundRect' | 'triangle' | 'diamond' | 'line';
    itemWidth: number;
    itemHeight: number;
    gap: number;
    textColor: string;
    textSize: number;
  };
  axis?: {
    showX: boolean;
    showY: boolean;
    labelColor: string;
    labelSize: number;
    labelRotate: number;
    showTicks: boolean;
    axisLineColor: string;
    axisLineWidth: number;
    gridColor: string;
    gridWidth: number;
    gridType: 'solid' | 'dashed' | 'dotted';
  };
  line?: {
    smooth: boolean;
    width: number;
    lineType: 'solid' | 'dashed' | 'dotted';
    areaOpacity: number;
    areaColor: SafeChartColor;
    symbol: 'none' | 'circle' | 'rect' | 'triangle' | 'diamond';
    symbolSize: number;
    label: SafeChartLabel;
  };
  bar?: {
    width: number;
    maxWidth: number;
    radius: number;
    stack: boolean;
    horizontal: boolean;
    color: SafeChartColor;
    borderColor: string;
    borderWidth: number;
    showBackground: boolean;
    backgroundColor: string;
    label: SafeChartLabel;
  };
  pie?: {
    innerRadius: number;
    outerRadius: number;
    centerX: number;
    centerY: number;
    startAngle: number;
    clockwise: boolean;
    padAngle: number;
    borderRadius: number;
    borderColor: string;
    borderWidth: number;
    roseType: 'none' | 'radius' | 'area';
    label: SafeChartLabel;
  };
  funnel?: {
    sort: 'ascending' | 'descending' | 'none';
    align: 'left' | 'center' | 'right';
    gap: number;
    left: number;
    top: number;
    width: number;
    height: number;
    minSize: number;
    maxSize: number;
    label: SafeChartLabel;
  };
  radar?: {
    shape: 'polygon' | 'circle';
    splitNumber: number;
    centerX: number;
    centerY: number;
    radius: number;
    areaOpacity: number;
    axisNameColor: string;
    axisNameSize: number;
    axisLineColor: string;
    splitLineColor: string;
    splitAreaColors: string[];
    symbol: 'none' | 'circle' | 'rect' | 'triangle' | 'diamond';
    symbolSize: number;
    lineWidth: number;
    label: SafeChartLabel;
  };
  gauge?: {
    min: number;
    max: number;
    startAngle: number;
    endAngle: number;
    centerX: number;
    centerY: number;
    radius: number;
    showPointer: boolean;
    pointerWidth: number;
    showProgress: boolean;
    progressWidth: number;
    axisLineWidth: number;
    splitNumber: number;
    titleColor: string;
    titleSize: number;
    detailColor: string;
    detailSize: number;
  };
}

type SafeChartSpec = SafeChartSpecV1 | SafeChartSpecV2;

interface SafeBorderSpec {
  kind: 'border';
  schemaVersion: 1;
  cornerType: 'cut' | 'bracket' | 'notch' | 'line';
  cornerSize: number;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  lineWidth: number;
  lineOpacity: number;
  innerGlow: number;
  outerGlow: number;
  glowOpacity: number;
  titlePosition: 'none' | 'topLeft' | 'topCenter';
  contentPadding: number;
}

interface SafeNineSliceSpec {
  kind: 'nineSlice';
  schemaVersion: 1;
  assetId: string;                   // 永久边框资产 ID，禁止外部 URL
  slice: { top: number; right: number; bottom: number; left: number };
}

interface AiBorderAsset {
  _id: string;
  mimeType: 'image/png' | 'image/webp';
  size: number;
  width: number;
  height: number;
  url: string;                       // /uploads/border-assets/...
}

// ---------- AI 修改方案 ----------
type AiStyleOperation =
  | {
      targetType: 'component';
      targetId: string;
      stylePatch: Record<string, StyleValue>; // 每个键仍须按目标 StyleField 做类型、范围、枚举校验
    }
  | {
      targetType: 'page';
      targetId: string;
      backgroundPatch: Partial<Pick<PageDoc['background'], 'color' | 'opacity'>>;
    };

interface AiEditorContext {
  pageBackground?: Pick<PageDoc['background'], 'color' | 'opacity'>;
  components: Array<Pick<ComponentDoc,
    'id' | 'templateId' | 'name' | 'theme' | 'locked' | 'hidden' | 'style' | 'definitionSnapshot'
  >>;
}

interface AiEditorPlanRequest {
  screenId: string;
  pageId: string;
  scope: 'selected' | 'page' | 'screen';
  componentIds: string[];
  instruction: string;
  referenceAssetId?: string;
  editorRevision: number;            // 前端本地单调递增版本，不等同于 updatedAt
  context: AiEditorContext;          // 仅包含完成本次任务所需的当前未保存状态
}

interface AiEditorPlanResponse {
  planId: string;                    // 请求追踪 ID，不代表服务端持久化方案
  summary: string;
  operations: AiStyleOperation[];
  skipped: { targetId: string; reason: string }[];
  unsupportedFeatures: Array<{
    description: string;
    reason: string;
    handling: 'approximate' | 'customComponent' | 'lockedStyleChart' | 'unsupported';
    suggestion?: string;
  }>;
  warnings: string[];
  editorRevision: number;
}

interface AiGenerateComponentRequest {
  screenId: string;
  pageId: string;
  instruction: string;
  kind: 'chart' | 'border';
  referenceAssetId?: string;
  editorRevision: number;
}

interface AiGeneratedComponent {
  name: string;
  theme: 'dark' | 'light';
  fidelity: ChartFidelity;
  definitionSnapshot: ComponentDefinitionSnapshot;
  style: Record<string, unknown>;
  defaultData?: unknown;
  warnings: string[];
  unsupportedFeatures: { description: string; reason: string; suggestion?: string }[];
  editorRevision: number;
}

interface AiReferenceAsset {
  _id: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  size: number;
  width: number;
  height: number;
  expiresAt: string;
}

type AiScreenComponentType =
  | 'text' | 'kpi' | 'kpiList' | 'line' | 'bar'
  | 'pie' | 'gauge' | 'table' | 'border' | 'unsupported';

interface AiScreenBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

type AiScreenBackgroundLayerKind = 'image' | 'interactiveScene' | 'video' | 'unknown';

interface AiScreenAnalysisResult {
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
    backgroundLayer?: {
      kind: AiScreenBackgroundLayerKind;
      bounds: AiScreenBounds;
      description: string;
      confidence: number;
      notes: string;
    };
  };
  ignoredRegions: Array<{ bounds: AiScreenBounds; reason: string }>;
  components: Array<{
    order: number;
    type: AiScreenComponentType;
    name: string;
    bounds: AiScreenBounds;
    title: string;
    visibleTexts: string[];
    seriesCount: number;
    confidence: number;
    notes: string;
  }>;
  warnings: string[];
}

interface AiScreenAnalysisRequest {
  referenceAssetId: string;
}

interface AiScreenAnalysisTestResponse {
  model: string;
  /** 上游 message.content 原文，不进行修正 */
  rawContent: string;
  /** JSON 解析值；合法坐标可用时按行优先顺序重排 components/order */
  parsedContent: unknown | null;
  validationIssues: Array<{ path: string; message: string }>;
}

interface AiEditorCapabilities {
  visionEnabled: boolean;
  visionUnavailableReason?: string;
}

interface AiSettingsView {
  provider: 'deepseek';
  baseUrl: string;
  textModel: string;
  visionModel: string;
  visionEnabled: boolean;
  apiKeyMasked: string;
}

// ---------- 个人组件预设 ----------
interface CustomComponentPreset {
  _id: string;
  ownerId: string;                   // 只读，由鉴权身份写入
  name: string;
  description?: string;
  scope: 'personal' | 'public';
  definition: ComponentDefinitionSnapshot;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. 接口清单

### 3.1 认证与用户

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /health | 探活，无需鉴权 → `{ ok: true }`【v0.3.1】 |
| POST | /auth/login | `{username,password}` → `{token,user}`；禁用账号返回 403 |
| GET | /auth/me | 当前用户（含 `mustChangePassword`） |
| POST | /auth/change-password | `{oldPassword,newPassword}` → `{token,user}`；校验旧密码，成功后旧 JWT 失效【v0.3.1】 |
| GET | /users | 管理员：用户列表 |
| POST | /users | 管理员：新建 `{username,password,role}`；新建账号 `mustChangePassword=true` |
| POST | /users/:id/reset-password | 管理员：重置密码 `{password}`，并置 `mustChangePassword=true` |
| POST | /users/:id/status | 管理员：`{enabled:boolean}` 启用/禁用 |

### 3.2 项目

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /projects | 项目列表（含大屏数） |
| POST | /projects | 新建 `{name}` |
| POST | /projects/:id/update | 重命名等 |
| POST | /projects/:id/delete | 删除（级联其下大屏，需前端二次确认） |

### 3.3 大屏

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /projects/:pid/screens | 列表（含缩略图/deployed/category） |
| POST | /screens | 新建空白 `{projectId,name,category}`，默认 1920×1080、1 页 |
| GET | /screens/:id | 编辑用完整 ScreenDoc |
| POST | /screens/:id/save | 整屏保存（覆盖 pages 等）+ 可携带 `thumbnail`（base64 或已上传 URL）；携带 `updatedAt` 做旧版本检测，冲突时返回 **4001**【已确认 / v0.3.1】 |
| POST | /screens/:id/delete | 删除 |
| POST | /screens/:id/copy | 复制 |
| POST | /screens/:id/deployed | `{deployed:boolean}` 投放标记 |
| GET | /display/:id | 展示页/预览页取已保存版本（只读） |

### 3.4 模板

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /templates | `?scope=public|personal&category=` |
| GET | /templates/:id | 模板详情（含 `screen` 快照，供模板库预览；个人模板仅本人或管理员） |
| POST | /screens/:id/save-as-template | `{name,category}` → 个人模板 |
| POST | /templates/:id/create-screen | 以此模板新建大屏并返回 screenId |
| POST | /templates/:id/delete | 删除个人模板 |
| POST | /templates/:id/promote | 管理员：提升为公共模板 |

### 3.5 API 配置

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api-configs | 列表 |
| POST | /api-configs | 新建（sql / external） |
| POST | /api-configs/:id/update | 更新 |
| POST | /api-configs/:id/delete | 删除；**被组件引用时禁止删除**，返回引用数量【已确认】 |
| POST | /api-configs/:id/test | `{params}` 试运行 → `{ columns?, rows?, raw }` |

### 3.6 运行时数据

| 方法 | 路径 | 说明 |
|---|---|---|
| GET/POST | /data/:apiId | 执行 SQL 或代理外部 API；query/body 携带占位符参数值；返回需符合组件数据协议（v1 不做映射）；首次取数用参数 `defaultValue`；前端轮询间隔最小 5 秒【已确认】 |

`mock` 配置由演示种子生成，运行时根据 `mockKey` 从 MongoDB `mock_datasets` 集合读取；可使用与其他 API 相同的参数默认值和同名联动机制。管理端不提供手工新建 Mock 配置入口。

API 配置通过 `dataProtocol` 声明兼容的数据结构。编辑器绑定 API 时只展示与组件 `dataProtocol` 完全一致的配置；旧配置未声明协议或协议不匹配时显示明确提示，不允许作为新的绑定选择。`axis` 同时适用于折线图和柱状图，`nameValue` 同时适用于饼图、漏斗图和仪表盘。

### 3.7 资源

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /assets/upload | multipart（图片/视频）→ `{url}`；单文件 ≤ 200MB【已确认】 |

### 3.8 AI 智能设计助手

整屏截图模型能力测试的 `rawContent` 是上游 `message.content` 原文；`parsedContent` 在坐标结构可用时按“从上到下、同一行从左到右”重排组件及 `order`。当背景层已明确为 `interactiveScene` 或 `video` 时，解析层还会移除被模型重复列入 `components` 的视角、播放倍率、显隐或后台视频工具栏；名称以“标题”结尾、紧贴同列同名主体且主体 `title` 为空的游离 `text` 会确定性并入主体；模型把包含稼动率及多项运行状态、且 `notes` 明确声明含仪表盘的 KPI 错标结果会纠正为 `gauge`。随后统一重新编号，其他模型字段不修正。`canvas.backgroundLayer` 描述位于业务组件下方的页面级视觉层：静态照片/插画为 `image`，三维园区、数字孪生或 GIS 为 `interactiveScene`，视频为 `video`，无法确认时为 `unknown`；该字段不包含 URL、Base64 或可持久化资产。组件通常为 8～20 项，允许复杂页面超过 20 项，硬上限为 32 项；不得仅为满足数量目标强行合并独立编辑单元。共享校验额外报告背景层字段、背景控制栏重复识别、游离标题、KPI 与图表互相误并、组件大面积重叠、模型虚构标题、系列数语义和原始阅读顺序问题。调用方只能展示和复制，不得应用到画布。

同一卡片拆出的多个组件必须使用各自子区域 bounds；若复用完全相同的父卡片边界，校验返回明确问题并阻止草稿确认，不由后端猜测切分比例。
若模型已给出图表子区域，且 KPI 父边界完整包含一个同高靠左/靠右或同宽靠上/靠下的主要图表，`parsedContent` 会沿图表边缘收缩 KPI 边界；未提供可验证子区域时仍不猜测比例。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /ai/editor/capabilities | 当前用户：读取 `{visionEnabled,visionUnavailableReason?}`；不返回模型名、BaseURL 或密钥信息 |
| POST | /ai/editor/plan | `AiEditorPlanRequest` → `AiEditorPlanResponse`；生成已有组件/页面样式方案，不写数据库 |
| POST | /ai/editor/generate-component | `AiGenerateComponentRequest` → `AiGeneratedComponent`；返回临时安全组件定义，不直接写大屏 |
| POST | /ai/editor/analyze-screen | `AiScreenAnalysisRequest` → `AiScreenAnalysisTestResponse`；诊断视觉模型整屏拆分能力，不修改画布或数据库 |
| POST | /ai/editor/reference-assets | multipart 单图 → `AiReferenceAsset`；仅 PNG/JPEG/WebP，真实文件头校验，≤10MB、单边≤8192px，默认 24 小时过期 |
| POST | /ai/editor/reference-assets/:id/delete | 主动清理本人临时参考图；未调用时由 TTL 清理 |
| POST | /ai/editor/border-assets | multipart 单图 → `AiBorderAsset`；仅 PNG/WebP，真实文件头校验，≤10MB、单边≤8192px，永久归属当前用户 |
| POST | /ai/editor/border-assets/:id/delete | 删除本人永久边框资产；已写入大屏实例的快照仍保留 assetId，删除后实例显示资产失效占位 |
| GET | /ai/settings | 管理员：读取 `{provider:'deepseek',baseUrl,textModel,visionModel,visionEnabled,apiKeyMasked}` |
| POST | /ai/settings | 管理员：保存 DeepSeek 配置；`apiKey` 只写不读，模型名可配置 |
| POST | /ai/settings/test | 管理员：分别测试文本 JSON 输出与视觉图片输入能力，不返回模型原始敏感信息 |

DeepSeek 默认值：`baseUrl=https://api.deepseek.com`、`textModel=deepseek-v4-flash`、`visionModel=deepseek-v4-flash-vision-exp`。文本方案使用 Chat Completions JSON Output；空内容自动重试一次，第二次仍为空或契约不合法时返回 4302，不改变画布。

`scope=selected` 时 `componentIds` 至少 1 项；`scope=page` 时目标由 `pageId` 和上下文决定；`scope=screen` 只有功能开关开启且组件总数不超过 200 时可用。当前页最多 50 个组件。服务端必须验证用户可访问 `screenId`，并重新校验所有动态定义和目标 ID；不得信任客户端传入的 `styleSchema`。

### 3.9 个人组件预设

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /component-presets | `?scope=personal|public&category=chart|decoration`；personal 仅返回本人 |
| GET | /component-presets/:id | 个人预设仅本人或管理员可读，公共预设登录用户可读 |
| POST | /component-presets | 从已通过校验的临时/现有组件创建个人预设；`ownerId/scope/specVersion` 由后端写入 |
| POST | /component-presets/:id/update | 本人更新名称、描述和定义；`specVersion + 1`，不影响已有实例 |
| POST | /component-presets/:id/copy | 本人复制为新的个人预设 |
| POST | /component-presets/:id/delete | 本人删除组件库入口；不扫描或修改已有大屏实例 |
| POST | /component-presets/:id/promote | 仅管理员：复制当前定义为公共预设；M9 首期不提供前端 UI |

个人预设实例化时必须把完整 `definition` 复制到 `ComponentDoc.definitionSnapshot`；运行时不得依赖预设仍然存在。更新不保留可回滚历史版本库，仅递增 `specVersion`；已有实例继续使用自己的旧快照。

### 3.10 废弃 AI 客服接口

以下接口自 v0.4 起停止前端新调用，兼容期内可保留后端实现；知识库数据不得随升级自动删除：`POST /ai/chat`、`GET/POST /ai/kb-docs`、`POST /ai/kb-docs/:id/update`、`POST /ai/kb-docs/:id/delete`。

### 3.11 天气（内置数据源）【已确认】

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /weather | `?adcode=xxx`（预留 `location=lat,lng`）；后端注入腾讯云 key 代理 `https://apis.map.qq.com/ws/weather/v1/`，固定附带 `type=now&added_fields=air`，原样透传腾讯响应 `{status,message,result}` |

- 腾讯云 key 仅存后端配置项，从环境变量 `WEATHER_KEY` 读取（见根目录 `.env.example`；密钥轮换或配额不足时改配置重启即可），**不下发浏览器、禁止写入任何文档或前端代码**【已确认】。
- 天气组件轮询默认 300 秒。

---

## 4. 错误码（v1 精简）

| code | 含义 |
|---|---|
| 0 | 成功 |
| 401 | 未登录/令牌失效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 4001 | 参数校验失败（含大屏保存 `updatedAt` 版本冲突） |
| 4101 | SQL 执行失败（语法/非只读） |
| 4102 | 外部 API 代理失败 |
| 4201 | 数据不符合组件协议（试运行提示） |
| 4301 | AI 模型未配置、能力不支持或服务不可用 |
| 4302 | AI 输出为空、格式错误或未通过安全契约校验 |
| 4303 | AI 方案已过期（editorRevision 不一致） |
| 4304 | AI 请求范围超限或仍有请求正在处理 |
| 4305 | 参考图格式、文件头、大小或归属不合法 |
| 4401 | 个人组件定义或安全渲染描述不合法 |
