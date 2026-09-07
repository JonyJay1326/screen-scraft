import type { Component } from 'vue';

export type StyleFieldType = 'text' | 'number' | 'switch' | 'color' | 'select' | 'colorList';

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
}

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

export interface ComponentTemplate {
  id: string;
  category: 'chart' | 'decoration' | 'media' | 'control';
  group: string;
  label: string;
  previews: { dark: string; light: string };
  defaultSize: { w: number; h: number };
  dataProtocol?: ProtocolKind;
  defaultStyle: { dark: Record<string, unknown>; light: Record<string, unknown> };
  defaultData?: unknown;
  styleSchema: StyleField[];
  hasDataTab: boolean;
  hasEventTab: boolean;
  renderer: Component;
}
