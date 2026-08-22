# Design Contract — ScreenCraft 高保真交互原型（已冻结）

> 所有页面必须严格遵循本契约。禁止自创颜色/字号/圆角/导航结构。
> 共享层文件（只读引用，不得修改）：`styles.css` / `icons.js` / `mock.js` / `api.js` / `charts.js` / `nav-active.js`

## 1. 技术栈与交付形态

- 纯静态 HTML + CSS + 原生 JS，零外部依赖，离线可开（禁止 CDN：字体、图标、图表全部本地/内联）。
- 项目目录：`designs/ui/screencraft-ui/`；页面间用相对链接跳转。
- 图标：一律 `icons.js` 内置 Lucide 内联 SVG（`<i data-icon="name"></i>` 自动挂载，或 JS 里 `icon(name)`）；**严禁 emoji 当图标**。
- 图表：一律 `charts.js` 的 SVG 迷你图表函数（line/bar/pie/donut/gauge/funnel/radar/kpi），不引 ECharts。

## 2. 风格定位

- 双界面（two surfaces）：
  - **管理端**（projects/screens/api-config/admin）：minimal-light 商务浅色，克制留白 + 单一主色 #2F7FF7。
  - **编辑器/运行时**（editor/display/index 封面）：tech-dark 工业深蓝，底色 #0D1730 + 高亮青 #35E0FF 点缀 + 数字等宽。
- 审美方向：industrial-utilitarian（工业实用主义）：信息密度高、对齐严谨、装饰克制；深色区用细边框 + 微渐变面板营造层次，禁止平铺死黑。
- 语气关键词：专业 / 克制 / 数据感。

## 3. Design Tokens（已在 styles.css 落地，禁止另起值）

```
深色（默认 :root）            浅色（html[data-theme="light"]）
--bg:      #0D1730            #F5F7FA
--panel:   #12203C            #FFFFFF
--panel2:  #16294E            #FAFBFC
--border:  #1E3A66            #E4E7ED
--t1:      #EAF2FF            #303133
--t2:      #9FB3D1            #909399
--pri:     #2F7FF7（共用）     --pri-hover:#1E6AE0  --pri-active:#1A5FC4  --pri-bg:rgba(47,127,247,.12)
--acc:     #35E0FF            --ok:#22C55E  --warn:#F59E0B  --err:#EF4444
字体：--font-body:"HarmonyOS Sans SC","PingFang SC","Microsoft YaHei",sans-serif
      --font-num:"DIN Alternate","Bahnschrift","Roboto Mono",monospace
字号阶梯：12/13/14/16/20/24/32；圆角：--r-sm4 --r-md6 --r-lg8 --r-xl12
阴影：--sh-sm / --sh-md / --sh-lg（见 styles.css）；间距基数 4px
```

## 4. 组件类（styles.css 已提供，直接用类名）

`.btn .btn-pri .btn-ghost .btn-danger .btn-sm`（含 hover/active/disabled）
`.input .select .textarea .switch .checkbox .radio`（focus 态 pri 描边）
`.card .card-hover` `.tag .tag-ok .tag-warn .tag-err .tag-info .tag-acc`
`.tabs`（下划线式，管理端）`.seg`（分段选择，编辑器）
`.table`（表头 #F5F7FA/深底、hover 行、空态 `.empty`）
`.modal-wrap .modal .modal-head .modal-body .modal-foot`（`.show` 显示）
`.toast`（api.js 提供 `toast(msg, type)` 全局函数）
`.chip`（筛选标签）`.dropdown-menu`（`.show`）`.form-row .form-label`
`.page-head`（页标题 + 描述 + 右侧操作区）`.toolbar-tip`（title 属性即可）

## 5. App Shell —— 管理端（projects/screens/api-config/admin 逐字节复用）

```html
<body data-page="projects">            <!-- 唯一每页不同处：data-page 值 -->
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="projects.html"><span class="brand-mark">S</span><span class="brand-name">ScreenCraft</span><span class="brand-sub">大屏配置平台</span></a>
      <nav class="topnav">
        <a data-nav="projects" href="projects.html"><i data-icon="folder"></i>项目</a>
        <a data-nav="api-config" href="api-config.html"><i data-icon="plug"></i>API 配置</a>
        <a data-nav="admin" href="admin.html"><i data-icon="settings"></i>管理后台</a>
      </nav>
      <div class="topbar-right">
        <div class="user-chip" id="userChip">
          <span class="avatar">管</span><span class="user-name">管理员</span><i data-icon="chevron-down" data-size="14"></i>
          <div class="dropdown-menu" id="userMenu">
            <a href="admin.html"><i data-icon="settings" data-size="14"></i>管理后台</a>
            <a href="login.html"><i data-icon="log-out" data-size="14"></i>退出登录</a>
          </div>
        </div>
      </div>
    </div>
  </header>
  <main class="app-content"><!-- 页面内容只放这里 --></main>
  <div class="toast-wrap"></div>
  <script src="icons.js"></script><script src="mock.js"></script><script src="api.js"></script><script src="nav-active.js"></script>
  <!-- 页面自己的 <script> 放最后 -->
</body>
```

- 导航项冻结：项目(folder) / API 配置(plug) / 管理后台(settings)，顺序、图标、文案不得增删改。
- 激活规则唯一：`nav-active.js` 按 `body[data-page]` 设置 `.active`（screens 页映射到 projects 项）。页面里**不要手写 active**。
- 管理员可见「管理后台」；原型默认以管理员身份，全部可见。

## 6. 页面清单

| 文件 | 界面 | 职责 | 导航去向 |
|---|---|---|---|
| index.html | 深色封面 | 原型总览导航（页面索引 + 设计说明） | 所有页面 |
| login.html | 浅色独立 | 登录（左插画右表单，demo: admin / ScreenCraft@2026） | → projects |
| projects.html | 管理端 | 项目卡片列表：搜索/新建弹窗/重命名/删除二次确认 | → screens |
| screens.html | 管理端 | 大屏列表 + 模板库 Tab：分类筛选/投放标记/复制/删除/编辑入口 | → editor / display |
| editor.html | 深色编辑器 | 工具栏/页面树/组件库(4分类)/画布(可选中)/右侧三 Tab 设置/页面设置/AI 悬浮 | → display（预览） |
| api-config.html | 管理端 | API 列表 + SQL/外部两种表单 + 参数表 + 试运行 + 删除保护 | — |
| display.html | 深色运行时 | 展示页：缩放渲染 + 右上控制条(截图/配置/全屏) + AI 悬浮；可切预览模式(无控制条) | → editor |
| admin.html | 管理端 | 用户管理 + AI 设置（知识库文档 + 模型配置） | — |

## 7. Mock Schema（mock.js 唯一数据源，window.DB）

- `DB.user {name:'管理员', role:'admin'}`
- `DB.projects [{id,name,screenCount,updatedAt}]` 6 条（智慧水务/能源管理/园区安防/生产车间/客服运营/数据中台）
- `DB.screens [{id,projectId,name,category,deployed,inUse,updatedAt,thumbSeed}]` 10 条；category ∈ 通用/工业/政务/医疗/交通/能源
- `DB.templates [{id,name,scope:'public'|'personal',category,thumbSeed}]` 8 条
- `DB.componentLib = { charts:[{name,variants,icon}], deco:[...], media:[...], controls:[...] }`（名称与 PRD 5.1 一致）
- `DB.apiConfigs [{id,name,type:'sql'|'external',method,path,updatedAt,refCount,status}]` 6 条
- `DB.users [{id,username,role,enabled,createdAt}]` 5 条
- `DB.kbDocs [{id,name,size,updatedAt,status:'indexed'}]` 4 条
- `DB.aiSettings {baseUrl,apiKey:'sk-****abcd',chatModel:'qwen-max',embeddingModel:'text-embedding-v3'}`
- `DB.canvas [{id,type,name,x,y,w,h}]` 编辑器画布示例组件（标题/折线/饼图/KPI×4/表格/下拉+按钮）
- `DB.displayLayout` 展示页大屏组件布局（同 canvas 风格，更完整）

## 8. API Stub（api.js，签名即未来真实接口，带 // TODO 注释）

`fetchProjects() / createProject(name) / fetchScreens(projectId) / fetchTemplates(scope) / fetchApiConfigs() / testRunApi(id,params) / fetchUsers() / fetchKbDocs() / saveAiSettings(s) / aiChat(question)`
统一返回 `{code:0,data}`，内置 delay(300~600ms) 展示 loading 态；`toast(msg,type)` 全局提示。

## 9. 交互底线（每页必须）

真实可点：Tab 切换/弹窗开关/表单校验/列表 hover/删除二次确认/toast 反馈；加载用骨架或 loading 态（delay 已内置）；空态用 `.empty`；禁止死按钮（无行为的按钮至少 toast('原型演示：xxx')）。

## 10. 常用图标名（icons.js 已内置）

search plus x check chevron-down/left/right/up more-horizontal trash-2 copy eye eye-off lock unlock save settings users user folder folder-plus monitor maximize camera image video type mouse-pointer bar-chart-3 pie-chart activity gauge table-2 layout-grid cloud-sun frame database plug bot upload refresh-cw rotate-ccw rotate-cw zoom-in zoom-out layers arrow-up arrow-down file-text log-out external-link alert-triangle check-circle info send sparkles move list play layout-template clock filter pencil download link sliders zap home square grid droplets
