# ScreenCraft 大屏配置系统

面向运营 / 业务人员的**拖拽式数据大屏配置平台**：在浏览器里搭大屏、接数据、预览投放，无需写前端代码。

| | |
|---|---|
| 产品形态 | Web：管理端 + 编辑器 + 预览 / 展示页 |
| 典型用户 | 业务搭建大屏；技术配置 API；管理员管账号与 AI |
| 工程结构 | `frontend/`（Vue3）· `backend/`（NestJS）· `packages/shared/`（契约） |

---

## 能做什么

- **项目管理**：多项目组织大屏；新建 / 重命名 / 删除（级联提示）
- **大屏编辑**：1920×1080 画布，图表 / 指标卡 / 表格 / 天气 / 边框 / 媒体 / 控件等组件拖拽配置
- **数据绑定**：静态表格编辑，或绑定 API（SQL 生成 / 外部登记），支持轮询
- **交互联动**：跳页面、开链接、显隐组件、调 API；下拉框可按同名参数驱动其他组件取数
- **模板库**：个人模板与公共模板；预览、以此新建；管理员可将个人模板提升为公共
- **预览与投放**：预览页全屏；展示页适配缩放（居中 / 宽铺满 / 高铺满 / 拉伸）；投放标记
- **API 配置**（管理员）：登记 SQL / 外部接口、试运行、引用保护
- **AI 客服**：编辑器与展示页右下角悬浮问答；管理后台配置模型与知识库手册

---

## 环境要求

- Node.js ≥ 20
- pnpm
- MongoDB（本机默认 `mongodb://localhost:27017/screencraft`）
- （可选）只读 MySQL：供 SQL 类 API 取数
- （可选）腾讯位置服务 Key：天气组件
- （可选）OpenAI 兼容大模型：AI 客服

---

## 快速启动

```bash
# 1. 安装依赖
pnpm i

# 2. 配置环境变量（把根目录模板拆到后端 / 前端）
cp .env.example backend/.env
# 按需编辑 backend/.env：MONGO_URI、JWT_SECRET、WEATHER_KEY、BUSINESS_DB_DSN、LLM_* 等
# 前端开发默认走 Vite 代理，一般使用 VITE_API_BASE=/api/v1

# 3. 启动 MongoDB（仓库脚本，Windows）
pnpm mongo:start

# 4. 写入种子数据（管理员 + 演示账号 + 演示项目）
pnpm seed

# 5. 启动前后端
pnpm dev
```

| 服务 | 地址 |
|---|---|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:3000/api/v1 |

---

## 演示账号

| 账号 | 初始密码 | 说明 |
|---|---|---|
| `admin` | `ScreenCraft@2026` | 管理员；**首次登录强制改密**；可进管理后台 / API 配置 / 提升公共模板 |
| `demo` | `Demo@2026` | 普通成员；可做项目与大屏，无管理后台 |

> 生产环境请务必修改 `SEED_ADMIN_*`、`JWT_SECRET` 等，切勿使用默认密钥上线。

---

## 使用导览

1. **登录** → 进入「项目」列表，新建或进入已有项目  
2. **大屏列表** →「新建空白大屏」进入编辑器；或在「模板库」预览 / 以此新建  
3. **编辑器**  
   - 左侧：页面树 / 组件库（明暗主题预览）  
   - 中间：画布拖拽、缩放、组合  
   - 右侧：数据绑定 · 样式 · 交互事件  
   - 顶部：保存、预览、适配方式、撤销重做  
4. **预览** → 新标签全屏查看已保存版本（有未保存时可选「保存并预览」）  
5. **展示** → 大屏菜单「进入展示页」，用于投屏；右上角截图 / 配置 / 全屏  
6. **API（管理员）** → 顶部「API 配置」登记接口后，在组件数据面板中绑定  
7. **管理后台（管理员）** → 用户管理、AI 模型与知识库手册  

常见路径：

| 页面 | 路径示例 |
|---|---|
| 登录 | `/login` |
| 项目 | `/projects` |
| 大屏 / 模板 | `/projects/:projectId/screens` |
| 编辑器 | `/editor/:screenId` |
| 预览 | `/preview/:screenId` |
| 展示 | `/display/:screenId` |
| API 配置 | `/api-configs` |
| 管理后台 | `/admin` |

---

## 常用命令

```bash
pnpm dev          # 并行启动 shared 构建监听 + 前端 + 后端
pnpm build        # 构建全部包
pnpm test         # shared / backend 单测
pnpm seed         # 幂等种子（已存在则跳过）
pnpm previews     # 重新生成组件库预览图（frontend/public/previews）
pnpm mongo:start  # 启动本机 MongoDB 脚本
```

---

## 配置说明（摘要）

完整模板见 [`.env.example`](.env.example)。后端关键项：

| 变量 | 用途 |
|---|---|
| `MONGO_URI` | 系统库（用户 / 项目 / 大屏 / 模板等） |
| `JWT_SECRET` | 登录令牌密钥 |
| `WEATHER_KEY` | 腾讯天气代理（仅后端，不下发前端） |
| `BUSINESS_DB_DSN` / `MYSQL_URL` | SQL 类 API 只读库 |
| `PROXY_HOST_WHITELIST` | 外部 API 域名白名单（防 SSRF） |
| `LLM_*` | AI 客服默认模型配置（也可在管理后台覆盖） |

---

## 仓库说明

```
screen-craft/
├── frontend/          # Vue3 编辑器与管理端
├── backend/           # NestJS API
├── packages/shared/   # 前后端共用类型与校验
├── docs/              # 产品 / 接口 / 架构等详细规格（开发查阅）
├── designs/           # 设计稿与可交互原型
└── scripts/           # Mongo、预览图、冒烟等脚本
```

需求、接口契约、架构与里程碑等**开发规格**请看 `docs/` 目录，不以本 README 为准。

---

## License

Private / 按团队约定使用。
