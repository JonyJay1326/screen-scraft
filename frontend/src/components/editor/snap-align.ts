/** 画布矩形 */
export type CanvasRect = { x: number; y: number; w: number; h: number };

/** 对齐辅助线 */
export type AlignGuide = { orient: 'v' | 'h'; pos: number };

const DEFAULT_TOLERANCE = 6;

/** 收集矩形的竖直/水平吸附参考线（边与中心） */
function collectAxes(rect: CanvasRect): { xs: number[]; ys: number[] } {
  return {
    xs: [rect.x, rect.x + rect.w / 2, rect.x + rect.w],
    ys: [rect.y, rect.y + rect.h / 2, rect.y + rect.h],
  };
}

/** 去重辅助线 */
function dedupeGuides(guides: AlignGuide[]): AlignGuide[] {
  const seen = new Set<string>();
  const out: AlignGuide[] = [];
  for (const g of guides) {
    const key = `${g.orient}:${Math.round(g.pos)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(g);
  }
  return out;
}

/** 收集吸附目标轴（含画布边与中心） */
function collectTargets(
  others: CanvasRect[],
  canvas: { width: number; height: number },
): { xs: number[]; ys: number[] } {
  const xs = [0, canvas.width / 2, canvas.width];
  const ys = [0, canvas.height / 2, canvas.height];
  for (const other of others) {
    xs.push(...collectAxes(other).xs);
    ys.push(...collectAxes(other).ys);
  }
  return { xs, ys };
}

/**
 * 在候选轴中找最近吸附偏移；超出容差返回 null。
 */
function nearestDelta(selfAxes: number[], targets: number[], tolerance: number): number | null {
  let best = 0;
  let minAbs = tolerance + 1;
  for (const sx of selfAxes) {
    for (const tx of targets) {
      const d = tx - sx;
      const ad = Math.abs(d);
      if (ad < minAbs) {
        minAbs = ad;
        best = d;
      }
    }
  }
  return minAbs <= tolerance ? best : null;
}

/**
 * 移动时吸附到其它组件边/中心，并返回应对齐的辅助线。
 * 仅调整 x/y，不改宽高。
 */
export function snapMove(
  moving: CanvasRect,
  others: CanvasRect[],
  canvas: { width: number; height: number },
  tolerance = DEFAULT_TOLERANCE,
): { x: number; y: number; guides: AlignGuide[] } {
  const { xs: targetsX, ys: targetsY } = collectTargets(others, canvas);
  const self = collectAxes(moving);
  const dx = nearestDelta(self.xs, targetsX, tolerance);
  const dy = nearestDelta(self.ys, targetsY, tolerance);
  const nextX = dx == null ? moving.x : moving.x + dx;
  const nextY = dy == null ? moving.y : moving.y + dy;
  const snapped = { x: nextX, y: nextY, w: moving.w, h: moving.h };
  const snappedAxes = collectAxes(snapped);
  const guides: AlignGuide[] = [];
  if (dx != null) {
    for (const sx of snappedAxes.xs) {
      for (const tx of targetsX) {
        if (Math.abs(sx - tx) <= 0.5) {
          guides.push({ orient: 'v', pos: tx });
        }
      }
    }
  }
  if (dy != null) {
    for (const sy of snappedAxes.ys) {
      for (const ty of targetsY) {
        if (Math.abs(sy - ty) <= 0.5) {
          guides.push({ orient: 'h', pos: ty });
        }
      }
    }
  }
  return { x: nextX, y: nextY, guides: dedupeGuides(guides) };
}

/**
 * 缩放时对正在拖动的边吸附到参考轴。
 * mode 与 CanvasItem 手柄一致，如 e / nw / se。
 */
export function snapResize(
  origin: CanvasRect,
  next: CanvasRect,
  mode: string,
  others: CanvasRect[],
  canvas: { width: number; height: number },
  tolerance = DEFAULT_TOLERANCE,
): { rect: CanvasRect; guides: AlignGuide[] } {
  const { xs: targetsX, ys: targetsY } = collectTargets(others, canvas);
  const rect = { ...next };
  const guides: AlignGuide[] = [];

  if (mode.includes('e')) {
    const right = rect.x + rect.w;
    for (const t of targetsX) {
      if (Math.abs(right - t) <= tolerance) {
        rect.w = Math.max(40, t - rect.x);
        guides.push({ orient: 'v', pos: t });
        break;
      }
    }
  }
  if (mode.includes('w')) {
    for (const t of targetsX) {
      if (Math.abs(rect.x - t) <= tolerance) {
        const right = origin.x + origin.w;
        rect.x = t;
        rect.w = Math.max(40, right - t);
        guides.push({ orient: 'v', pos: t });
        break;
      }
    }
  }
  if (mode.includes('s')) {
    const bottom = rect.y + rect.h;
    for (const t of targetsY) {
      if (Math.abs(bottom - t) <= tolerance) {
        rect.h = Math.max(40, t - rect.y);
        guides.push({ orient: 'h', pos: t });
        break;
      }
    }
  }
  if (mode.includes('n')) {
    for (const t of targetsY) {
      if (Math.abs(rect.y - t) <= tolerance) {
        const bottom = origin.y + origin.h;
        rect.y = t;
        rect.h = Math.max(40, bottom - t);
        guides.push({ orient: 'h', pos: t });
        break;
      }
    }
  }

  return { rect, guides: dedupeGuides(guides) };
}
