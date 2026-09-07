import type { ComponentTemplate, StyleField } from './types';
import {
  ALARM_DEMO,
  AXIS_DEMO,
  COMBO_DEMO,
  NAME_VALUE_DEMO,
  OPTIONS_DEMO,
  RADAR_DEMO,
  TABLE_DEMO,
  axisFields,
  boardFields,
  boardPair,
  legendFields,
  makeMeta,
} from './schema';

type Meta = Omit<ComponentTemplate, 'renderer'>;

const lineSeries: StyleField[] = [
  { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' },
  { key: 'lineSmooth', label: '平滑曲线', type: 'switch', group: '系列' },
  { key: 'lineWidth', label: '线宽', type: 'number', min: 1, max: 6, step: 0.5, unit: 'px', group: '系列' },
  { key: 'areaOpacity', label: '面积透明度', type: 'number', min: 0, max: 100, step: 5, unit: '%', group: '系列' },
  { key: 'showSymbol', label: '数据点标记', type: 'switch', group: '系列' },
  { key: 'showLabel', label: '数值标签', type: 'switch', group: '系列' },
];

const barSeries: StyleField[] = [
  { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' },
  { key: 'barWidth', label: '柱宽', type: 'number', min: 8, max: 48, step: 2, unit: '%', group: '系列' },
  { key: 'barGap', label: '柱间距', type: 'number', min: 0, max: 80, step: 5, unit: '%', group: '系列' },
  { key: 'stack', label: '堆叠', type: 'switch', group: '系列' },
  { key: 'horizontal', label: '条形图', type: 'switch', group: '系列' },
  { key: 'showLabel', label: '数值标签', type: 'switch', group: '系列' },
];

const pieSeries: StyleField[] = [
  { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' },
  { key: 'innerRadius', label: '内径', type: 'number', min: 0, max: 80, step: 5, unit: '%', group: '系列' },
  { key: 'roseType', label: '南丁格尔', type: 'switch', group: '系列' },
  { key: 'showCenter', label: '中心文字', type: 'switch', group: '系列' },
  { key: 'centerText', label: '中心标题', type: 'text', group: '系列' },
  { key: 'showLabel', label: '数值标签', type: 'switch', group: '系列' },
];

const gaugeSeries: StyleField[] = [
  { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' },
  { key: 'gaugeMin', label: '最小值', type: 'number', min: 0, max: 100, step: 1, group: '系列' },
  { key: 'gaugeMax', label: '最大值', type: 'number', min: 1, max: 200, step: 1, group: '系列' },
  { key: 'showLabel', label: '数值标签', type: 'switch', group: '系列' },
];

const kpiFields: StyleField[] = [
  ...boardFields,
  { key: 'valueSize', label: '数值字号', type: 'number', min: 18, max: 48, step: 2, unit: 'px', group: '数值' },
  { key: 'upColor', label: '上升色', type: 'color', group: '数值' },
  { key: 'downColor', label: '下降色', type: 'color', group: '数值' },
];

/** 量产 62 条（chart-line-1 仍用黄金样例 meta） */
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

  for (let n = 1; n <= 5; n += 1) {
    list.push(
      makeMeta(
        `chart-combo-${n}`,
        'chart',
        '组合图',
        `组合图·样式${n}`,
        { w: 720, h: 320 },
        'combo',
        [...boardFields, ...lineSeries, ...barSeries.filter((f) => f.key !== 'seriesColors'), ...legendFields, ...axisFields],
        boardPair('供水量与能耗', { lineSmooth: n !== 4, areaOpacity: n === 2 ? 25 : 0, barWidth: 22, stack: n === 3 }),
        COMBO_DEMO,
        { data: true, event: true },
      ),
    );
    list.push(
      makeMeta(
        `chart-funnel-${n}`,
        'chart',
        '漏斗图',
        `漏斗图·样式${n}`,
        { w: 400, h: 360 },
        'nameValue',
        [...boardFields, { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' }, { key: 'showLabel', label: '数值标签', type: 'switch', group: '系列' }, ...legendFields],
        boardPair('工单处理漏斗', { showLabel: true, showLegend: n !== 5, boardEnabled: n !== 4 }),
        [
          { name: '受理', value: 128 },
          { name: '派单', value: 102 },
          { name: '处理', value: 86 },
          { name: '完结', value: 79 },
        ],
        { data: true, event: true },
      ),
    );
    list.push(
      makeMeta(
        `chart-radar-${n}`,
        'chart',
        '雷达图',
        `雷达图·样式${n}`,
        { w: 420, h: 320 },
        'radar',
        [...boardFields, { key: 'seriesColors', label: '系列颜色', type: 'colorList', group: '系列' }, { key: 'areaOpacity', label: '面积透明度', type: 'number', min: 0, max: 80, step: 5, unit: '%', group: '系列' }, ...legendFields],
        boardPair('水质综合评分', { areaOpacity: n === 4 ? 0 : 25, showLegend: n !== 5 }),
        RADAR_DEMO,
        { data: true, event: true },
      ),
    );
    list.push(
      makeMeta(
        `chart-gauge-${n}`,
        'chart',
        '仪表盘',
        `仪表盘·样式${n}`,
        { w: 360, h: 280 },
        'nameValue',
        [...boardFields, ...gaugeSeries],
        boardPair('设备在线率', { gaugeMin: 0, gaugeMax: 100, showLabel: true, boardEnabled: n !== 5 }),
        [{ name: '在线率', value: 96 }],
        { data: true, event: true },
      ),
    );
  }

  const kpis: { id: string; label: string; protocol: Meta['dataProtocol']; size: { w: number; h: number }; data: unknown }[] = [
    { id: 'kpi-card-1', label: '指标卡·样式1', protocol: 'kpi-1', size: { w: 280, h: 140 }, data: [{ name: '累计供水', value: '12842', unit: 'm³', trend: 4.2, trendDir: 'up' }] },
    { id: 'kpi-card-2', label: '指标卡·样式2', protocol: 'kpi-2', size: { w: 560, h: 140 }, data: [{ name: '管网压力', value: '0.38', unit: 'MPa', percent: 76 }, { name: '今日告警', value: '7', unit: '条', percent: 22 }] },
    { id: 'kpi-card-2p', label: '指标卡·样式2plus', protocol: 'kpi-2', size: { w: 640, h: 150 }, data: [{ name: '进厂流量', value: '1860', unit: 'm³/h', percent: 82 }, { name: '出厂流量', value: '1740', unit: 'm³/h', percent: 79 }] },
    { id: 'kpi-card-3', label: '指标卡·样式3', protocol: 'kpi-3', size: { w: 480, h: 200 }, data: { center: { name: '综合评分', value: '92' }, sides: [{ name: '水质', percent: 96 }, { name: '压力', percent: 88 }] } },
    { id: 'kpi-card-3p', label: '指标卡·样式3plus', protocol: 'kpi-3', size: { w: 520, h: 220 }, data: { center: { name: '负荷', value: '68%' }, sides: [{ name: '高峰', percent: 81 }, { name: '低谷', percent: 44 }] } },
    { id: 'kpi-card-5', label: '指标卡·样式5', protocol: 'kpi-5', size: { w: 240, h: 140 }, data: { name: '设备在线率', value: '96.4', unit: '%' } },
    { id: 'kpi-card-5p', label: '指标卡·样式5plus', protocol: 'kpi-5', size: { w: 260, h: 150 }, data: { name: '完结率', value: '91.2', unit: '%' } },
    { id: 'kpi-card-8', label: '指标卡·样式8', protocol: 'kpi-8', size: { w: 640, h: 120 }, data: [{ name: '供水', value: '1.2万', unit: 'm³', icon: 'droplet' }, { name: '电耗', value: '428', unit: 'kWh', icon: 'zap' }] },
    { id: 'kpi-card-9', label: '指标卡·样式9', protocol: 'kpi-8', size: { w: 640, h: 130 }, data: [{ name: '工单', value: '128', unit: '单' }, { name: '完结', value: '79', unit: '单' }] },
    { id: 'kpi-card-10', label: '指标卡·样式10', protocol: 'kpi-2', size: { w: 300, h: 160 }, data: [{ name: '夜间流量', value: '420', unit: 'm³/h', percent: 35 }] },
    { id: 'kpi-card-11', label: '指标卡·样式11', protocol: 'kpi-2', size: { w: 300, h: 160 }, data: [{ name: '漏损率', value: '8.6', unit: '%', percent: 8.6 }] },
    { id: 'kpi-card-list', label: '指标列表', protocol: 'kpi-list', size: { w: 280, h: 320 }, data: [{ name: '滨江站', value: '0.38' }, { name: '萧山站', value: '0.41' }, { name: '余杭站', value: '0.35' }] },
  ];
  kpis.forEach((item) => {
    list.push(
      makeMeta(item.id, 'chart', '指标卡', item.label, item.size, item.protocol, kpiFields, boardPair(item.label.replace('指标卡·', ''), { valueSize: 28, upColor: '#22C55E', downColor: '#EF4444' }), item.data, { data: true, event: true }),
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
      { w: 520, h: 72 },
      'weather',
      [...boardFields, { key: 'adcode', label: 'adcode', type: 'text', group: '天气' }, { key: 'timeFormat', label: '时间格式', type: 'text', group: '天气' }],
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
      { w: 420, h: 110 },
      'weather',
      [...boardFields, { key: 'adcode', label: 'adcode', type: 'text', group: '天气' }, { key: 'timeFormat', label: '时间格式', type: 'text', group: '天气' }],
      boardPair('天气', { adcode: '330108', timeFormat: 'YYYY-MM-DD HH:mm', boardEnabled: true }),
      undefined,
      { data: true, event: false },
    ),
  );

  const borders = [
    { n: 1, label: '边框·默认深蓝' },
    { n: 2, label: '边框·工业蓝' },
    { n: 3, label: '边框·科幻紫' },
    { n: 4, label: '边框·橙金' },
    { n: 5, label: '边框·青绿' },
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
      { dark: { opacity: 0 }, light: { opacity: 8 } },
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
