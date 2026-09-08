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

export interface SafeChartSpec {
  kind: 'chart';
  schemaVersion: 1;
  family: ChartFamily;
  option: SafeChartOption;
}

export interface SafeChartOption {
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
  type: 'sql' | 'external';
  sql?: string;
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
  definitionSnapshot: ComponentDefinitionSnapshot;
  style: Record<string, unknown>;
  defaultData?: unknown;
  warnings: string[];
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
