/** 指标卡 / 表格列表预览 SVG（与 KpiFamily / TableFamily 布局对齐） */

type ThemeName = 'dark' | 'light';

type ThemeTokens = {
  bg: string;
  panel: string;
  panel2: string;
  border: string;
  t1: string;
  t2: string;
  pri: string;
  acc: string;
  up: string;
  down: string;
  warn: string;
  err: string;
};

const W = 320;
const H = 160;

/** 主题色板 */
function tokensOf(theme: ThemeName): ThemeTokens {
  if (theme === 'light') {
    return {
      bg: '#F4F7FB',
      panel: '#FFFFFF',
      panel2: '#FAFBFC',
      border: '#E4E7ED',
      t1: '#303133',
      t2: '#6B7280',
      pri: '#2F7FF7',
      acc: '#0EA5E9',
      up: '#16A34A',
      down: '#DC2626',
      warn: '#D97706',
      err: '#DC2626',
    };
  }
  return {
    bg: '#0D1730',
    panel: '#12203C',
    panel2: '#16294E',
    border: '#1E3A66',
    t1: '#EAF2FF',
    t2: '#9FB3D1',
    pri: '#2F7FF7',
    acc: '#35E0FF',
    up: '#22C55E',
    down: '#EF4444',
    warn: '#F59E0B',
    err: '#EF4444',
  };
}

/** XML 文本转义 */
function esc(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 包装为完整 SVG */
function wrap(inner: string, theme: ThemeName, withBoard: boolean, title?: string): string {
  const t = tokensOf(theme);
  const titleOffset = withBoard && title ? 22 : 0;
  const contentTop = withBoard ? 14 + titleOffset : 0;
  const boardLayer = withBoard
    ? `<rect x="6" y="6" width="${W - 12}" height="${H - 12}" rx="8" fill="${t.panel}" stroke="${t.border}"/>
       ${title ? `<text x="16" y="24" fill="${t.t2}" font-size="11" font-family="sans-serif">${esc(title)}</text>` : ''}`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="8" fill="${t.bg}"/>
  ${boardLayer}
  <g transform="translate(0 ${contentTop})">${inner}</g>
</svg>
`;
}

/** 进度条 */
function progressBar(x: number, y: number, w: number, percent: number, t: ThemeTokens): string {
  const pw = Math.max(0, Math.min(100, percent)) / 100 * w;
  return `<rect x="${x}" y="${y}" width="${w}" height="4" rx="2" fill="${t.border}"/>
<rect x="${x}" y="${y}" width="${pw}" height="4" rx="2" fill="${t.pri}"/>`;
}

/** 指标卡内容 */
function kpiInner(kind: string, data: unknown, style: Record<string, unknown>, t: ThemeTokens): string {
  const valueSize = Number(style.valueSize ?? 26);
  const up = String(style.upColor ?? t.up);
  const down = String(style.downColor ?? t.down);
  const padX = 16;

  if (kind === '1' && Array.isArray(data)) {
    const item = data[0] as { name: string; value: string; unit?: string; trend?: number; trendDir?: string };
    const trendColor = item.trendDir === 'down' ? down : up;
    const arrow = item.trendDir === 'down' ? '↓' : '↑';
    return `
      <text x="${padX}" y="22" fill="${t.t2}" font-size="12" font-family="sans-serif">${esc(item.name)}</text>
      <text x="${padX}" y="56" fill="${t.t1}" font-size="${valueSize}" font-weight="700" font-family="sans-serif">${esc(item.value)}<tspan font-size="12" font-weight="400" fill="${t.t2}">${esc(item.unit ?? '')}</tspan></text>
      <text x="${padX}" y="80" fill="${trendColor}" font-size="12" font-family="sans-serif">${arrow} ${esc(item.trend)}%</text>`;
  }

  if ((kind === '2' || kind === '10' || kind === '11') && Array.isArray(data)) {
    const items = data as { name: string; value: string; unit?: string; percent?: number }[];
    const gap = 10;
    const cellW = (W - 32 - gap * (items.length - 1)) / items.length;
    return items
      .map((item, i) => {
        const x = padX + i * (cellW + gap);
        const bar =
          item.percent !== undefined ? progressBar(x + 10, 78, cellW - 20, Number(item.percent), t) : '';
        return `
        <rect x="${x}" y="6" width="${cellW}" height="100" rx="6" fill="${t.panel2}" stroke="${t.border}"/>
        <text x="${x + 12}" y="28" fill="${t.t2}" font-size="11" font-family="sans-serif">${esc(item.name)}</text>
        <text x="${x + 12}" y="56" fill="${t.t1}" font-size="${Math.min(valueSize, 24)}" font-weight="700" font-family="sans-serif">${esc(item.value)}<tspan font-size="11" font-weight="400" fill="${t.t2}">${esc(item.unit ?? '')}</tspan></text>
        ${bar}`;
      })
      .join('');
  }

  if (kind === '3' && data && typeof data === 'object') {
    const body = data as { center: { name: string; value: string }; sides: { name: string; percent: number }[] };
    const cx = 68;
    const cy = 58;
    const r = 46;
    // 数字与标签作为一组垂直居中：数值略上、标签紧贴其下
    const valueY = cy - 2;
    const labelY = cy + 16;
    const sides = (body.sides ?? [])
      .map(
        (s, i) =>
          `<text x="136" y="${42 + i * 28}" fill="${t.t2}" font-size="12" font-family="sans-serif">${esc(s.name)}</text>
           <text x="176" y="${42 + i * 28}" fill="${t.acc}" font-size="15" font-weight="700" font-family="sans-serif">${esc(s.percent)}%</text>`,
      )
      .join('');
    return `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.pri}" stroke-width="3"/>
      <text x="${cx}" y="${valueY}" text-anchor="middle" dominant-baseline="middle" fill="${t.t1}" font-size="${valueSize}" font-weight="700" font-family="sans-serif">${esc(body.center.value)}</text>
      <text x="${cx}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" fill="${t.t2}" font-size="11" font-family="sans-serif">${esc(body.center.name)}</text>
      ${sides}`;
  }

  if (kind === '5' && data && typeof data === 'object') {
    const item = data as { name: string; value: string; unit?: string };
    return `
      <text x="${padX}" y="34" fill="${t.t2}" font-size="12" font-family="sans-serif">${esc(item.name)}</text>
      <text x="${padX}" y="72" fill="${t.t1}" font-size="${valueSize}" font-weight="700" font-family="sans-serif">${esc(item.value)}<tspan font-size="12" font-weight="400" fill="${t.t2}">${esc(item.unit ?? '')}</tspan></text>`;
  }

  if ((kind === '8') && Array.isArray(data)) {
    const items = data as { name: string; value: string; unit?: string }[];
    const gap = 10;
    const cellW = (W - 32 - gap * (items.length - 1)) / items.length;
    return items
      .map((item, i) => {
        const x = padX + i * (cellW + gap);
        return `
        <rect x="${x}" y="14" width="${cellW}" height="84" rx="6" fill="${t.panel2}" stroke="${t.border}"/>
        <text x="${x + 12}" y="40" fill="${t.t2}" font-size="12" font-family="sans-serif">${esc(item.name)}</text>
        <text x="${x + 12}" y="72" fill="${t.t1}" font-size="22" font-weight="700" font-family="sans-serif">${esc(item.value)}<tspan font-size="11" font-weight="400" fill="${t.t2}">${esc(item.unit ?? '')}</tspan></text>`;
      })
      .join('');
  }

  if (kind === 'list' && Array.isArray(data)) {
    const items = data as { name: string; value: string }[];
    return items
      .map((item, i) => {
        const y = 22 + i * 32;
        return `
        <text x="${padX}" y="${y}" fill="${t.t2}" font-size="12" font-family="sans-serif">${esc(item.name)}</text>
        <text x="${W - 20}" y="${y}" text-anchor="end" fill="${t.t1}" font-size="13" font-weight="700" font-family="sans-serif">${esc(item.value)}</text>
        <line x1="${padX}" y1="${y + 10}" x2="${W - 20}" y2="${y + 10}" stroke="${t.border}"/>`;
      })
      .join('');
  }

  return `<text x="16" y="50" fill="${t.t2}" font-size="12">指标卡</text>`;
}

/** 表格内容 */
function tableInner(
  data: { columns: { key: string; label: string }[]; rows: Record<string, unknown>[] },
  style: Record<string, unknown>,
  t: ThemeTokens,
  alarm: boolean,
): string {
  const cols = data.columns ?? [];
  const rows = (data.rows ?? []).slice(0, 3);
  const padX = 14;
  const tableW = W - 28;
  const colW = tableW / Math.max(cols.length, 1);
  const headY = 8;
  const rowH = 28;

  const headBg = `<rect x="${padX}" y="${headY}" width="${tableW}" height="26" fill="${t.panel2}"/>`;
  const head = cols
    .map(
      (col, i) =>
        `<text x="${padX + 8 + i * colW}" y="${headY + 17}" fill="${t.t2}" font-size="11" font-family="sans-serif">${esc(col.label)}</text>`,
    )
    .join('');

  const body = rows
    .map((row, ri) => {
      const y = headY + 26 + ri * rowH;
      const stripe =
        style.stripe && ri % 2 === 1
          ? `<rect x="${padX}" y="${y}" width="${tableW}" height="${rowH}" fill="${t.panel2}" fill-opacity=".55"/>`
          : '';
      const cells = cols
        .map((col, ci) => {
          const val = row[col.key];
          const textX = padX + 8 + ci * colW;
          if (alarm && col.key === 'level') {
            const text = String(val);
            const color = text.includes('严重') ? t.err : text.includes('重要') ? t.warn : t.pri;
            return `
            <circle cx="${textX + 4}" cy="${y + 14}" r="4" fill="${color}"/>
            <text x="${textX + 14}" y="${y + 18}" fill="${t.t1}" font-size="11" font-family="sans-serif">${esc(val)}</text>`;
          }
          return `<text x="${textX}" y="${y + 18}" fill="${t.t1}" font-size="11" font-family="sans-serif">${esc(val)}</text>`;
        })
        .join('');
      return `${stripe}${cells}
        <line x1="${padX}" y1="${y + rowH}" x2="${padX + tableW}" y2="${y + rowH}" stroke="${t.border}"/>`;
    })
    .join('');

  return `${headBg}${head}<line x1="${padX}" y1="${headY + 26}" x2="${padX + tableW}" y2="${headY + 26}" stroke="${t.border}"/>${body}`;
}

/**
 * 按模板元数据生成 KPI / 表格 / 天气 / 边框预览 SVG。
 * 非目标模板返回 null。
 */
export function buildWidgetPreviewSvg(input: {
  id: string;
  theme: ThemeName;
  style: Record<string, unknown>;
  data: unknown;
}): string | null {
  const { id, theme, style, data } = input;
  const t = tokensOf(theme);
  const withBoard = Boolean(style.boardEnabled);
  const title = withBoard && style.boardTitle ? String(style.boardTitle) : undefined;

  if (id.startsWith('kpi-card-')) {
    const kind = id.replace('kpi-card-', '');
    return wrap(kpiInner(kind, data, style, t), theme, withBoard, title);
  }

  if (id === 'table-list' || id === 'table-alarm') {
    const table = data as { columns: { key: string; label: string }[]; rows: Record<string, unknown>[] };
    if (!table?.columns) {
      return null;
    }
    return wrap(tableInner(table, style, t, id === 'table-alarm'), theme, withBoard, title);
  }

  if (id === 'weather-1' || id === 'weather-2') {
    return wrap(weatherInner(id, t), theme, withBoard, title);
  }

  if (id.startsWith('border-')) {
    const n = Number(id.split('-')[1] || 1);
    return borderSvg(n, theme, String(style.title || style.boardTitle || ''));
  }

  return null;
}

/** 天气预览内容（示意真实布局） */
function weatherInner(id: string, t: ThemeTokens): string {
  if (id === 'weather-2') {
    return `
      <text x="18" y="58" font-size="36">⛅</text>
      <text x="68" y="52" fill="${t.t1}" font-size="30" font-weight="700" font-family="sans-serif">29°</text>
      <text x="148" y="40" fill="${t.t1}" font-size="14" font-weight="600" font-family="sans-serif">杭州 · 多云</text>
      <text x="148" y="64" fill="${t.t2}" font-size="12" font-family="sans-serif">湿度 62% · AQI 48 · 14:30</text>`;
  }
  return `
    <text x="16" y="54" font-size="26">⛅</text>
    <text x="52" y="42" fill="${t.t1}" font-size="15" font-weight="600" font-family="sans-serif">杭州 · 多云 29°C</text>
    <text x="52" y="68" fill="${t.t2}" font-size="12" font-family="sans-serif">湿度 62% · AQI 48 · 14:30</text>`;
}

/** 边框真实样式预览 */
function borderSvg(variant: number, theme: ThemeName, title: string): string {
  const t = tokensOf(theme);
  const cfg =
    variant === 2
      ? { stroke: '#2F7FF7', width: 3, corner: '#2F7FF7', cornerSize: 12, glow: '' }
      : variant === 3
        ? { stroke: '#A78BFA', width: 1.5, corner: '#C4B5FD', cornerSize: 11, glow: `inset 0 0 20px rgba(167,139,250,.25)` }
        : { stroke: 'rgba(53,114,200,.7)', width: 1.5, corner: '#5B9CFF', cornerSize: 10, glow: '' };
  const x = 18;
  const y = 16;
  const bw = W - 36;
  const bh = H - 32;
  const cs = cfg.cornerSize;
  const label = title || (variant === 2 ? '工业蓝' : variant === 3 ? '科幻紫' : '默认深蓝');
  const glowRect =
    variant === 3
      ? `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="6" fill="rgba(28,20,48,.45)"/>`
      : `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="6" fill="rgba(14,26,51,.35)"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="8" fill="${t.bg}"/>
  ${glowRect}
  <rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="6" fill="none" stroke="${cfg.stroke}" stroke-width="${cfg.width}"/>
  <path d="M${x} ${y + cs}V${y}H${x + cs}" fill="none" stroke="${cfg.corner}" stroke-width="2"/>
  <path d="M${x + bw - cs} ${y}H${x + bw}V${y + cs}" fill="none" stroke="${cfg.corner}" stroke-width="2"/>
  <path d="M${x} ${y + bh - cs}V${y + bh}H${x + cs}" fill="none" stroke="${cfg.corner}" stroke-width="2"/>
  <path d="M${x + bw - cs} ${y + bh}H${x + bw}V${y + bh - cs}" fill="none" stroke="${cfg.corner}" stroke-width="2"/>
  <text x="${x + 14}" y="${y + 22}" fill="${t.t1}" font-size="12" font-family="sans-serif" letter-spacing="1">${esc(label)}</text>
</svg>
`;
}

/** 是否属于本模块生成的预览 */
export function isWidgetPreviewId(id: string): boolean {
  return (
    id.startsWith('kpi-card-') ||
    id === 'table-list' ||
    id === 'table-alarm' ||
    id.startsWith('weather-') ||
    id.startsWith('border-')
  );
}
