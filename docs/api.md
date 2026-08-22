# 大屏配置系统 接口定义（api.md）

> 版本：v0.3.1（交付开发版）。与 PRD v0.3、architecture.md v0.3 配套；数据模型以本文第 2 章 TypeScript 接口为唯一契约。
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
  type: 'sql' | 'external';
  sql?: string;                      // type=sql；:paramName 形式引用参数
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

### 3.7 资源

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /assets/upload | multipart（图片/视频）→ `{url}`；单文件 ≤ 200MB【已确认】 |

### 3.8 AI 客服

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /ai/chat | `{question, sessionId?}` → `{answer}`（基于知识库检索增强） |
| GET | /ai/kb-docs | 管理员：知识库文档列表 |
| POST | /ai/kb-docs | 管理员：上传文档（v1 支持 md / txt）【已确认】 |
| POST | /ai/kb-docs/:id/update | 管理员：更新文档（重新分块索引） |
| POST | /ai/kb-docs/:id/delete | 管理员：删除文档 |
| GET | /ai/settings | 管理员：读取大模型 API 配置 |
| POST | /ai/settings | 管理员：保存大模型 API 配置 `{baseUrl, apiKey, chatModel, embeddingModel?}`（apiKey 不回显明文） |

### 3.9 天气（内置数据源）【已确认】

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
