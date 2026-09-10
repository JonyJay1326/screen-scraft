import {
  validateComponentInstanceStyle,
  type ComponentDoc,
  type SafeNineSliceSpec,
} from '@screencraft/shared';

export interface ResolvedSafeNineSliceStyle {
  sliceTop: number;
  sliceRight: number;
  sliceBottom: number;
  sliceLeft: number;
  contentPadding: number;
  assetUrl: string;
}

/** 只合并通过实例样式校验的字段；assetUrl 等只读字段可从实例或默认样式读取。 */
export function resolveSafeNineSliceStyle(doc: ComponentDoc): ResolvedSafeNineSliceStyle {
  const definition = doc.definitionSnapshot!;
  const spec = definition.safeSpec as SafeNineSliceSpec;
  const instanceStyle = Object.fromEntries(
    Object.entries(doc.style).filter(([key, value]) => (
      validateComponentInstanceStyle(definition.styleSchema, { [key]: value }).length === 0
    )),
  );
  const merged = {
    ...nineSliceSpecStyle(spec),
    ...definition.defaultStyle[doc.theme],
    ...instanceStyle,
  };
  return {
    sliceTop: numberOr(merged.sliceTop, spec.slice.top),
    sliceRight: numberOr(merged.sliceRight, spec.slice.right),
    sliceBottom: numberOr(merged.sliceBottom, spec.slice.bottom),
    sliceLeft: numberOr(merged.sliceLeft, spec.slice.left),
    contentPadding: numberOr(merged.contentPadding, 16),
    assetUrl: stringOr(merged.assetUrl, ''),
  };
}

function nineSliceSpecStyle(spec: SafeNineSliceSpec): Record<string, unknown> {
  return {
    sliceTop: spec.slice.top,
    sliceRight: spec.slice.right,
    sliceBottom: spec.slice.bottom,
    sliceLeft: spec.slice.left,
    contentPadding: 16,
  };
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}
