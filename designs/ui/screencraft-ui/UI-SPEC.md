# ScreenCraft UI 设计交付文档（UI-SPEC）

> 交付对象：Cursor（前端开发）
> 配套物：本目录下可交互高保真原型（纯静态 HTML/CSS/JS，直接打开 `index.html` 即可预览全部页面）
> 上游文档：`docs/PRD.md`（需求）· `docs/design.md`（设计规范）· `docs/api.md`（接口契约）· `docs/architecture.md`（架构）· `docs/milestones.md`（里程碑）· `docs/golden-sample.md`（组件模子）
> 设计契约：`.work/design-contract.md`（原型实现的唯一真理源，页面与本文档冲突时以契约 + 原型代码为准）
> v0.3 修订：§5.5 工具栏以 PRD 4.4.1 全集为准（原型为子集）；§5.6 接口路径对齐 api.md；§7.1 EP 边界按 design.md §2.4 定稿；§5.3 模板数口径修正为 63。

---

## 1. 原型说明

| 项 | 说明 |
|---|---|
| 形态 | 纯静态 HTML + CSS + 原生 JS，**零外部依赖、离线可开**（无 CDN / 无字体文件 / 无网络请求） |
| 入口 | `index.html`（总览导航页，含页面索引与设计系统摘要） |
| 数据 | `mock.js` 集中提供 `window.DB`，页面禁止散落硬编码业务数据 |
| 接口 | `api.js` 提供与 `docs/api.md` 同签名的异步桩函数（含 300~800ms 模拟延迟），每个函数带 `// TODO: 替换为 request.xxx` 注释 |
| 图标 | `icons.js` 内置 Lucide 内联 SVG（`<i data-icon="name">` 自动挂载 / `icon(name,size)` 字符串），**严禁 emoji** |
| 图表 | `charts.js` SVG 迷你图表（原型视觉占位）。真实开发一律换成 **ECharts 5.x** |
| 主题 | 深色为默认（`:root`）；管理端页面在 `<html>` 上加 `data-theme="light"` 覆写变量 |

### 目录结构

```
designs/ui/screencraft-ui/
├── index.html        # 原型总览导航（深色封面）
├── login.html        # 登录页（浅色独立页）
├── projects.html     # 项目管理（管理端）
├── screens.html      # 大屏列表 + 模板库（管理端）
├── editor.html       # 编辑器（深色，核心页）
├── api-config.html   # API 配置（管理端）
├── display.html      # 展示页 / 预览页（深色运行时，?preview=1 切换预览模式）
├── admin.html        # 管理后台：用户管理 + AI 设置（管理端）
├── styles.css        # 设计 tokens + 全部共享组件类（只读基准）
├── icons.js / mock.js / api.js / charts.js / nav-active.js
├── assets/login_illustration.jpg
└── UI-SPEC.md        # 本文档
```

---

## 2. 设计系统（Design Tokens）

### 2.1 双界面体系（two surfaces）

| 界面 | 页面 | 风格 |
|---|---|---|
| 管理端（浅色） | projects / screens / api-config / admin | minimal-light 商务浅色，克制留白，单一主色 |
| 编辑器 / 运行时（深色） | editor / display / index 封面 | tech-dark 工业深蓝 `#0D1730`，高亮青 `#35E0FF` 点缀，数字等宽 |

审美方向：**industrial-utilitarian（工业实用主义）**——信息密度高、对齐严谨、装饰克制；深色区用细边框 + 微渐变面板营造层次，禁止平铺死黑。

### 2.2 色彩

```
深色（默认 :root）                 浅色（html[data-theme="light"]）
--bg      #0D1730                  #F5F7FA
--panel   #12203C                  #FFFFFF
--panel2  #16294E                  #FAFBFC
--border  #1E3A66                  #E4E7ED
--t1      #EAF2FF（主文本）         #303133
--t2      #9FB3D1（次文本）         #909399
共用：--pri #2F7FF7（主色） --pri-hover #4A92FF --pri-active #1E6AE0 --pri-bg rgba(47,127,247,.14)
深色强调：--acc #35E0FF
状态：--ok #22C55E  --warn #F59E0B  --err #EF4444
遮罩：--mask（弹窗背景，深色 rgba(6,11,24,.62) / 浅色 rgba(15,23,42,.45)）
```

### 2.3 字体 / 字号 / 圆角 / 阴影 / 间距

- 正文：`"HarmonyOS Sans SC","PingFang SC","Microsoft YaHei",sans-serif`
- 数字等宽（KPI / 时钟 / 表格数值）：`"DIN Alternate","Bahnschrift","Roboto Mono",monospace` → 类名 `.num`
- 字号阶梯：12 / 13 / 14 / 16 / 20 / 24 / 32（大屏标题 34~38 + letter-spacing）
- 圆角：`--r-sm 4 / --r-md 6 / --r-lg 8 / --r-xl 12`
- 阴影：`--sh-sm / --sh-md / --sh-lg`（深浅两套，见 styles.css）
- 间距基数 4px；内容区最大宽度 1440px（`--content-w`）；顶栏高 56px（`--topbar-h`）

### 2.4 图标

Lucide 线性图标，stroke=2，统一 `currentColor`。常用名清单见契约 §10。**禁止 emoji、禁止其他图标库。**

---

## 3. App Shell（管理端四页共用，逐字节一致）

结构：`header.topbar`（fixed，含品牌 + 顶部导航 + 用户菜单）+ `main.app-content`（`padding-top: topbar+28px`，max-width 1440 居中）。

- 导航项**冻结**：项目(folder) → API 配置(plug) → 管理后台(settings)，顺序/图标/文案不得增删改。
- 激活规则唯一：`nav-active.js` 按 `body[data-page]` 设置 `.active`（screens 页映射到 projects 项）。页面里**不要手写 active**。
- 用户菜单：头像 + 名称 + 下拉（管理后台 / 退出登录）。原型默认管理员身份，全部导航可见。
- 真实开发映射：做成 `AppLayout.vue` + `useAuth()`（role==='admin' 才渲染「管理后台」项），`<router-link>` 替换 `<a>`。

编辑器与展示页不走 App Shell，各自独立全屏布局（见 §5.5 / §5.7）。

---

## 4. 共享组件类（styles.css 已实现，开发时 1:1 移植为 Vue 组件）

| 类名 | 组件 | 关键状态 |
|---|---|---|
| `.btn .btn-pri .btn-ghost .btn-danger .btn-sm .btn-lg` | 按钮 | hover 描边主色 / active 下沉 / disabled 45% 透明 |
| `.input .select .textarea .input-sm .input-wrap` | 输入 | focus 主色描边 + 2px 主色光晕；`.is-err` 错误红边 |
| `.switch .checkbox` | 开关 / 多选 | switch 36×20，选中主色 |
| `.tag .tag-ok .tag-warn .tag-err .tag-info .tag-acc` | 标签 | 高 22px，浅底深字 |
| `.chip` | 筛选标签 | 胶囊形；`.active` 主色 |
| `.card .card-hover` | 卡片 | hover 上浮 3px + 主色描边 |
| `.tabs .tab` | 下划线页签（管理端） | active 主色 + 2px 底线 |
| `.seg .seg-item` | 分段选择（编辑器） | active 主色底白字 |
| `.table` | 表格 | 表头次级底；hover 行主色浅底；行操作 `.row-ops` |
| `.modal-wrap .modal(.modal-lg)` | 弹窗 | `.show` 显示；遮罩 blur(3px)；pop 入场动画 |
| `.toast` | 全局提示 | `toast(msg, 'ok|err|warn|info')`，2.2s 自动消失 |
| `.dropdown-menu` | 下拉菜单 | `.show` 显示；`.danger` 红色项；`.divider` |
| `.form-row .form-label .form-tip .form-err` | 表单 | label 96px 右对齐 |
| `.page-head .crumb .empty .skeleton` | 页头/面包屑/空态/骨架 | 空态图标 + 13px 灰字 |

编辑器专用：`.ed-*`（工具栏/三栏）、`.tree-node`（页面树）、`.lib-*`（组件库）、`.cv-comp/.cv-handle/.cv-label`（画布选中态）、`.p-sec/.f-row/.f-label/.f-ctrl`（右侧设置表单）、`.mini-table`（静态数据表）、`.ai-fab/.ai-drawer/.ai-msg`（AI 客服）。
展示页专用：`.stage/.stage-inner`（缩放舞台）、`.d-panel/.d-title`（面板）、`.ctrl-bar/.ctrl-btn`（控制条）。

---

## 5. 页面规格

> 通用状态约定：异步加载 → `.skeleton` 骨架；列表为空 → `.empty`；删除类操作 → `confirmDialog` 二次确认；操作结果 → toast。

### 5.1 login.html 登录页（浅色独立页）

- 布局：左右分栏。左侧品牌 + 标语 + 三条卖点 + 插画（`assets/login_illustration.jpg`）；右侧 380px 登录卡片。
- 交互：用户名/密码必填校验（`.is-err` + `.form-err`）；密码可见切换（eye / eye-off）；记住我；忘记密码 → toast 提示联系管理员；登录按钮 loading「登录中...」。
- 规则：仅管理员可建号，**无自助注册**；演示账号 `admin / ScreenCraft@2026`；错误凭据 toast 报错并标红密码框；成功 → toast + 跳 `projects.html`。
- 真实开发：`POST /auth/login`，JWT 存 localStorage（有效期 7 天，无刷新，过期重新登录）。

### 5.2 projects.html 项目管理

- 页头 + 搜索（前端过滤）+ 「新建项目」。
- 项目卡片网格：渐变方块图标 + 名称 + more 菜单（重命名 / 删除）+ 「N 块大屏 · 更新时间」；点击卡片 → `screens.html?pid=xx`。
- 新建/重命名弹窗：名称必填 ≤20 字；删除二次确认（文案含大屏数量提示）。
- 真实开发映射：`GET /projects`、`POST /projects`、`POST /projects/:id/update`、`POST /projects/:id/delete`。

### 5.3 screens.html 大屏列表 + 模板库

- 面包屑：项目 / {项目名}；从 URL `pid` 定位项目（非法回退第一个）。
- 页签一 大屏列表：分类 chips（全部/通用/工业/政务/医疗/交通/能源）；卡片 = 缩略图（原型用 `thumbSVG`，真实开发为构建期自动截图）+ 状态标签（已投放 tag-ok / 使用中 tag-acc）+ hover 浮层操作（编辑 → editor / 展示 → display）+ more（复制 / 删除）。
  - 删除保护：已投放大屏删除时强警示文案。
  - 新建大屏弹窗：名称 + 模板单选网格（默认选中第一个）→ 创建后进编辑器。
- 页签二 模板库：范围 seg（全部/公共/个人）+ 分类 chips；模板卡片 hover「使用模板」。
- 真实开发映射：`GET /projects/:pid/screens`、`GET /templates?scope=`、模板共 63 个（7 类图表×5 变体 + 指标卡×12 + 表格×2 + 装饰 7〔天气×2 + 边框×5〕 + 媒体 2 + 控件 5，与 PRD §5.1 一致）。

### 5.4 api-config.html API 配置

- 表格列：名称 / 类型（SQL 生成 | 外部接口）/ 请求方式 / 接口路径 / 更新时间 / 引用数 / 状态 / 操作。
- **删除保护（硬性需求）**：`refCount>0` 时禁止删除，toast 提示「被 N 个组件引用」；`refCount=0` 才允许二次确认后删除。
- 编辑/新建弹窗（modal-lg）：类型 seg 切换字段——SQL 类显示 SQL 编辑器（等宽字体；真实开发用 **CodeMirror 6**），外部类显示接口地址；参数表（参数名/类型/默认值，可增删行）；占位符 `{{参数名}}` 约定；仅支持 SELECT 只读。
- 试运行弹窗：参数表单 → 运行（loading）→ 结果表格 + 行数/耗时。
- 真实开发映射：`GET /api-configs`、`POST /api-configs`（新建）、`POST /api-configs/:id/update`、`POST /api-configs/:id/delete`、`POST /api-configs/:id/test`。SQL 走内置只读业务库（默认 MySQL）。

### 5.5 editor.html 编辑器（核心页，深色）

三栏布局：左 288px（页面树 / 组件库）· 中画布（1920×1080，点阵网格背景）· 右 324px（设置面板）。顶部 48px 工具栏。

- 工具栏：返回 / 大屏名 + 保存状态标签（未保存 warn ↔ 已保存 ok）/ 撤销重做 / 缩放（20%~400%）/ 网格开关 / 快捷键弹窗 / 保存 / 保存为模板 / 预览（→ display.html?preview=1）/ more（进入展示页、导出 JSON、清空画布）。
  **真实开发工具栏以 PRD 4.4.1 全集为准**（原型只做了子集）：另需实现——页面层级开关、图表/装饰/媒体/控件四分类入口（点击展开左侧组件库并定位）、适配方式下拉（画面居中/宽度铺满/高度铺满/全屏拉伸）、适应画布、画面居中；快捷键含 Ctrl+S 保存。
- 左侧「页面」：页面树（含子页面），hover 显示重命名/删除，支持新建页面。
- 左侧「组件」：搜索 + 四分类（图表/装饰/媒体/控件）+ 组件网格（缩略图 + 名称 + ×变体数）；点击添加到画布中央。
- 画布：组件可选中（主色描边 + 名称角标 + 四角手柄）、可拖动、右下角手柄可缩放；Delete 删除；Esc 取消选中；Ctrl+S 保存。
- 右侧面板：
  - **未选中组件 → 页面设置**：大屏名称 / 分辨率 / 背景（填充方式 cover|contain|stretch|repeat|center、背景色、背景图上传）/ 边框套色（5 套：默认深蓝/工业蓝/科幻紫/青绿/橙金）/ 全局轮询。
  - **选中组件 → 样式 / 数据 / 事件三页签**：
    - 样式：X/Y/宽/高（数字双向同步画布）、名称、主题色、显示标题开关、图层上移/下移、锁定、删除。
    - 数据：图表类 = seg 静态数据（可编辑 mini-table，支持添加行/列；真实开发用 **vxe-table**）/ API 接入（选择 API + 轮询间隔 + defaultValue）；视频 = 文件上传 / URL；其他控件提示无数据配置。
    - 事件：按钮/下拉框显示事件卡（触发方式 → 触发条件 → 执行动作），支持添加/编辑/删除；其余组件空态提示。
- AI 客服悬浮（右下 fab → 抽屉）：消息流 + 快捷问题 chips + 输入发送；真实开发接自研轻量 RAG。
- 真实开发映射：画布用 `vue-draggable-resizable-gorkys`；布局 JSON 结构与 `docs/api.md` 的 `ScreenDoc.pages[].components` 对齐（模板注册记录见 `docs/golden-sample.md`）。

### 5.6 admin.html 管理后台

- 页签一 用户管理：表格（用户名/角色标签/状态 switch/创建时间/操作）；新建用户弹窗（用户名正则、角色、初始密码 + 首次登录强制修改提示）；重置密码二次确认；启用/禁用 switch（admin 行禁用操作）。
- 页签二 AI 设置：
  - 模型配置卡：Base URL / API Key（密文 + 可见切换）/ 对话模型 / Embedding 模型（含「不使用 → 降级 BM25」选项）/ 测试连接 / 保存。
  - 知识库卡：上传文档（**v1 仅 .md / .txt**，非法后缀 toast 拦截）+ 文档表（名称/大小/更新时间/已索引状态/删除）。
- 真实开发映射（与 api.md §3.1 / §3.8 一致）：`GET /users`、`POST /users`（新建）、`POST /users/:id/reset-password`、`POST /users/:id/status`（启用/禁用）；AI 设置 `GET/POST /ai/settings`、知识库 `GET/POST /ai/kb-docs` 等。

### 5.7 display.html 展示页 / 预览页（深色运行时）

- 舞台：1920×1080 设计稿按窗口等比缩放（`--scale = min(w/1920, h/1080)`），居中显示。
- 内容：大标题（渐变字 + 装饰线）+ 本地时钟（前端本地时间，每秒刷新）+ 天气（`fetchWeather(adcode)`，后端代理腾讯云 LBS）+ 14 个数据面板（KPI×4、折线、环形饼、仪表、柱状、告警表、双轴组合、漏斗、视频占位、雷达、公告）。
- 展示模式（默认）：右上控制条（截图 / 大屏配置 → editor / 全屏），鼠标静止 3s 自动淡出；右下 AI 客服。
- 预览模式（`?preview=1`）：**无控制条、无 AI 悬浮**，纯净全屏，进入时 toast 提示「展示最近保存版本」。
- 截图真实实现：html2canvas（视频组件以图标占位图代替，已知限制）。

---

## 6. Mock 数据与 API 桩映射

| api.js 桩函数 | 真实接口（docs/api.md） | 使用页面 |
|---|---|---|
| `fetchProjects()` | GET /projects | projects |
| `createProject(name)` | POST /projects | projects |
| `fetchScreens(pid)` | GET /projects/:pid/screens | screens |
| `fetchTemplates(scope)` | GET /templates?scope= | screens |
| `fetchApiConfigs()` | GET /api-configs | api-config |
| `testRunApi(id, params)` | POST /api-configs/:id/test | api-config |
| `fetchUsers()` | GET /users | admin |
| `fetchKbDocs()` | GET /ai/kb-docs | admin |
| `saveAiSettings(s)` | POST /ai/settings | admin |
| `aiChat(question)` | POST /ai/chat | editor / display |
| `fetchWeather(adcode)` | GET /weather?adcode= | display |

统一响应 `{code:0, message:'ok', data}`；v1 REST 只用 GET/POST（更新删除走 `POST /xxx/update|delete`）。真实开发先做 Axios 统一封装（拦截器、token 注入、解包、401 跳转），业务代码不得裸用 Axios。

---

## 7. Cursor 开发交接要点

1. **样式迁移（EP 边界已定稿，详见 design.md §2.4 与 .cursorrules §3）**：`styles.css` 的 tokens 与布局/皮肤类（topbar、card、tag、chip、table、page-head、`.ed-*` 系列）迁移为全局样式/SCSS 变量并封装为少量布局展示型 Vue 组件；**弹窗、toast、表单控件一律用 Element Plus（覆盖主色 #2F7FF7），不自研 BaseButton/BaseModal/BaseToast**；大屏运行时不引 EP 重组件。
2. **主题**：管理端布局组件挂载时给 `<html data-theme="light">`；编辑器/展示页移除该属性。
3. **导航**：App Shell 做成单一 Layout 组件，激活态由路由计算（等价 `body[data-page]` 规则），禁止各页面自绘导航。
4. **图表**：原型 SVG 仅表达「长什么样」，真实实现一律 ECharts 5.x；数据协议按 PRD 5.2 四族（轴族/组合图/雷达/名值族）。
5. **画布**：`vue-draggable-resizable-gorkys` 承担拖动/缩放/手柄；选中态、快捷键（Ctrl+S/Z/C/V、Delete、方向键微调、Esc）按原型行为实现。
6. **静态数据表**：vxe-table 动态行列；SQL 编辑器：CodeMirror 6。
7. **交互底线即验收底线**：所有按钮有行为、删除有二次确认、加载有骨架、空态有提示、表单有校验。
8. **图标**：引入 lucide-vue-next，图标名与原型 `icons.js` 一致，便于对照。

## 8. 验收自查清单

- [ ] 8 个页面全部可从 index.html 到达，页面间跳转无死链
- [ ] 管理端四页导航位置/顺序/激活态完全一致
- [ ] 深浅两界面 tokens 与本文档一致，无自创颜色
- [ ] 每个可点元素均有反馈（跳转 / 弹窗 / toast / 状态变化）
- [ ] 删除类操作均有二次确认；API 删除有引用保护
- [ ] 预览模式无控制条；展示模式控制条三按钮可用
- [ ] 无 emoji 图标、无 CDN 依赖、离线可开
