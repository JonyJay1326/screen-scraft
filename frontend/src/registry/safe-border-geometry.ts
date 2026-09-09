import type { SafeBorderSpec } from '@screencraft/shared';

export interface SafeBorderGeometry {
  width: number;
  height: number;
  corner: number;
  framePoints: string;
  cornerMarks: string[];
  innerFrame?: { x: number; y: number; width: number; height: number };
}

export interface SafeBorderTitleGeometry {
  x: number;
  y: number;
  anchor: 'start' | 'middle';
}

/** 按实际像素构造固定图元，角标始终等宽等高，不随组件宽高比分别拉伸。 */
export function buildSafeBorderGeometry(
  width: number,
  height: number,
  cornerSize: number,
  contentPadding: number,
  cornerType: SafeBorderSpec['cornerType'],
): SafeBorderGeometry {
  const safeWidth = Math.max(1, finiteOr(width, 1));
  const safeHeight = Math.max(1, finiteOr(height, 1));
  const cornerLimit = Math.max(0, Math.min(safeWidth, safeHeight) / 2 - 1);
  const corner = clamp(finiteOr(cornerSize, 0), 0, cornerLimit);
  const pad = clamp(finiteOr(contentPadding, 0), 0, cornerLimit);
  const framePoints = cornerType === 'cut'
    ? points([
        [corner, 0], [safeWidth - corner, 0], [safeWidth, corner],
        [safeWidth, safeHeight - corner], [safeWidth - corner, safeHeight],
        [corner, safeHeight], [0, safeHeight - corner], [0, corner],
      ])
    : cornerType === 'notch'
      ? notchFrame(safeWidth, safeHeight, corner)
      : points([[0, 0], [safeWidth, 0], [safeWidth, safeHeight], [0, safeHeight]]);
  const innerWidth = safeWidth - pad * 2;
  const innerHeight = safeHeight - pad * 2;
  return {
    width: safeWidth,
    height: safeHeight,
    corner,
    framePoints,
    cornerMarks: buildCornerMarks(safeWidth, safeHeight, corner, cornerType),
    ...(pad > 0 && innerWidth > 1 && innerHeight > 1
      ? { innerFrame: { x: pad, y: pad, width: innerWidth, height: innerHeight } }
      : {}),
  };
}

export function borderTitleGeometry(
  width: number,
  corner: number,
  position: SafeBorderSpec['titlePosition'],
): SafeBorderTitleGeometry {
  if (position === 'topCenter') {
    return { x: width / 2, y: Math.max(16, Math.min(28, corner + 6)), anchor: 'middle' };
  }
  return { x: Math.max(12, corner + 8), y: Math.max(16, Math.min(28, corner + 6)), anchor: 'start' };
}

function notchFrame(width: number, height: number, corner: number): string {
  const inner = corner * 0.45;
  return points([
    [corner, 0], [width - corner, 0], [width - inner, inner], [width, corner],
    [width, height - corner], [width - inner, height - inner], [width - corner, height],
    [corner, height], [inner, height - inner], [0, height - corner],
    [0, corner], [inner, inner],
  ]);
}

function buildCornerMarks(
  width: number,
  height: number,
  corner: number,
  cornerType: SafeBorderSpec['cornerType'],
): string[] {
  if (corner <= 0) {
    return [];
  }
  const short = Math.max(2, corner * (cornerType === 'line' ? 0.62 : 1));
  if (cornerType === 'cut') {
    return [
      points([[corner, 0], [0, corner], [0, short * 1.65]]),
      points([[width - corner, 0], [width, corner], [width, short * 1.65]]),
      points([[width, height - corner], [width - corner, height], [width - short * 1.65, height]]),
      points([[corner, height], [0, height - corner], [0, height - short * 1.65]]),
    ];
  }
  if (cornerType === 'notch') {
    const inner = corner * 0.45;
    return [
      points([[corner, 0], [inner, inner], [0, corner]]),
      points([[width - corner, 0], [width - inner, inner], [width, corner]]),
      points([[width, height - corner], [width - inner, height - inner], [width - corner, height]]),
      points([[corner, height], [inner, height - inner], [0, height - corner]]),
    ];
  }
  const inset = cornerType === 'bracket' ? Math.max(1, corner * 0.18) : 0;
  return [
    points([[inset, short], [inset, inset], [short, inset]]),
    points([[width - short, inset], [width - inset, inset], [width - inset, short]]),
    points([[width - inset, height - short], [width - inset, height - inset], [width - short, height - inset]]),
    points([[short, height - inset], [inset, height - inset], [inset, height - short]]),
  ];
}

function points(values: Array<[number, number]>): string {
  return values.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
