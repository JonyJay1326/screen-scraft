import { getBuiltinComponentMetadata } from '@screencraft/shared';
import type { ProtocolKind, StyleField } from '@screencraft/shared';
import type { ComponentTemplate } from './types';

/** 仅用于迁移现有注册表字面量；运行时 schema 一律取 shared 元数据。 */
export type StyleFieldDraft = Omit<StyleField, 'aiWritable'> & { aiWritable?: boolean };

export const DARK_PALETTE = ['#2F7FF7', '#35E0FF', '#22C55E', '#F59E0B', '#EF4444', '#A78BFA', '#F472B6', '#34D399'];
export const LIGHT_PALETTE = ['#2F7FF7', '#0EA5E9', '#16A34A', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#059669'];

export const boardFields: StyleFieldDraft[] = [
  { key: 'boardEnabled', label: '底板框', type: 'switch', group: '底板框' },
  { key: 'boardTitle', label: '标题文字', type: 'text', group: '底板框' },
  { key: 'boardPadding', label: '内边距', type: 'number', min: 0, max: 40, step: 2, unit: 'px', group: '底板框' },
];

export const legendFields: StyleFieldDraft[] = [
  { key: 'showLegend', label: '显示图例', type: 'switch', group: '图例' },
  {
    key: 'legendPosition',
    label: '图例位置',
    type: 'select',
    options: [
      { label: '顶部居中', value: 'top' },
      { label: '右上', value: 'topRight' },
      { label: '底部居中', value: 'bottom' },
    ],
    group: '图例',
  },
];

export const axisFields: StyleFieldDraft[] = [
  { key: 'showXAxis', label: '显示 X 轴', type: 'switch', group: '坐标轴' },
  { key: 'showYAxis', label: '显示 Y 轴', type: 'switch', group: '坐标轴' },
  { key: 'axisLabelColor', label: '轴标签颜色', type: 'color', group: '坐标轴' },
  { key: 'gridColor', label: '网格线颜色', type: 'color', group: '坐标轴' },
];

export const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月'];

export const AXIS_DEMO = {
  categories: MONTHS,
  series: [
    { name: '供水量', data: [820, 932, 901, 1290, 1330, 1520] },
    { name: '售水量', data: [700, 810, 780, 1100, 1180, 1360] },
  ],
};

export const COMBO_DEMO = {
  categories: MONTHS,
  series: [
    { name: '供水量', type: 'bar' as const, data: [820, 932, 901, 1290, 1330, 1520] },
    { name: '能耗', type: 'line' as const, yAxisIndex: 1 as const, data: [320, 332, 301, 390, 410, 460] },
  ],
};

/** 双柱 + 面积折线组合样例 */
export const COMBO_DEMO_STACK = {
  categories: MONTHS,
  series: [
    { name: '供水量', type: 'bar' as const, data: [820, 932, 901, 1290, 1330, 1520] },
    { name: '售水量', type: 'bar' as const, data: [700, 810, 780, 1100, 1180, 1360] },
    { name: '能耗', type: 'line' as const, yAxisIndex: 1 as const, data: [320, 332, 301, 390, 410, 460] },
  ],
};

export const RADAR_DEMO = {
  indicators: [
    { name: '浊度', max: 100 },
    { name: '余氯', max: 100 },
    { name: 'PH', max: 100 },
    { name: '细菌', max: 100 },
    { name: '口感', max: 100 },
    { name: '压力', max: 100 },
  ],
  series: [{ name: '水质综合', data: [86, 72, 90, 64, 78, 82] }],
};

/** 双系列对比雷达样例 */
export const RADAR_DEMO_COMPARE = {
  indicators: RADAR_DEMO.indicators,
  series: [
    { name: '本月', data: [86, 72, 90, 64, 78, 82] },
    { name: '上月', data: [70, 80, 75, 88, 60, 70] },
  ],
};

/** 尖峰形态雷达样例（各轴差异更大） */
export const RADAR_DEMO_SPIKE = {
  indicators: RADAR_DEMO.indicators,
  series: [{ name: '工况评分', data: [95, 38, 88, 32, 92, 48] }],
};


/** 电力风柱状样例 */
export const POWER_BAR_DEMO = {
  categories: ['1月', '2月', '3月', '4月', '5月', '6月'],
  series: [{ name: '发电量', data: [3000, 2000, 4000, 5000, 2000, 3000] }],
};

/** 电力风雷达（用电大市） */
export const POWER_RADAR_DEMO = {
  indicators: [
    { name: '成都市', max: 600 },
    { name: '绵阳市', max: 600 },
    { name: '德阳市', max: 600 },
    { name: '南充市', max: 600 },
    { name: '宜宾市', max: 600 },
  ],
  series: [{ name: '用电量', data: [582, 421.2, 380, 350, 320] }],
};

/** 电力风环图（季度发电） */
export const POWER_PIE_DEMO = [
  { name: '第一季度', value: 35 },
  { name: '第二季度', value: 25 },
  { name: '第三季度', value: 22 },
  { name: '第四季度', value: 18 },
];

/** 电力风指标卡（图标+主值+副文案） */
export const POWER_KPI_DEMO = [
  { name: '线路', value: '120', unit: '回', sub: '长度 1,220 KM', icon: '⚡' },
  { name: '变电站', value: '86', unit: '座', sub: '容量 4,860 MVA', icon: '🔌' },
  { name: '配变', value: '1,240', unit: '台', sub: '在运 1,198 台', icon: '📡' },
  { name: '杆塔', value: '8,600', unit: '基', sub: '巡检覆盖 96%', icon: '🗼' },
];

export const NAME_VALUE_DEMO = [
  { name: '生活用水', value: 46 },
  { name: '工业用水', value: 28 },
  { name: '生态补水', value: 16 },
  { name: '其他', value: 10 },
];

export const TABLE_DEMO = {
  columns: [
    { key: 'name', label: '站点' },
    { key: 'press', label: '压力' },
    { key: 'flow', label: '流量' },
  ],
  rows: [
    { name: '滨江站', press: 0.38, flow: 1280 },
    { name: '萧山站', press: 0.41, flow: 960 },
    { name: '余杭站', press: 0.35, flow: 870 },
  ],
};

export const ALARM_DEMO = {
  columns: [
    { key: 'level', label: '等级' },
    { key: 'msg', label: '内容' },
    { key: 'time', label: '时间' },
  ],
  rows: [
    { level: '严重', msg: '管网压力低于 0.28 MPa', time: '10:12' },
    { level: '重要', msg: '泵站 3# 振动偏高', time: '10:08' },
    { level: '提醒', msg: '夜间低谷调度建议', time: '09:50' },
  ],
};

export const OPTIONS_DEMO = [
  { label: '全部区域', value: 'all' },
  { label: '滨江', value: 'binjiang' },
  { label: '萧山', value: 'xiaoshan' },
];

/** 底板框双主题默认 */
export function boardPair(title: string, extra: Record<string, unknown> = {}) {
  return {
    dark: {
      boardEnabled: true,
      boardTitle: title,
      boardPadding: 12,
      seriesColors: [...DARK_PALETTE],
      showLegend: true,
      legendPosition: 'top',
      showXAxis: true,
      showYAxis: true,
      axisLabelColor: '#9FB3D1',
      gridColor: 'rgba(30,58,102,.6)',
      showLabel: false,
      ...extra,
    },
    light: {
      boardEnabled: true,
      boardTitle: title,
      boardPadding: 12,
      seriesColors: [...LIGHT_PALETTE],
      showLegend: true,
      legendPosition: 'top',
      showXAxis: true,
      showYAxis: true,
      axisLabelColor: '#6B7280',
      gridColor: 'rgba(228,231,237,.9)',
      showLabel: false,
      ...extra,
    },
  };
}

/** 组装一条注册记录（无 renderer） */
export function makeMeta(
  id: string,
  category: ComponentTemplate['category'],
  group: string,
  label: string,
  size: { w: number; h: number },
  protocol: ProtocolKind | undefined,
  _styleSchema: StyleFieldDraft[],
  defaultStyle: ComponentTemplate['defaultStyle'],
  defaultData: unknown,
  tabs: { data: boolean; event: boolean },
): Omit<ComponentTemplate, 'renderer'> {
  const sharedMetadata = getBuiltinComponentMetadata(id);
  if (!sharedMetadata) {
    throw new Error(`内置组件缺少 shared 元数据：${id}`);
  }
  return {
    id,
    category,
    group,
    label,
    previews: { dark: `previews/${id}.dark.svg`, light: `previews/${id}.light.svg` },
    defaultSize: size,
    dataProtocol: protocol,
    styleSchema: sharedMetadata.styleSchema,
    defaultStyle,
    defaultData,
    hasDataTab: tabs.data,
    hasEventTab: tabs.event,
  };
}
