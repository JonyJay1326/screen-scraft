/** 大屏 / 模板分类值域 */
export type Category = '通用' | '工业' | '政务' | '医疗' | '交通' | '能源';

/** 展示端适配方式 */
export type FitMode = 'center' | 'width' | 'height' | 'stretch';

/** 组件数据协议种类 */
export type ProtocolKind =
  | 'axis'
  | 'combo'
  | 'radar'
  | 'nameValue'
  | 'table'
  | 'options'
  | 'weather'
  | 'kpi-1'
  | 'kpi-2'
  | 'kpi-3'
  | 'kpi-5'
  | 'kpi-8'
  | 'kpi-list';

/** 声明式样式字段；前后端与 AI 校验共用 */
export type StyleFieldType = 'text' | 'number' | 'switch' | 'color' | 'select' | 'colorList';
export type StyleValue = string | number | boolean | string[];

export interface StyleField {
  key: string;
  label: string;
  type: StyleFieldType;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  group: string;
  aiWritable: boolean;
  readOnly?: boolean;
}

export type CustomComponentGroup = 'line' | 'bar' | 'pie' | 'combo' | 'funnel' | 'radar' | 'gauge' | 'border';

export type SafeRendererKey =
  | 'echarts-safe-v1'
  | 'border-parametric-v1'
  | 'border-nine-slice-v1';

export type ChartFamily = Exclude<CustomComponentGroup, 'border'>;

export interface SafeChartSpecV1 {
  kind: 'chart';
  schemaVersion: 1;
  family: ChartFamily;
  option: SafeChartOptionV1;
}

export interface SafeChartOptionV1 {
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

export type ChartFidelity = 'exact' | 'approximate';

export type SafeChartColor = string | {
  type: 'linear';
  direction: 'vertical' | 'horizontal' | 'diagonal';
  stops: { offset: number; color: string }[];
};

export interface SafeChartLabel {
  show: boolean;
  position: 'top' | 'inside' | 'center' | 'outside' | 'right';
  color: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  distance: number;
}

export type SafeChartVisualValue =
  | string
  | number
  | boolean
  | null
  | SafeChartVisualValue[]
  | SafeChartVisualObject;

export interface SafeChartVisualObject {
  [key: string]: SafeChartVisualValue;
}

/**
 * 经过后端安全投影的 ECharts 纯视觉扩展。
 * 只允许写入既有 renderer 节点，不允许携带数据、函数或外部资源。
 */
export interface SafeChartVisualOverrides {
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

export interface SafeChartSpecV2 {
  kind: 'chart';
  schemaVersion: 2;
  family: ChartFamily;
  fidelity: ChartFidelity;
  option: SafeChartOptionV2;
}

export interface SafeChartOptionV2 {
  grid?: { left: number; right: number; top: number; bottom: number; containLabel: boolean };
  palette?: string[];
  backgroundColor?: string;
  visual?: SafeChartVisualOverrides;
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

export type SafeChartSpec = SafeChartSpecV1 | SafeChartSpecV2;

export interface SafeBorderSpec {
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

export interface SafeNineSliceSpec {
  kind: 'nineSlice';
  schemaVersion: 1;
  assetId: string;
  slice: { top: number; right: number; bottom: number; left: number };
}

export interface ComponentDefinitionSnapshot {
  source: 'generated' | 'personal' | 'public';
  presetId?: string;
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

export interface ScreenDoc {
  _id: string;
  projectId: string;
  name: string;
  category: Category;
  deployed: boolean;
  fitMode: FitMode;
  canvas: { width: number; height: number };
  pages: PageDoc[];
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageDoc {
  id: string;
  name: string;
  parentId: string | null;
  background: {
    type: 'normal';
    color: string;
    opacity: number;
    image?: string;
    fill: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  };
  components: ComponentDoc[];
}

export interface ComponentDoc {
  id: string;
  templateId: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
  groupId: string | null;
  theme: 'dark' | 'light';
  style: Record<string, unknown>;
  data?: DataBinding;
  events: EventDoc[];
  definitionSnapshot?: ComponentDefinitionSnapshot;
}

export interface DataBinding {
  source: 'static' | 'api' | 'builtin';
  staticData?: unknown;
  apiId?: string;
  refreshSec?: number;
  builtin?: { provider: 'tencentWeather'; adcode: string };
}

export interface EventDoc {
  id: string;
  name: string;
  trigger: 'click' | 'dblclick' | 'mouseenter' | 'mouseleave' | 'change';
  action: 'jumpPage' | 'jumpLink' | 'toggleVisibility' | 'callApi';
  config: {
    pageId?: string;
    url?: string;
    openMode?: 'new' | 'current';
    targets?: { componentId: string; state: 'show' | 'hide' | 'toggle' }[];
    targetComponentIds?: string[];
  };
}

export interface ApiConfigDoc {
  _id: string;
  name: string;
  type: 'sql' | 'external' | 'mock';
  dataProtocol?: ProtocolKind;
  sql?: string;
  mockKey?: string;
  external?: {
    url: string;
    method: 'GET' | 'POST';
    headers?: Record<string, string>;
    authType?: 'none' | 'bearer' | 'basic';
    authSecretRef?: string;
  };
  params: { name: string; type: 'string' | 'number'; defaultValue?: unknown }[];
  createdAt: string;
  updatedAt: string;
}

export interface UserDoc {
  _id: string;
  username: string;
  role: 'admin' | 'member';
  enabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AxisData = { categories: string[]; series: { name: string; data: number[] }[] };
export type ComboData = {
  categories: string[];
  series: { name: string; type: 'line' | 'bar'; yAxisIndex?: 0 | 1; data: number[] }[];
};
export type RadarData = {
  indicators: { name: string; max?: number }[];
  series: { name: string; data: number[] }[];
};
export type NameValueData = { name: string; value: number }[];
export type TableData = { columns: { key: string; label: string }[]; rows: Record<string, string | number>[] };
export type DropdownOptions = { label: string; value: string }[];

export type TencentWeatherData = {
  status: number;
  message: string;
  result: {
    realtime: {
      province: string;
      city: string;
      district: string;
      adcode: number;
      update_time: string;
      infos: {
        weather: string;
        temperature: number;
        wind_direction: string;
        wind_power: string;
        humidity: number;
        air_pressure: number;
      };
      air?: { aqi: number; pm10: number; pm25: number; no2: number; o3: number; so2: number; co: number };
    }[];
  };
};

export type AiStyleOperation =
  | {
      targetType: 'component';
      targetId: string;
      stylePatch: Record<string, StyleValue>;
    }
  | {
      targetType: 'page';
      targetId: string;
      backgroundPatch: Partial<Pick<PageDoc['background'], 'color' | 'opacity'>>;
    };

export interface AiEditorContext {
  pageBackground?: Pick<PageDoc['background'], 'color' | 'opacity'>;
  components: Array<
    Pick<ComponentDoc, 'id' | 'templateId' | 'name' | 'theme' | 'locked' | 'hidden' | 'style' | 'definitionSnapshot'>
  >;
}

export interface AiEditorPlanRequest {
  screenId: string;
  pageId: string;
  scope: 'selected' | 'page' | 'screen';
  componentIds: string[];
  instruction: string;
  referenceAssetId?: string;
  editorRevision: number;
  context: AiEditorContext;
}

export interface AiEditorPlanResponse {
  planId: string;
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

export interface AiGenerateComponentRequest {
  screenId: string;
  pageId: string;
  instruction: string;
  kind: 'chart' | 'border';
  referenceAssetId?: string;
  editorRevision: number;
}

export interface AiGeneratedComponent {
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

export interface AiReferenceAsset {
  _id: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  size: number;
  width: number;
  height: number;
  expiresAt: string;
}

export type AiScreenComponentType =
  | 'text'
  | 'kpi'
  | 'kpiList'
  | 'line'
  | 'bar'
  | 'pie'
  | 'gauge'
  | 'table'
  | 'border'
  | 'unsupported';

export interface AiScreenBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AiScreenBackgroundLayerKind = 'image' | 'interactiveScene' | 'video' | 'unknown';

/** 整屏截图模型能力测试结果；仅用于评估，不可直接写入画布。 */
export interface AiScreenAnalysisResult {
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
    /** 位于业务组件下方的页面级视觉层诊断，不含实际资产。 */
    backgroundLayer?: {
      kind: AiScreenBackgroundLayerKind;
      bounds: AiScreenBounds;
      description: string;
      confidence: number;
      notes: string;
    };
  };
  ignoredRegions: Array<{
    bounds: AiScreenBounds;
    reason: string;
  }>;
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

export interface AiScreenAnalysisRequest {
  referenceAssetId: string;
}

export interface AiScreenAnalysisTestResponse {
  model: string;
  /** 上游 message.content 原文，不进行修正。 */
  rawContent: string;
  /** JSON 解析值；合法坐标可用时按行优先顺序重排 components/order。 */
  parsedContent: unknown | null;
  validationIssues: Array<{ path: string; message: string }>;
}

export type AiScreenDraftComponent = AiScreenAnalysisResult['components'][number] & {
  id: string;
  included: boolean;
};

/** 用户在写入画布前检查和修正的本地结构草稿。 */
export interface AiScreenStructureDraft {
  canvas: AiScreenAnalysisResult['canvas'];
  components: AiScreenDraftComponent[];
}

/** 永久九宫格边框图资产 */
export interface AiBorderAsset {
  _id: string;
  mimeType: 'image/png' | 'image/webp';
  size: number;
  width: number;
  height: number;
  url: string;
}

export interface AiEditorCapabilities {
  visionEnabled: boolean;
  visionUnavailableReason?: string;
}

export interface CustomComponentPreset {
  _id: string;
  ownerId: string;
  name: string;
  description?: string;
  scope: 'personal' | 'public';
  definition: ComponentDefinitionSnapshot;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiSettingsView {
  provider: 'deepseek';
  baseUrl: string;
  textModel: string;
  visionModel: string;
  visionEnabled: boolean;
  apiKeyMasked: string;
}

export const DEFAULT_DEEPSEEK_SETTINGS = {
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com',
  textModel: 'deepseek-v4-flash',
  visionModel: 'deepseek-v4-flash-vision-exp',
  visionEnabled: true,
} as const;

/** 统一响应信封 */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}
