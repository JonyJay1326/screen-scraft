import type { ComponentTemplate } from './types';
import {
  ALARM_DEMO,
  AXIS_DEMO,
  COMBO_DEMO,
  COMBO_DEMO_STACK,
  NAME_VALUE_DEMO,
  OPTIONS_DEMO,
  RADAR_DEMO,
  RADAR_DEMO_COMPARE,
  RADAR_DEMO_SPIKE,
  TABLE_DEMO,
  axisFields,
  boardFields,
  boardPair,
  legendFields,
  makeMeta,
  type StyleFieldDraft,
} from './schema';

type Meta = Omit<ComponentTemplate, 'renderer'>;

const lineSeries: StyleFieldDraft[] = [
  { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' },
  { key: 'lineSmooth', label: '平滑曲线', type: 'switch', group: '系列' },
  { key: 'lineWidth', label: '线宽', type: 'number', min: 1, max: 6, step: 0.5, unit: 'px', group: '系列' },
  { key: 'areaOpacity', label: '面积透明度', type: 'number', min: 0, max: 100, step: 5, unit: '%', group: '系列' },
  { key: 'showSymbol', label: '数据点标记', type: 'switch', group: '系列' },
  { key: 'showLabel', label: '数值标签', type: 'switch', group: '系列' },
];

const barSeries: StyleFieldDraft[] = [
  { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' },
  { key: 'barWidth', label: '柱宽', type: 'number', min: 8, max: 48, step: 2, unit: '%', group: '系列' },
  { key: 'barGap', label: '柱间距', type: 'number', min: 0, max: 80, step: 5, unit: '%', group: '系列' },
  { key: 'stack', label: '堆叠', type: 'switch', group: '系列' },
  { key: 'horizontal', label: '条形图', type: 'switch', group: '系列' },
  { key: 'showLabel', label: '数值标签', type: 'switch', group: '系列' },
];

const pieSeries: StyleFieldDraft[] = [
  { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' },
  { key: 'innerRadius', label: '内径', type: 'number', min: 0, max: 80, step: 5, unit: '%', group: '系列' },
  { key: 'roseType', label: '南丁格尔', type: 'switch', group: '系列' },
  { key: 'showCenter', label: '中心文字', type: 'switch', group: '系列' },
  { key: 'centerText', label: '中心标题', type: 'text', group: '系列' },
  { key: 'showLabel', label: '数值标签', type: 'switch', group: '系列' },
];

const funnelSeries: StyleFieldDraft[] = [
  { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' },
  { key: 'showLabel', label: '数值标签', type: 'switch', group: '系列' },
  {
    key: 'funnelSort',
    label: '排序',
    type: 'select',
    options: [
      { label: '降序', value: 'descending' },
      { label: '升序', value: 'ascending' },
      { label: '原序', value: 'none' },
    ],
    group: '系列',
  },
  {
    key: 'funnelAlign',
    label: '对齐',
    type: 'select',
    options: [
      { label: '居中', value: 'center' },
      { label: '左对齐', value: 'left' },
      { label: '右对齐', value: 'right' },
    ],
    group: '系列',
  },
  {
    key: 'funnelOrient',
    label: '方向',
    type: 'select',
    options: [
      { label: '纵向', value: 'vertical' },
      { label: '横向', value: 'horizontal' },
    ],
    group: '系列',
  },
  { key: 'funnelGap', label: '层级间距', type: 'number', min: 0, max: 24, step: 2, unit: 'px', group: '系列' },
  { key: 'minSize', label: '最小宽度', type: 'number', min: 0, max: 60, step: 5, unit: '%', group: '系列' },
];

const gaugeSeries: StyleFieldDraft[] = [
  { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' },
  { key: 'gaugeMin', label: '最小值', type: 'number', min: 0, max: 100, step: 1, group: '系列' },
  { key: 'gaugeMax', label: '最大值', type: 'number', min: 1, max: 200, step: 1, group: '系列' },
  { key: 'gaugeStartAngle', label: '起始角度', type: 'number', min: -360, max: 360, step: 5, group: '系列' },
  { key: 'gaugeEndAngle', label: '结束角度', type: 'number', min: -360, max: 360, step: 5, group: '系列' },
  { key: 'axisLineWidth', label: '轨道宽度', type: 'number', min: 6, max: 28, step: 2, unit: 'px', group: '系列' },
  { key: 'showPointer', label: '指针', type: 'switch', group: '系列' },
  { key: 'showProgress', label: '进度弧', type: 'switch', group: '系列' },
  { key: 'showSplitLine', label: '刻度线', type: 'switch', group: '系列' },
  { key: 'gaugeZones', label: '分区色带', type: 'switch', group: '系列' },
  { key: 'splitNumber', label: '分割段数', type: 'number', min: 2, max: 12, step: 1, group: '系列' },
  { key: 'showLabel', label: '数值标签', type: 'switch', group: '系列' },
];

const radarSeries: StyleFieldDraft[] = [
  { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' },
  { key: 'areaOpacity', label: '面积透明度', type: 'number', min: 0, max: 80, step: 5, unit: '%', group: '系列' },
  { key: 'lineWidth', label: '线宽', type: 'number', min: 1, max: 6, step: 0.5, unit: 'px', group: '系列' },
  { key: 'showSymbol', label: '端点标记', type: 'switch', group: '系列' },
  {
    key: 'radarShape',
    label: '雷达形状',
    type: 'select',
    options: [
      { label: '多边形', value: 'polygon' },
      { label: '圆形', value: 'circle' },
    ],
    group: '系列',
  },
  { key: 'splitNumber', label: '分割段数', type: 'number', min: 3, max: 8, step: 1, group: '系列' },
];

const kpiFields: StyleFieldDraft[] = [
  ...boardFields,
  { key: 'valueSize', label: '数值字号', type: 'number', min: 18, max: 48, step: 2, unit: 'px', group: '数值' },
  { key: 'upColor', label: '上升色', type: 'color', group: '数值' },
  { key: 'downColor', label: '下降色', type: 'color', group: '数值' },
];

/** 天气组件样式字段（时间格式为常用选项下拉） */
const weatherFields: StyleFieldDraft[] = [
  ...boardFields,
  { key: 'adcode', label: 'adcode', type: 'text', group: '天气' },
  {
    key: 'timeFormat',
    label: '时间格式',
    type: 'select',
    group: '天气',
    options: [
      { label: '年月日 + 时分秒', value: 'YYYY-MM-DD HH:mm:ss' },
      { label: '年月日 + 时分', value: 'YYYY-MM-DD HH:mm' },
      { label: '月日 + 时分秒', value: 'MM-DD HH:mm:ss' },
      { label: '月日 + 时分', value: 'MM-DD HH:mm' },
      { label: '年月日', value: 'YYYY-MM-DD' },
      { label: '时分秒', value: 'HH:mm:ss' },
      { label: '时分', value: 'HH:mm' },
    ],
  },
];

/** 量产注册表（chart-line-1 仍用黄金样例 meta；组合图按需保留 2 个差异化变体） */
export function buildCatalog(): Meta[] {
  const list: Meta[] = [];

  const lineExtras = [
    { n: 2, extra: { lineSmooth: false, areaOpacity: 0, lineWidth: 3, showSymbol: false } },
    { n: 3, extra: { lineSmooth: true, areaOpacity: 40, showLabel: true, legendPosition: 'topRight' } },
    { n: 4, extra: { boardEnabled: false, areaOpacity: 0, lineWidth: 2, showLegend: false } },
    { n: 5, extra: { lineSmooth: false, areaOpacity: 10, showSymbol: true, legendPosition: 'bottom' } },
  ];
  lineExtras.forEach(({ n, extra }) => {
    list.push(
      makeMeta(
        `chart-line-${n}`,
        'chart',
        '折线图',
        `折线图·样式${n}`,
        { w: 700, h: 300 },
        'axis',
        [...boardFields, ...lineSeries, ...legendFields, ...axisFields],
        boardPair('折线图', { lineSmooth: true, lineWidth: 2, showSymbol: true, ...extra }),
        AXIS_DEMO,
        { data: true, event: true },
      ),
    );
  });

  const barExtras = [
    { n: 1, extra: { barWidth: 28, barGap: 30, stack: false, horizontal: false } },
    { n: 2, extra: { barWidth: 22, stack: true } },
    { n: 3, extra: { barWidth: 36, showLabel: true } },
    { n: 4, extra: { horizontal: true, barWidth: 18 } },
    { n: 5, extra: { boardEnabled: false, barWidth: 24, showLegend: false } },
  ];
  barExtras.forEach(({ n, extra }) => {
    list.push(
      makeMeta(
        `chart-bar-${n}`,
        'chart',
        '柱状图',
        `柱状图·样式${n}`,
        { w: 700, h: 300 },
        'axis',
        [...boardFields, ...barSeries, ...legendFields, ...axisFields],
        boardPair('柱状图', extra),
        AXIS_DEMO,
        { data: true, event: true },
      ),
    );
  });

  const pieIds: { id: string; label: string; extra: Record<string, unknown> }[] = [
    { id: 'chart-pie-1', label: '饼图·环状样式1', extra: { innerRadius: 55, roseType: false, showCenter: true, centerText: '日供水' } },
    { id: 'chart-pie-1p', label: '饼图·样式1plus', extra: { innerRadius: 62, showCenter: true, centerText: '结构' } },
    { id: 'chart-pie-2', label: '饼图·样式2', extra: { innerRadius: 0, showLabel: true } },
    { id: 'chart-pie-3', label: '饼图·样式3', extra: { innerRadius: 40, roseType: true } },
    { id: 'chart-pie-4', label: '饼图·样式4', extra: { innerRadius: 0, roseType: true, showLegend: false } },
  ];
  pieIds.forEach((item) => {
    list.push(
      makeMeta(item.id, 'chart', '饼图', item.label, { w: 400, h: 320 }, 'nameValue', [...boardFields, ...pieSeries, ...legendFields], boardPair('供水结构', item.extra), NAME_VALUE_DEMO, { data: true, event: true }),
    );
  });

  const comboExtras: { n: number; label: string; title: string; extra: Record<string, unknown>; data: unknown }[] = [
    {
      n: 1,
      label: '组合图·柱线',
      title: '供水量与能耗',
      extra: {
        lineSmooth: true,
        areaOpacity: 0,
        barWidth: 28,
        stack: false,
        showSymbol: true,
        showLegend: true,
      },
      data: COMBO_DEMO,
    },
    {
      n: 2,
      label: '组合图·双柱面积',
      title: '供水结构与能耗',
      extra: {
        lineSmooth: true,
        areaOpacity: 12,
        barWidth: 22,
        stack: true,
        showSymbol: false,
        lineWidth: 2,
        legendPosition: 'topRight',
        // 折线/面积用低饱和色，避免面积抢柱子
        seriesColors: ['#2F7FF7', '#35E0FF', '#7B93B8'],
      },
      data: COMBO_DEMO_STACK,
    },
  ];
  comboExtras.forEach(({ n, label, title, extra, data }) => {
    list.push(
      makeMeta(
        `chart-combo-${n}`,
        'chart',
        '组合图',
        label,
        { w: 720, h: 320 },
        'combo',
        [...boardFields, ...lineSeries, ...barSeries.filter((f) => f.key !== 'seriesColors'), ...legendFields, ...axisFields],
        boardPair(title, extra),
        data,
        { data: true, event: true },
      ),
    );
  });

  const funnelExtras: { n: number; title: string; extra: Record<string, unknown>; data: { name: string; value: number }[] }[] = [
    {
      n: 1,
      title: '工单处理漏斗',
      extra: {
        showLabel: true,
        funnelSort: 'descending',
        funnelAlign: 'center',
        funnelOrient: 'vertical',
        funnelGap: 2,
        minSize: 10,
      },
      data: [
        { name: '受理', value: 128 },
        { name: '派单', value: 102 },
        { name: '处理', value: 86 },
        { name: '完结', value: 79 },
      ],
    },
    {
      n: 2,
      title: '转化漏斗',
      extra: {
        showLabel: true,
        funnelSort: 'descending',
        funnelAlign: 'center',
        funnelOrient: 'vertical',
        funnelGap: 8,
        minSize: 5,
        legendPosition: 'topRight',
        seriesColors: ['#2F7FF7', '#35E0FF', '#22C55E', '#F59E0B', '#EF4444'],
      },
      data: [
        { name: '曝光', value: 1000 },
        { name: '点击', value: 420 },
        { name: '意向', value: 180 },
        { name: '成交', value: 64 },
      ],
    },
    {
      n: 3,
      title: '金字塔漏斗',
      extra: {
        showLabel: true,
        funnelSort: 'ascending',
        funnelAlign: 'center',
        funnelOrient: 'vertical',
        funnelGap: 0,
        minSize: 15,
        seriesColors: ['#EF4444', '#F59E0B', '#22C55E', '#2F7FF7'],
      },
      data: [
        { name: '完结', value: 79 },
        { name: '处理', value: 86 },
        { name: '派单', value: 102 },
        { name: '受理', value: 128 },
      ],
    },
    {
      n: 4,
      title: '左对齐漏斗',
      extra: {
        showLabel: true,
        funnelSort: 'descending',
        funnelAlign: 'left',
        funnelOrient: 'vertical',
        funnelGap: 4,
        minSize: 20,
        boardEnabled: false,
        showLegend: false,
        seriesColors: ['#35E0FF', '#2F7FF7', '#A78BFA', '#F472B6'],
      },
      data: [
        { name: '线索', value: 260 },
        { name: '跟进', value: 150 },
        { name: '方案', value: 90 },
        { name: '签约', value: 45 },
      ],
    },
    {
      n: 5,
      title: '横向漏斗',
      extra: {
        showLabel: true,
        funnelSort: 'descending',
        funnelAlign: 'center',
        funnelOrient: 'horizontal',
        funnelGap: 4,
        minSize: 8,
        showLegend: false,
        seriesColors: ['#22C55E', '#35E0FF', '#2F7FF7', '#F59E0B', '#A78BFA'],
      },
      data: [
        { name: '巡检', value: 320 },
        { name: '告警', value: 210 },
        { name: '派工', value: 140 },
        { name: '修复', value: 95 },
        { name: '复核', value: 70 },
      ],
    },
  ];
  funnelExtras.forEach(({ n, title, extra, data }) => {
    list.push(
      makeMeta(
        `chart-funnel-${n}`,
        'chart',
        '漏斗图',
        `漏斗图·样式${n}`,
        { w: 400, h: 360 },
        'nameValue',
        [...boardFields, ...funnelSeries, ...legendFields],
        boardPair(title, extra),
        data,
        { data: true, event: true },
      ),
    );
  });

  const gaugeExtras: { n: number; title: string; extra: Record<string, unknown>; data: { name: string; value: number }[] }[] = [
    {
      n: 1,
      title: '设备在线率',
      extra: {
        gaugeMin: 0,
        gaugeMax: 100,
        gaugeStartAngle: 225,
        gaugeEndAngle: -45,
        axisLineWidth: 14,
        showPointer: true,
        showProgress: false,
        showSplitLine: true,
        splitNumber: 10,
        showLabel: true,
      },
      data: [{ name: '在线率', value: 96 }],
    },
    {
      n: 2,
      title: '负荷进度',
      extra: {
        gaugeMin: 0,
        gaugeMax: 100,
        gaugeStartAngle: 225,
        gaugeEndAngle: -45,
        axisLineWidth: 18,
        showPointer: false,
        showProgress: true,
        showSplitLine: false,
        splitNumber: 8,
        showLabel: true,
        seriesColors: ['#2F7FF7', '#35E0FF', '#22C55E'],
      },
      data: [{ name: '负荷', value: 68 }],
    },
    {
      n: 3,
      title: '风险等级',
      extra: {
        gaugeMin: 0,
        gaugeMax: 100,
        gaugeStartAngle: 210,
        gaugeEndAngle: -30,
        axisLineWidth: 16,
        showPointer: true,
        showProgress: false,
        showSplitLine: true,
        splitNumber: 5,
        showLabel: true,
        // 三色分区：低/中/高
        seriesColors: ['#22C55E', '#F59E0B', '#EF4444'],
        gaugeZones: true,
      },
      data: [{ name: '风险值', value: 42 }],
    },
    {
      n: 4,
      title: '半环指标',
      extra: {
        gaugeMin: 0,
        gaugeMax: 100,
        gaugeStartAngle: 180,
        gaugeEndAngle: 0,
        axisLineWidth: 20,
        showPointer: false,
        showProgress: true,
        showSplitLine: false,
        splitNumber: 4,
        showLabel: true,
        boardEnabled: false,
        seriesColors: ['#35E0FF', '#2F7FF7'],
      },
      data: [{ name: '完成度', value: 78 }],
    },
    {
      n: 5,
      title: '产能利用率',
      extra: {
        gaugeMin: 0,
        gaugeMax: 120,
        gaugeStartAngle: 240,
        gaugeEndAngle: -60,
        axisLineWidth: 12,
        showPointer: true,
        showProgress: true,
        showSplitLine: true,
        splitNumber: 6,
        showLabel: true,
        boardEnabled: false,
        seriesColors: ['#A78BFA', '#2F7FF7', '#35E0FF'],
      },
      data: [{ name: '利用率', value: 108 }],
    },
  ];
  gaugeExtras.forEach(({ n, title, extra, data }) => {
    list.push(
      makeMeta(
        `chart-gauge-${n}`,
        'chart',
        '仪表盘',
        `仪表盘·样式${n}`,
        { w: 360, h: 280 },
        'nameValue',
        [...boardFields, ...gaugeSeries],
        boardPair(title, extra),
        data,
        { data: true, event: true },
      ),
    );
  });

  const radarExtras: { n: number; extra: Record<string, unknown>; data: unknown }[] = [
    { n: 1, extra: { areaOpacity: 40, lineWidth: 2, showSymbol: false, radarShape: 'polygon', splitNumber: 5 }, data: RADAR_DEMO },
    { n: 2, extra: { areaOpacity: 28, lineWidth: 2, showSymbol: true, radarShape: 'polygon', splitNumber: 5, legendPosition: 'topRight' }, data: RADAR_DEMO_COMPARE },
    { n: 3, extra: { areaOpacity: 45, lineWidth: 3, showSymbol: false, radarShape: 'circle', splitNumber: 4 }, data: RADAR_DEMO_SPIKE },
    { n: 4, extra: { areaOpacity: 0, lineWidth: 2, showSymbol: true, radarShape: 'polygon', splitNumber: 5, boardEnabled: false }, data: RADAR_DEMO_SPIKE },
    { n: 5, extra: { areaOpacity: 18, lineWidth: 2, showSymbol: false, radarShape: 'circle', splitNumber: 3, showLegend: false }, data: RADAR_DEMO_COMPARE },
  ];
  radarExtras.forEach(({ n, extra, data }) => {
    list.push(
      makeMeta(
        `chart-radar-${n}`,
        'chart',
        '雷达图',
        `雷达图·样式${n}`,
        { w: 420, h: 320 },
        'radar',
        [...boardFields, ...radarSeries, ...legendFields],
        boardPair('水质综合评分', extra),
        data,
        { data: true, event: true },
      ),
    );
  });

  const kpis: {
    id: string;
    label: string;
    title: string;
    protocol: Meta['dataProtocol'];
    size: { w: number; h: number };
    data: unknown;
    /** 内容已含名称时关闭底板标题，避免重复 */
    hideBoardTitle?: boolean;
  }[] = [
    { id: 'kpi-card-1', label: '指标卡·样式1', title: '累计供水', protocol: 'kpi-1', size: { w: 280, h: 140 }, data: [{ name: '累计供水', value: '12842', unit: 'm³', trend: 4.2, trendDir: 'up' }] },
    { id: 'kpi-card-2', label: '指标卡·样式2', title: '关键指标', protocol: 'kpi-2', size: { w: 560, h: 140 }, data: [{ name: '管网压力', value: '0.38', unit: 'MPa', percent: 76 }, { name: '今日告警', value: '7', unit: '条', percent: 22 }] },
    { id: 'kpi-card-3', label: '指标卡·样式3', title: '综合评分', protocol: 'kpi-3', size: { w: 480, h: 200 }, data: { center: { name: '综合评分', value: '92' }, sides: [{ name: '水质', percent: 96 }, { name: '压力', percent: 88 }] } },
    { id: 'kpi-card-5', label: '指标卡·样式5', title: '设备在线率', protocol: 'kpi-5', size: { w: 240, h: 140 }, data: { name: '设备在线率', value: '96.4', unit: '%' }, hideBoardTitle: true },
    { id: 'kpi-card-8', label: '指标卡·样式8', title: '能耗概览', protocol: 'kpi-8', size: { w: 640, h: 120 }, data: [{ name: '供水', value: '1.2万', unit: 'm³', icon: 'droplet' }, { name: '电耗', value: '428', unit: 'kWh', icon: 'zap' }] },
    { id: 'kpi-card-10', label: '指标卡·样式10', title: '夜间流量', protocol: 'kpi-2', size: { w: 300, h: 160 }, data: [{ name: '夜间流量', value: '420', unit: 'm³/h', percent: 35 }], hideBoardTitle: true },
    { id: 'kpi-card-11', label: '指标卡·样式11', title: '漏损率', protocol: 'kpi-2', size: { w: 300, h: 160 }, data: [{ name: '漏损率', value: '8.6', unit: '%', percent: 8.6 }], hideBoardTitle: true },
    { id: 'kpi-card-list', label: '指标列表', title: '站点压力', protocol: 'kpi-list', size: { w: 280, h: 320 }, data: [{ name: '滨江站', value: '0.38' }, { name: '萧山站', value: '0.41' }, { name: '余杭站', value: '0.35' }] },
  ];
  kpis.forEach((item) => {
    list.push(
      makeMeta(
        item.id,
        'chart',
        '指标卡',
        item.label,
        item.size,
        item.protocol,
        kpiFields,
        boardPair(item.title, {
          valueSize: 28,
          upColor: '#22C55E',
          downColor: '#EF4444',
          ...(item.hideBoardTitle ? { boardTitle: '' } : {}),
        }),
        item.data,
        { data: true, event: true },
      ),
    );
  });

  list.push(
    makeMeta('table-list', 'chart', '表格', '表格列表', { w: 720, h: 320 }, 'table', [...boardFields, { key: 'stripe', label: '斑马纹', type: 'switch', group: '表格' }], boardPair('实时监测数据', { stripe: true }), TABLE_DEMO, { data: true, event: true }),
  );
  list.push(
    makeMeta('table-alarm', 'chart', '表格', '告警列表', { w: 720, h: 300 }, 'table', [...boardFields, { key: 'stripe', label: '斑马纹', type: 'switch', group: '表格' }], boardPair('实时告警', { stripe: true }), ALARM_DEMO, { data: true, event: true }),
  );

  list.push(
    makeMeta(
      'weather-1',
      'decoration',
      '天气标题',
      '天气·样式1',
      { w: 560, h: 80 },
      'weather',
      [...weatherFields],
      boardPair('杭州天气', { adcode: '330108', timeFormat: 'HH:mm', boardEnabled: false }),
      undefined,
      { data: true, event: false },
    ),
  );
  list.push(
    makeMeta(
      'weather-2',
      'decoration',
      '天气标题',
      '天气·样式2',
      { w: 540, h: 130 },
      'weather',
      [...weatherFields],
      boardPair('天气', { adcode: '330108', timeFormat: 'YYYY-MM-DD HH:mm', boardEnabled: true }),
      undefined,
      { data: true, event: false },
    ),
  );

  const borders = [
    { n: 1, label: '边框·默认深蓝' },
    { n: 2, label: '边框·工业蓝' },
    { n: 3, label: '边框·科幻紫' },
  ];
  borders.forEach((item) => {
    list.push(
      makeMeta(
        `border-${item.n}`,
        'decoration',
        '边框',
        item.label,
        { w: 400, h: 240 },
        undefined,
        [...boardFields, { key: 'title', label: '标题', type: 'text', group: '标题' }],
        boardPair(item.label.replace('边框·', ''), { title: item.label.replace('边框·', ''), boardEnabled: false }),
        undefined,
        { data: false, event: false },
      ),
    );
  });

  list.push(
    makeMeta(
      'media-image',
      'media',
      '图片',
      '图片',
      { w: 480, h: 270 },
      undefined,
      [...boardFields, { key: 'radius', label: '圆角', type: 'number', min: 0, max: 40, step: 2, unit: 'px', group: '样式' }, { key: 'src', label: '图片地址', type: 'text', group: '资源' }],
      boardPair('图片', { radius: 8, src: '', boardEnabled: false }),
      undefined,
      { data: true, event: true },
    ),
  );
  list.push(
    makeMeta(
      'media-video',
      'media',
      '视频',
      '视频',
      { w: 640, h: 360 },
      undefined,
      [
        ...boardFields,
        { key: 'src', label: '视频地址', type: 'text', group: '资源' },
        { key: 'autoplay', label: '自动播放', type: 'switch', group: '播放' },
        { key: 'loop', label: '循环', type: 'switch', group: '播放' },
        { key: 'muted', label: '静音', type: 'switch', group: '播放' },
      ],
      boardPair('视频', { src: '', autoplay: false, loop: true, muted: true, boardEnabled: false }),
      undefined,
      { data: true, event: false },
    ),
  );

  list.push(
    makeMeta(
      'control-button',
      'control',
      '按钮',
      '按钮·常规',
      { w: 160, h: 48 },
      undefined,
      [
        { key: 'text', label: '文字', type: 'text', group: '按钮' },
        { key: 'fontSize', label: '字号', type: 'number', min: 12, max: 28, step: 1, unit: 'px', group: '按钮' },
        { key: 'bgColor', label: '背景', type: 'color', group: '按钮' },
      ],
      { dark: { text: '查 询', fontSize: 15, bgColor: '#2F7FF7' }, light: { text: '查 询', fontSize: 15, bgColor: '#2F7FF7' } },
      undefined,
      { data: false, event: true },
    ),
  );
  list.push(
    makeMeta(
      'control-imageButton',
      'control',
      '按钮',
      '按钮·图片',
      { w: 160, h: 48 },
      undefined,
      [
        { key: 'text', label: '文字', type: 'text', group: '按钮' },
        { key: 'src', label: '背景图', type: 'text', group: '按钮' },
      ],
      { dark: { text: '更多', src: '' }, light: { text: '更多', src: '' } },
      undefined,
      { data: false, event: true },
    ),
  );
  list.push(
    makeMeta(
      'control-hotspot',
      'control',
      '按钮',
      '按钮·热区',
      { w: 120, h: 80 },
      undefined,
      [{ key: 'opacity', label: '热区透明度', type: 'number', min: 0, max: 40, step: 2, unit: '%', group: '热区' }],
      { dark: { opacity: 0 }, light: { opacity: 0 } },
      undefined,
      { data: false, event: true },
    ),
  );
  list.push(
    makeMeta(
      'control-dropdown',
      'control',
      '下拉框',
      '下拉框',
      { w: 220, h: 40 },
      'options',
      [
        ...boardFields,
        { key: 'paramName', label: '绑定参数名', type: 'text', group: '联动' },
        { key: 'defaultValue', label: '默认选中项', type: 'text', group: '联动' },
      ],
      boardPair('区域筛选', { paramName: 'region', defaultValue: 'all', boardEnabled: false }),
      OPTIONS_DEMO,
      { data: true, event: true },
    ),
  );
  list.push(
    makeMeta(
      'control-text',
      'control',
      '文本',
      '文本',
      { w: 360, h: 120 },
      undefined,
      [
        { key: 'content', label: '文本内容', type: 'text', group: '文本' },
        { key: 'fontSize', label: '字号', type: 'number', min: 12, max: 32, step: 1, unit: 'px', group: '文本' },
        { key: 'color', label: '颜色', type: 'color', group: '文本' },
        {
          key: 'align',
          label: '对齐',
          type: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
          group: '文本',
        },
      ],
      {
        dark: { content: '本驾驶舱数据每 5 分钟自动刷新。', fontSize: 13, color: '#9FB3D1', align: 'left' },
        light: { content: '本驾驶舱数据每 5 分钟自动刷新。', fontSize: 13, color: '#6B7280', align: 'left' },
      },
      undefined,
      { data: false, event: true },
    ),
  );

  return list;
}
