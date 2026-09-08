import type { ProtocolKind, StyleField } from './types';

export interface BuiltinComponentMetadata {
  templateId: string;
  category: 'chart' | 'decoration' | 'media' | 'control';
  dataProtocol?: ProtocolKind;
  styleSchema: StyleField[];
}

const boardFields: StyleField[] = [
  field('boardEnabled', '底板框', 'switch', '底板框'),
  field('boardTitle', '标题文字', 'text', '底板框', { aiWritable: false }),
  field('boardPadding', '内边距', 'number', '底板框', { min: 0, max: 40, step: 2, unit: 'px' }),
];

const legendFields: StyleField[] = [
  field('showLegend', '显示图例', 'switch', '图例'),
  field('legendPosition', '图例位置', 'select', '图例', {
    options: [
      { label: '顶部居中', value: 'top' },
      { label: '右上', value: 'topRight' },
      { label: '底部居中', value: 'bottom' },
    ],
  }),
];

const axisFields: StyleField[] = [
  field('showXAxis', '显示 X 轴', 'switch', '坐标轴'),
  field('showYAxis', '显示 Y 轴', 'switch', '坐标轴'),
  field('axisLabelColor', '轴标签颜色', 'color', '坐标轴'),
  field('gridColor', '网格线颜色', 'color', '坐标轴'),
];

const lineFields: StyleField[] = [
  field('seriesColors', '系列颜色', 'colorList', '系列'),
  field('lineSmooth', '平滑曲线', 'switch', '系列'),
  field('lineWidth', '线宽', 'number', '系列', { min: 1, max: 6, step: 0.5, unit: 'px' }),
  field('areaOpacity', '面积透明度', 'number', '系列', { min: 0, max: 100, step: 5, unit: '%' }),
  field('showSymbol', '数据点标记', 'switch', '系列'),
  field('showLabel', '数值标签', 'switch', '系列'),
];

const barFields: StyleField[] = [
  field('seriesColors', '系列颜色', 'colorList', '系列'),
  field('barWidth', '柱宽', 'number', '系列', { min: 8, max: 48, step: 2, unit: '%' }),
  field('barGap', '柱间距', 'number', '系列', { min: 0, max: 80, step: 5, unit: '%' }),
  field('stack', '堆叠', 'switch', '系列'),
  field('horizontal', '条形图', 'switch', '系列'),
  field('showLabel', '数值标签', 'switch', '系列'),
];

const pieFields: StyleField[] = [
  field('seriesColors', '系列颜色', 'colorList', '系列'),
  field('innerRadius', '内径', 'number', '系列', { min: 0, max: 80, step: 5, unit: '%' }),
  field('roseType', '南丁格尔', 'switch', '系列'),
  field('showCenter', '中心文字', 'switch', '系列'),
  field('centerText', '中心标题', 'text', '系列', { aiWritable: false }),
  field('showLabel', '数值标签', 'switch', '系列'),
];

const funnelFields: StyleField[] = [
  field('seriesColors', '系列颜色', 'colorList', '系列'),
  field('showLabel', '数值标签', 'switch', '系列'),
  field('funnelSort', '排序', 'select', '系列', {
    options: [
      { label: '降序', value: 'descending' },
      { label: '升序', value: 'ascending' },
      { label: '原序', value: 'none' },
    ],
  }),
  field('funnelAlign', '对齐', 'select', '系列', {
    options: [
      { label: '居中', value: 'center' },
      { label: '左对齐', value: 'left' },
      { label: '右对齐', value: 'right' },
    ],
  }),
  field('funnelOrient', '方向', 'select', '系列', {
    options: [
      { label: '纵向', value: 'vertical' },
      { label: '横向', value: 'horizontal' },
    ],
  }),
  field('funnelGap', '层级间距', 'number', '系列', { min: 0, max: 24, step: 2, unit: 'px' }),
  field('minSize', '最小宽度', 'number', '系列', { min: 0, max: 60, step: 5, unit: '%' }),
];

const radarFields: StyleField[] = [
  field('seriesColors', '系列颜色', 'colorList', '系列'),
  field('areaOpacity', '面积透明度', 'number', '系列', { min: 0, max: 80, step: 5, unit: '%' }),
  field('lineWidth', '线宽', 'number', '系列', { min: 1, max: 6, step: 0.5, unit: 'px' }),
  field('showSymbol', '端点标记', 'switch', '系列'),
  field('radarShape', '雷达形状', 'select', '系列', {
    options: [
      { label: '多边形', value: 'polygon' },
      { label: '圆形', value: 'circle' },
    ],
  }),
  field('splitNumber', '分割段数', 'number', '系列', { min: 3, max: 8, step: 1 }),
];

const gaugeFields: StyleField[] = [
  field('seriesColors', '系列颜色', 'colorList', '系列'),
  field('gaugeMin', '最小值', 'number', '系列', { min: 0, max: 100, step: 1 }),
  field('gaugeMax', '最大值', 'number', '系列', { min: 1, max: 200, step: 1 }),
  field('gaugeStartAngle', '起始角度', 'number', '系列', { min: -360, max: 360, step: 5 }),
  field('gaugeEndAngle', '结束角度', 'number', '系列', { min: -360, max: 360, step: 5 }),
  field('axisLineWidth', '轨道宽度', 'number', '系列', { min: 6, max: 28, step: 2, unit: 'px' }),
  field('showPointer', '指针', 'switch', '系列'),
  field('showProgress', '进度弧', 'switch', '系列'),
  field('showSplitLine', '刻度线', 'switch', '系列'),
  field('gaugeZones', '分区色带', 'switch', '系列'),
  field('splitNumber', '分割段数', 'number', '系列', { min: 2, max: 12, step: 1 }),
  field('showLabel', '数值标签', 'switch', '系列'),
];

const kpiFields = [
  ...boardFields,
  field('valueSize', '数值字号', 'number', '数值', { min: 18, max: 48, step: 2, unit: 'px' }),
  field('upColor', '上升色', 'color', '数值'),
  field('downColor', '下降色', 'color', '数值'),
];

const schemas: Array<{
  matches: (id: string) => boolean;
  category: BuiltinComponentMetadata['category'];
  protocol?: ProtocolKind;
  fields: StyleField[];
}> = [
  { matches: (id) => id.startsWith('chart-line-'), category: 'chart', protocol: 'axis', fields: [...boardFields, ...lineFields, ...legendFields, ...axisFields] },
  { matches: (id) => id.startsWith('chart-bar-'), category: 'chart', protocol: 'axis', fields: [...boardFields, ...barFields, ...legendFields, ...axisFields] },
  { matches: (id) => id.startsWith('chart-combo-'), category: 'chart', protocol: 'combo', fields: [...boardFields, ...lineFields, ...barFields.filter((item) => item.key !== 'seriesColors' && item.key !== 'showLabel'), ...legendFields, ...axisFields] },
  { matches: (id) => id.startsWith('chart-pie-'), category: 'chart', protocol: 'nameValue', fields: [...boardFields, ...pieFields, ...legendFields] },
  { matches: (id) => id.startsWith('chart-funnel-'), category: 'chart', protocol: 'nameValue', fields: [...boardFields, ...funnelFields, ...legendFields] },
  { matches: (id) => id.startsWith('chart-radar-'), category: 'chart', protocol: 'radar', fields: [...boardFields, ...radarFields, ...legendFields] },
  { matches: (id) => id.startsWith('chart-gauge-'), category: 'chart', protocol: 'nameValue', fields: [...boardFields, ...gaugeFields] },
  { matches: (id) => id.startsWith('kpi-'), category: 'chart', fields: kpiFields },
  { matches: (id) => id.startsWith('table-'), category: 'chart', protocol: 'table', fields: [...boardFields, field('stripe', '斑马纹', 'switch', '表格')] },
  {
    matches: (id) => id.startsWith('weather-'),
    category: 'decoration',
    protocol: 'weather',
    fields: [
      ...boardFields,
      field('adcode', 'adcode', 'text', '天气', { aiWritable: false }),
      field('timeFormat', '时间格式', 'select', '天气', {
        aiWritable: false,
        options: [
          { label: '年月日 + 时分秒', value: 'YYYY-MM-DD HH:mm:ss' },
          { label: '年月日 + 时分', value: 'YYYY-MM-DD HH:mm' },
          { label: '月日 + 时分秒', value: 'MM-DD HH:mm:ss' },
          { label: '月日 + 时分', value: 'MM-DD HH:mm' },
          { label: '年月日', value: 'YYYY-MM-DD' },
          { label: '时分秒', value: 'HH:mm:ss' },
          { label: '时分', value: 'HH:mm' },
        ],
      }),
    ],
  },
  { matches: (id) => id.startsWith('border-'), category: 'decoration', fields: [...boardFields, field('title', '标题', 'text', '标题', { aiWritable: false })] },
  { matches: (id) => id === 'media-image', category: 'media', fields: [...boardFields, field('radius', '圆角', 'number', '样式', { min: 0, max: 40, step: 2, unit: 'px' }), field('src', '图片地址', 'text', '资源', { aiWritable: false })] },
  { matches: (id) => id === 'media-video', category: 'media', fields: [...boardFields, field('src', '视频地址', 'text', '资源', { aiWritable: false }), field('autoplay', '自动播放', 'switch', '播放', { aiWritable: false }), field('loop', '循环', 'switch', '播放', { aiWritable: false }), field('muted', '静音', 'switch', '播放', { aiWritable: false })] },
  { matches: (id) => id === 'control-button', category: 'control', fields: [field('text', '文字', 'text', '按钮', { aiWritable: false }), field('fontSize', '字号', 'number', '按钮', { min: 12, max: 28, step: 1, unit: 'px' }), field('bgColor', '背景', 'color', '按钮')] },
  { matches: (id) => id === 'control-imageButton', category: 'control', fields: [field('text', '文字', 'text', '按钮', { aiWritable: false }), field('src', '背景图', 'text', '按钮', { aiWritable: false })] },
  { matches: (id) => id === 'control-hotspot', category: 'control', fields: [field('opacity', '热区透明度', 'number', '热区', { min: 0, max: 40, step: 2, unit: '%' })] },
  { matches: (id) => id === 'control-dropdown', category: 'control', protocol: 'options', fields: [...boardFields, field('paramName', '绑定参数名', 'text', '联动', { aiWritable: false }), field('defaultValue', '默认选中项', 'text', '联动', { aiWritable: false })] },
  { matches: (id) => id === 'control-text', category: 'control', fields: [field('content', '文本内容', 'text', '文本', { aiWritable: false }), field('fontSize', '字号', 'number', '文本', { min: 12, max: 32, step: 1, unit: 'px' }), field('color', '颜色', 'color', '文本'), field('align', '对齐', 'select', '文本', { options: [{ label: '左', value: 'left' }, { label: '中', value: 'center' }, { label: '右', value: 'right' }] })] },
];

/** 后端可直接读取的内置模板安全元数据。 */
export function getBuiltinComponentMetadata(templateId: string): BuiltinComponentMetadata | undefined {
  const schema = schemas.find((item) => item.matches(templateId));
  if (!schema) {
    return undefined;
  }
  const protocol = protocolForKpi(templateId) ?? schema.protocol;
  return {
    templateId,
    category: schema.category,
    ...(protocol ? { dataProtocol: protocol } : {}),
    styleSchema: schema.fields.map(cloneField),
  };
}

function protocolForKpi(templateId: string): ProtocolKind | undefined {
  const map: Record<string, ProtocolKind> = {
    'kpi-card-1': 'kpi-1',
    'kpi-card-2': 'kpi-2',
    'kpi-card-3': 'kpi-3',
    'kpi-card-5': 'kpi-5',
    'kpi-card-8': 'kpi-8',
    'kpi-card-10': 'kpi-2',
    'kpi-card-11': 'kpi-2',
    'kpi-card-list': 'kpi-list',
  };
  return map[templateId];
}

function field(
  key: string,
  label: string,
  type: StyleField['type'],
  group: string,
  extra: Partial<Omit<StyleField, 'key' | 'label' | 'type' | 'group'>> = {},
): StyleField {
  return { key, label, type, group, aiWritable: true, ...extra };
}

function cloneField(value: StyleField): StyleField {
  return {
    ...value,
    ...(value.options ? { options: value.options.map((item) => ({ ...item })) } : {}),
  };
}
