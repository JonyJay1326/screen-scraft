# 组件模板黄金样例（golden-sample.md）

> 版本：v0.3。本文件定义组件模板注册记录的**唯一标准结构**。M4 先完整实现「折线图·样式1（chart-line-1）」交用户验收；验收通过后，其余 62 个模板一律按此模子批量生成，**结构与字段命名不得自行发挥**。
> 配套：注册表设计见 architecture.md §2.3；组件清单见 PRD §5.1；数据协议见 api.md §2 / PRD §5.2；视觉规范见 design.md §2/§5。

---

## 1. 注册记录 TypeScript 结构（框架级，所有模板共用）

```ts
// packages/shared 或 frontend/src/registry/types.ts
type StyleFieldType = 'text' | 'number' | 'switch' | 'color' | 'select' | 'colorList';

interface StyleField {
  key: string;                 // 存入 ComponentDoc.style 的键名（驼峰，全模板内唯一约定）
  label: string;               // 样式面板显示名（中文，与 PRD 措辞一致）
  type: StyleFieldType;
  options?: { label: string; value: string }[];   // type=select 必填
  min?: number; max?: number; step?: number; unit?: string;  // type=number 可选
  group: string;               // 面板分组标题：'底板框' | '标题' | '图例' | '坐标轴' | '系列' | ...
}

interface ComponentTemplate {
  id: string;                  // 命名规则：{族}-{序号}，如 chart-line-1 / kpi-card-8 / border-3
  category: 'chart' | 'decoration' | 'media' | 'control';
  group: string;               // 折线图 / 柱状图 / 指标卡 / 表格 / 天气标题 / 边框 / 图片 / 视频 / 按钮 / 下拉框 / 文本
  label: string;               // 「折线图·样式1」
  previews: { dark: string; light: string };       // 构建期自动截图产物路径（M8）
  defaultSize: { w: number; h: number };
  dataProtocol?: ProtocolKind; // 'axis' | 'combo' | 'radar' | 'nameValue' | 'table' | 'kpi-*' | 'options' | 'weather' | undefined(无数据)
  defaultStyle: { dark: Record<string, unknown>; light: Record<string, unknown> };  // 双主题各一份，键与 styleSchema.key 对齐
  defaultData?: unknown;       // 符合 dataProtocol 的默认静态数据（新建组件时的初值）
  styleSchema: StyleField[];
  hasDataTab: boolean;
  hasEventTab: boolean;
  renderer: Component;         // Vue 运行时渲染组件（编辑器画布/预览/展示页共用）
}
```

## 2. 黄金样例：折线图·样式1（chart-line-1）

### 2.1 meta

```ts
{
  id: 'chart-line-1',
  category: 'chart',
  group: '折线图',
  label: '折线图·样式1',
  previews: { dark: 'previews/chart-line-1.dark.png', light: 'previews/chart-line-1.light.png' },
  defaultSize: { w: 700, h: 300 },
  dataProtocol: 'axis',
  hasDataTab: true,
  hasEventTab: true,
}
```

> 视觉定位：基础平滑面积折线（design.md §2.3 深色色板第 1 位 #2F7FF7 起始），底板框默认开启，是「最朴素可用」的那个变体；样式2~5 再做渐变强调/多轴/无底板/极简线等差异化。

### 2.2 styleSchema（面板字段清单，顺序即面板顺序）

| # | key | label | type | 取值/约束 | group |
|---|---|---|---|---|---|
| 1 | boardEnabled | 底板框 | switch | — | 底板框 |
| 2 | boardTitle | 标题文字 | text | ≤20 字 | 底板框 |
| 3 | boardPadding | 内边距 | number | 0~40，step 2，单位 px | 底板框 |
| 4 | seriesColors | 系列颜色 | colorList | 每系列一色，可增删排序 | 系列 |
| 5 | lineSmooth | 平滑曲线 | switch | — | 系列 |
| 6 | lineWidth | 线宽 | number | 1~6，step 0.5，单位 px | 系列 |
| 7 | areaOpacity | 面积透明度 | number | 0~100，step 5，单位 %；0=关闭面积 | 系列 |
| 8 | showSymbol | 数据点标记 | switch | — | 系列 |
| 9 | showLabel | 数值标签 | switch | — | 系列 |
| 10 | showLegend | 显示图例 | switch | — | 图例 |
| 11 | legendPosition | 图例位置 | select | 顶部居中/右上/底部居中 | 图例 |
| 12 | showXAxis | 显示 X 轴 | switch | — | 坐标轴 |
| 13 | showYAxis | 显示 Y 轴 | switch | — | 坐标轴 |
| 14 | axisLabelColor | 轴标签颜色 | color | — | 坐标轴 |
| 15 | gridColor | 网格线颜色 | color | — | 坐标轴 |

```ts
// 与上表等价的 styleSchema 数组（照此实现）
styleSchema: [
  { key: 'boardEnabled',    label: '底板框',     type: 'switch', group: '底板框' },
  { key: 'boardTitle',      label: '标题文字',   type: 'text',   group: '底板框' },
  { key: 'boardPadding',    label: '内边距',     type: 'number', min: 0, max: 40, step: 2, unit: 'px', group: '底板框' },
  { key: 'seriesColors',    label: '系列颜色',   type: 'colorList', group: '系列' },
  { key: 'lineSmooth',      label: '平滑曲线',   type: 'switch', group: '系列' },
  { key: 'lineWidth',       label: '线宽',       type: 'number', min: 1, max: 6, step: 0.5, unit: 'px', group: '系列' },
  { key: 'areaOpacity',     label: '面积透明度', type: 'number', min: 0, max: 100, step: 5, unit: '%', group: '系列' },
  { key: 'showSymbol',      label: '数据点标记', type: 'switch', group: '系列' },
  { key: 'showLabel',       label: '数值标签',   type: 'switch', group: '系列' },
  { key: 'showLegend',      label: '显示图例',   type: 'switch', group: '图例' },
  { key: 'legendPosition',  label: '图例位置',   type: 'select', options: [
      { label: '顶部居中', value: 'top' }, { label: '右上', value: 'topRight' }, { label: '底部居中', value: 'bottom' }
    ], group: '图例' },
  { key: 'showXAxis',       label: '显示 X 轴',  type: 'switch', group: '坐标轴' },
  { key: 'showYAxis',       label: '显示 Y 轴',  type: 'switch', group: '坐标轴' },
  { key: 'axisLabelColor',  label: '轴标签颜色', type: 'color',  group: '坐标轴' },
  { key: 'gridColor',       label: '网格线颜色', type: 'color',  group: '坐标轴' },
]
```

### 2.3 defaultStyle（双主题）

```ts
defaultStyle: {
  dark: {
    boardEnabled: true, boardTitle: '折线图', boardPadding: 12,
    seriesColors: ['#2F7FF7', '#35E0FF', '#22C55E', '#F59E0B', '#EF4444', '#A78BFA', '#F472B6', '#34D399'],
    lineSmooth: true, lineWidth: 2, areaOpacity: 20, showSymbol: true, showLabel: false,
    showLegend: true, legendPosition: 'top',
    showXAxis: true, showYAxis: true, axisLabelColor: '#9FB3D1', gridColor: 'rgba(30,58,102,.6)'
  },
  light: {
    boardEnabled: true, boardTitle: '折线图', boardPadding: 12,
    seriesColors: ['#2F7FF7', '#0EA5E9', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#059669'],
    lineSmooth: true, lineWidth: 2, areaOpacity: 15, showSymbol: true, showLabel: false,
    showLegend: true, legendPosition: 'top',
    showXAxis: true, showYAxis: true, axisLabelColor: '#6B7280', gridColor: 'rgba(228,231,237,.9)'
  }
}
```

> 色板取值来自 design.md §2.3；`defaultStyle.dark/light` 必须覆盖 styleSchema 全部 key，缺一即视为实现 bug。

### 2.4 defaultData（axis 协议）

```ts
defaultData: {
  categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
  series: [
    { name: '供水量', data: [820, 932, 901, 1290, 1330, 1520] },
    { name: '售水量', data: [700, 810, 780, 1100, 1180, 1360] }
  ]
}
```

> defaultData 命名与示例数据应贴合系统演示场景（水务/能源等，与原型 mock 一致的语感），禁止用 ECharts 官网示例的英文 'Mon/Tue'。

### 2.5 renderer 实现要点（ChartLine1.vue）

- 输入：`ComponentDoc`（style 合并 defaultStyle 后的最终值）+ 数据（静态或 API）+ `mode: 'edit' | 'runtime'`。
- ECharts 按当前主题初始化（`ds-dark` / `ds-light`），容器 resize 监听（ResizeObserver）。
- 样式映射：`seriesColors→color` 数组按系列顺序取；`lineSmooth→smooth`；`areaOpacity>0→areaStyle.opacity`；`legendPosition` 映射 legend.top/right/bottom；轴开关与颜色、网格线颜色一一对应。
- **编辑器模式**：不做事件绑定（事件仅运行时生效）、静态数据协议不符时黄色警告角标。
- **运行时模式**：按 EventDoc 绑定 DOM 事件；API 数据失败/协议不符渲染「数据加载失败」占位。
- 组件根元素尺寸 100%×100%，由画布容器控制 w/h。

### 2.6 静态数据表格联动

数据绑定 Tab 选「静态数据」时，按 `dataProtocol: 'axis'` 生成：

- 第一列表头固定「categories」，其余列每系列一列（表头 = series.name）；
- vxe-table 支持加行/加列、右键菜单六项（插入行上/下、删除行、插入列左/右、删除列）；
- 编辑内容实时写回 `staticData` 并触发协议校验（shared 校验器）。

---

## 3. 其余模板的量产规则（M8 执行）

1. **命名**：`chart-{族}-{1..5}`（折线 line / 柱状 bar / 饼图 pie / 组合 combo / 漏斗 funnel / 雷达 radar / 仪表盘 gauge）；`kpi-card-{n}` 按 PRD §5.1 的样式编号（1、2、2plus→2p、3、3p、5、5p、8、9、10、11、指标列表→list）；`table-{list|alarm}`；`weather-{1|2}`；`border-{1..5}`；`media-{image|video}`；`control-{button|imageButton|hotspot|dropdown|text}`。
2. **styleSchema**：先复用黄金样例的「底板框」三件套（boardEnabled/boardTitle/boardPadding，全部数据组件通用）；再按族增字段（柱状图：柱宽 barWidth、柱间距；饼图：环宽 radius、中心文字；仪表盘：量程 min/max、进度色；指标卡：数值字号/单位/趋势色…）。**同族 5 个变体的 schema 差异要体现在默认值与少量专属字段上，不许为变体改字段命名**。
3. **defaultStyle**：双主题成对产出，颜色一律取 design.md §2.1~2.3 变量表/色板，禁止自创色值。
4. **defaultData**：符合该族协议，中文示例、与演示场景一致。
5. **每族量产完**：commit + 抽查 1 个变体（添加→改样式→切主题→静态数据编辑）全流程可用。
