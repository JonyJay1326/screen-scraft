import {
  validateAiStylePatch,
  type ComponentDoc,
  type SafeBorderSpec,
} from '@screencraft/shared';

export interface ResolvedSafeBorderStyle extends Omit<SafeBorderSpec, 'kind' | 'schemaVersion'> {}

/** 只合并通过实例快照 schema 校验的字段，非法运行时样式回退到安全描述。 */
export function resolveSafeBorderStyle(doc: ComponentDoc): ResolvedSafeBorderStyle {
  const definition = doc.definitionSnapshot!;
  const spec = definition.safeSpec as SafeBorderSpec;
  const instanceStyle = Object.fromEntries(
    Object.entries(doc.style).filter(([key, value]) => (
      validateAiStylePatch(definition.styleSchema, { [key]: value }).length === 0
    )),
  );
  const merged = {
    ...borderSpecStyle(spec),
    ...definition.defaultStyle[doc.theme],
    ...instanceStyle,
  };
  return {
    cornerType: enumOr(merged.cornerType, ['cut', 'bracket', 'notch', 'line'], spec.cornerType),
    cornerSize: numberOr(merged.cornerSize, spec.cornerSize),
    primaryColor: stringOr(merged.primaryColor, spec.primaryColor),
    accentColor: stringOr(merged.accentColor, spec.accentColor),
    backgroundColor: stringOr(merged.backgroundColor, spec.backgroundColor),
    lineWidth: numberOr(merged.lineWidth, spec.lineWidth),
    lineOpacity: numberOr(merged.lineOpacity, spec.lineOpacity),
    innerGlow: numberOr(merged.innerGlow, spec.innerGlow),
    outerGlow: numberOr(merged.outerGlow, spec.outerGlow),
    glowOpacity: numberOr(merged.glowOpacity, spec.glowOpacity),
    titlePosition: enumOr(merged.titlePosition, ['none', 'topLeft', 'topCenter'], spec.titlePosition),
    contentPadding: numberOr(merged.contentPadding, spec.contentPadding),
  };
}

function borderSpecStyle(spec: SafeBorderSpec): ResolvedSafeBorderStyle {
  return {
    cornerType: spec.cornerType,
    cornerSize: spec.cornerSize,
    primaryColor: spec.primaryColor,
    accentColor: spec.accentColor,
    backgroundColor: spec.backgroundColor,
    lineWidth: spec.lineWidth,
    lineOpacity: spec.lineOpacity,
    innerGlow: spec.innerGlow,
    outerGlow: spec.outerGlow,
    glowOpacity: spec.glowOpacity,
    titlePosition: spec.titlePosition,
    contentPadding: spec.contentPadding,
  };
}

function enumOr<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}
