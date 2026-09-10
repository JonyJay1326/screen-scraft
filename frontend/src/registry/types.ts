import type { Component } from 'vue';
import type { ProtocolKind, StyleField } from '@screencraft/shared';

export type { ProtocolKind, StyleField, StyleFieldType } from '@screencraft/shared';

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
