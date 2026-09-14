import type { AiScreenBounds } from './types';

export interface AiScreenCanvasSize {
  width: number;
  height: number;
}

export interface AiScreenCanvasTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** 计算参考图到目标画布的等比包含变换，不改变任一画布尺寸。 */
export function createAiScreenCanvasTransform(
  source: AiScreenCanvasSize,
  target: AiScreenCanvasSize,
): AiScreenCanvasTransform {
  assertCanvasSize(source, '参考图');
  assertCanvasSize(target, '目标画布');
  const scale = Math.min(target.width / source.width, target.height / source.height);
  return {
    scale,
    offsetX: (target.width - source.width * scale) / 2,
    offsetY: (target.height - source.height * scale) / 2,
  };
}

/** 将原图像素边界投影到目标画布，并保证结果至少为 1px 且不越界。 */
export function projectAiScreenBounds(
  bounds: AiScreenBounds,
  transform: AiScreenCanvasTransform,
  target: AiScreenCanvasSize,
): AiScreenBounds {
  assertCanvasSize(target, '目标画布');
  if (![bounds.x, bounds.y, bounds.w, bounds.h, transform.scale, transform.offsetX, transform.offsetY].every(Number.isFinite)) {
    throw new RangeError('组件边界或画布变换包含无效数值');
  }
  if (bounds.w <= 0 || bounds.h <= 0 || transform.scale <= 0) {
    throw new RangeError('组件宽高和画布缩放必须大于 0');
  }
  const x = clamp(Math.round(transform.offsetX + bounds.x * transform.scale), 0, target.width - 1);
  const y = clamp(Math.round(transform.offsetY + bounds.y * transform.scale), 0, target.height - 1);
  const w = clamp(Math.round(bounds.w * transform.scale), 1, target.width - x);
  const h = clamp(Math.round(bounds.h * transform.scale), 1, target.height - y);
  return { x, y, w, h };
}

function assertCanvasSize(canvas: AiScreenCanvasSize, label: string): void {
  if (!Number.isFinite(canvas.width) || !Number.isFinite(canvas.height) || canvas.width <= 0 || canvas.height <= 0) {
    throw new RangeError(`${label}尺寸必须为正数`);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
