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

/** 统一响应信封 */
export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}
