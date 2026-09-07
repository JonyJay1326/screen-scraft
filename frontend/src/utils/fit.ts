import type { FitMode } from '@screencraft/shared';

export interface FitResult {
  scaleX: number;
  scaleY: number;
  left: number;
  top: number;
}

/** 按四种适配方式计算 1920×1080 画布在视口中的缩放 */
export function calcFit(mode: FitMode, viewW: number, viewH: number, canvasW = 1920, canvasH = 1080): FitResult {
  if (mode === 'stretch') {
    return { scaleX: viewW / canvasW, scaleY: viewH / canvasH, left: 0, top: 0 };
  }
  if (mode === 'width') {
    const s = viewW / canvasW;
    return { scaleX: s, scaleY: s, left: 0, top: (viewH - canvasH * s) / 2 };
  }
  if (mode === 'height') {
    const s = viewH / canvasH;
    return { scaleX: s, scaleY: s, left: (viewW - canvasW * s) / 2, top: 0 };
  }
  const s = Math.min(viewW / canvasW, viewH / canvasH);
  return { scaleX: s, scaleY: s, left: (viewW - canvasW * s) / 2, top: (viewH - canvasH * s) / 2 };
}
