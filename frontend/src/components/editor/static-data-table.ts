import type {
  AxisData,
  ComboData,
  DropdownOptions,
  NameValueData,
  ProtocolKind,
  RadarData,
  TableData,
} from '@screencraft/shared';
import { cloneJson } from '../../utils/clone';

export type TableColumn = { key: string; label: string };
export type TableRow = Record<string, string | number>;

export type StaticTableModel =
  | { kind: 'axis'; data: AxisData | ComboData; combo: boolean }
  | { kind: 'radar'; data: RadarData }
  | { kind: 'nameValue'; data: NameValueData }
  | { kind: 'options'; data: DropdownOptions }
  | { kind: 'table'; data: TableData }
  | { kind: 'kpiList'; protocol: ProtocolKind; data: Record<string, string | number>[] }
  | { kind: 'kpi5'; data: { name: string; value: string | number; unit?: string } }
  | { kind: 'kpi3'; data: { center: { name: string; value: string | number }; sides: Record<string, string | number>[] } };

const KPI_LIST_COLUMNS: Record<string, TableColumn[]> = {
  'kpi-1': [
    { key: 'name', label: '名称' },
    { key: 'value', label: '数值' },
    { key: 'unit', label: '单位' },
    { key: 'trend', label: '趋势' },
    { key: 'trendDir', label: '方向' },
  ],
  'kpi-2': [
    { key: 'name', label: '名称' },
    { key: 'value', label: '数值' },
    { key: 'unit', label: '单位' },
    { key: 'percent', label: '占比' },
  ],
  'kpi-8': [
    { key: 'name', label: '名称' },
    { key: 'value', label: '数值' },
    { key: 'unit', label: '单位' },
    { key: 'icon', label: '图标' },
  ],
  'kpi-list': [
    { key: 'name', label: '名称' },
    { key: 'value', label: '数值' },
  ],
};

/** 是否支持静态表格编辑 */
export function supportsStaticTable(protocol: ProtocolKind | undefined): boolean {
  if (!protocol || protocol === 'weather') {
    return false;
  }
  return true;
}

/** 从组件静态数据解析表格模型 */
export function resolveStaticTableModel(protocol: ProtocolKind | undefined, staticData: unknown): StaticTableModel | undefined {
  if (!protocol || staticData == null) {
    return undefined;
  }
  if (protocol === 'axis' || protocol === 'combo') {
    const data = staticData as AxisData | ComboData;
    if (!Array.isArray(data.categories)) {
      return undefined;
    }
    return { kind: 'axis', data, combo: protocol === 'combo' };
  }
  if (protocol === 'radar') {
    const data = staticData as RadarData;
    if (!Array.isArray(data.indicators)) {
      return undefined;
    }
    return { kind: 'radar', data };
  }
  if (protocol === 'nameValue') {
    if (!Array.isArray(staticData)) {
      return undefined;
    }
    return { kind: 'nameValue', data: staticData as NameValueData };
  }
  if (protocol === 'options') {
    if (!Array.isArray(staticData)) {
      return undefined;
    }
    return { kind: 'options', data: staticData as DropdownOptions };
  }
  if (protocol === 'table') {
    const data = staticData as TableData;
    if (!Array.isArray(data.columns) || !Array.isArray(data.rows)) {
      return undefined;
    }
    return { kind: 'table', data };
  }
  if (protocol === 'kpi-5') {
    const data = staticData as { name?: string; value?: string | number; unit?: string };
    if (typeof data.name !== 'string' || data.value === undefined) {
      return undefined;
    }
    return { kind: 'kpi5', data: { name: data.name, value: data.value, unit: data.unit } };
  }
  if (protocol === 'kpi-3') {
    const data = staticData as {
      center?: { name?: string; value?: string | number };
      sides?: Record<string, string | number>[];
    };
    if (!data.center || typeof data.center.name !== 'string' || !Array.isArray(data.sides)) {
      return undefined;
    }
    return {
      kind: 'kpi3',
      data: {
        center: { name: data.center.name, value: data.center.value ?? '' },
        sides: data.sides,
      },
    };
  }
  if (KPI_LIST_COLUMNS[protocol] && Array.isArray(staticData)) {
    return {
      kind: 'kpiList',
      protocol,
      data: staticData as Record<string, string | number>[],
    };
  }
  return undefined;
}

/** 主表列定义 */
export function modelColumns(model: StaticTableModel, section: 'main' | 'sides' = 'main'): TableColumn[] {
  if (model.kind === 'axis') {
    return [
      { key: 'categories', label: 'categories' },
      ...model.data.series.map((serie) => ({ key: serie.name, label: serie.name })),
    ];
  }
  if (model.kind === 'radar') {
    return [
      { key: 'indicator', label: '维度' },
      { key: 'max', label: '最大值' },
      ...model.data.series.map((serie) => ({ key: `s:${serie.name}`, label: serie.name })),
    ];
  }
  if (model.kind === 'nameValue') {
    return [
      { key: 'name', label: '名称' },
      { key: 'value', label: '数值' },
    ];
  }
  if (model.kind === 'options') {
    return [
      { key: 'label', label: '显示名' },
      { key: 'value', label: '值' },
    ];
  }
  if (model.kind === 'table') {
    return model.data.columns.map((col) => ({ key: col.key, label: col.label }));
  }
  if (model.kind === 'kpiList') {
    return KPI_LIST_COLUMNS[model.protocol] ?? [
      { key: 'name', label: '名称' },
      { key: 'value', label: '数值' },
    ];
  }
  if (model.kind === 'kpi5') {
    return [
      { key: 'name', label: '名称' },
      { key: 'value', label: '数值' },
      { key: 'unit', label: '单位' },
    ];
  }
  if (model.kind === 'kpi3') {
    if (section === 'sides') {
      return [
        { key: 'name', label: '名称' },
        { key: 'percent', label: '占比' },
      ];
    }
    return [
      { key: 'name', label: '名称' },
      { key: 'value', label: '数值' },
    ];
  }
  return [];
}

/** 主表行数据 */
export function modelRows(model: StaticTableModel, section: 'main' | 'sides' = 'main'): TableRow[] {
  if (model.kind === 'axis') {
    return model.data.categories.map((label, index) => {
      const row: TableRow = { categories: label };
      model.data.series.forEach((serie) => {
        row[serie.name] = serie.data[index];
      });
      return row;
    });
  }
  if (model.kind === 'radar') {
    return model.data.indicators.map((indicator, index) => {
      const row: TableRow = {
        indicator: indicator.name,
        max: indicator.max ?? 100,
      };
      model.data.series.forEach((serie) => {
        row[`s:${serie.name}`] = serie.data[index] ?? 0;
      });
      return row;
    });
  }
  if (model.kind === 'nameValue') {
    return model.data.map((item) => ({ name: item.name, value: item.value }));
  }
  if (model.kind === 'options') {
    return model.data.map((item) => ({ label: item.label, value: item.value }));
  }
  if (model.kind === 'table') {
    return model.data.rows.map((row) => ({ ...row }));
  }
  if (model.kind === 'kpiList') {
    return model.data.map((row) => ({ ...row }));
  }
  if (model.kind === 'kpi5') {
    return [{ name: model.data.name, value: model.data.value, unit: model.data.unit ?? '' }];
  }
  if (model.kind === 'kpi3') {
    if (section === 'sides') {
      return model.data.sides.map((row) => ({ ...row }));
    }
    return [{ name: model.data.center.name, value: model.data.center.value }];
  }
  return [];
}

/** 是否允许加列 */
export function canAddColumn(model: StaticTableModel, section: 'main' | 'sides' = 'main'): boolean {
  if (section === 'sides') {
    return false;
  }
  return model.kind === 'axis' || model.kind === 'radar' || model.kind === 'table';
}

/** 是否允许加行 */
export function canAddRow(model: StaticTableModel, section: 'main' | 'sides' = 'main'): boolean {
  if (model.kind === 'kpi5') {
    return false;
  }
  if (model.kind === 'kpi3' && section === 'main') {
    return false;
  }
  return true;
}

/** 空 KPI 行 */
function emptyKpiRow(protocol: ProtocolKind): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  for (const col of KPI_LIST_COLUMNS[protocol] ?? [
    { key: 'name', label: '名称' },
    { key: 'value', label: '数值' },
  ]) {
    row[col.key] = col.key === 'name' ? '新项' : col.key === 'trendDir' ? 'up' : col.key === 'icon' ? 'circle' : 0;
  }
  return row;
}

/** 新建组合图系列 */
function createComboSerie(name: string, length: number): ComboData['series'][number] {
  return { name, type: 'bar', data: Array.from({ length }, () => 0) };
}

/** 写回单元格后的静态数据 */
export function applyCellEdit(
  model: StaticTableModel,
  row: number,
  key: string,
  value: string,
  section: 'main' | 'sides' = 'main',
): unknown {
  if (model.kind === 'axis') {
    const next = cloneJson(model.data);
    if (key === 'categories') {
      next.categories[row] = value;
    } else {
      const serie = next.series.find((item) => item.name === key);
      if (serie) {
        serie.data[row] = Number(value);
      }
    }
    return next;
  }
  if (model.kind === 'radar') {
    const next = cloneJson(model.data);
    if (key === 'indicator') {
      next.indicators[row].name = value;
    } else if (key === 'max') {
      next.indicators[row].max = Number(value) || 100;
    } else if (key.startsWith('s:')) {
      const serie = next.series.find((item) => item.name === key.slice(2));
      if (serie) {
        serie.data[row] = Number(value);
      }
    }
    return next;
  }
  if (model.kind === 'nameValue') {
    const next = cloneJson(model.data);
    if (key === 'name') {
      next[row].name = value;
    } else if (key === 'value') {
      next[row].value = Number(value);
    }
    return next;
  }
  if (model.kind === 'options') {
    const next = cloneJson(model.data);
    if (key === 'label' || key === 'value') {
      next[row][key] = value;
    }
    return next;
  }
  if (model.kind === 'table') {
    const next = cloneJson(model.data);
    next.rows[row] = { ...next.rows[row], [key]: value };
    return next;
  }
  if (model.kind === 'kpiList') {
    const next = cloneJson(model.data);
    const numeric = key !== 'name' && key !== 'unit' && key !== 'trendDir' && key !== 'icon';
    next[row] = {
      ...next[row],
      [key]: numeric && value !== '' && !Number.isNaN(Number(value)) ? Number(value) : value,
    };
    return next;
  }
  if (model.kind === 'kpi5') {
    const next = { ...model.data };
    if (key === 'name' || key === 'unit') {
      next[key] = value;
    } else if (key === 'value') {
      next.value = value;
    }
    return next;
  }
  if (model.kind === 'kpi3') {
    const next = cloneJson(model.data);
    if (section === 'sides') {
      next.sides[row] = {
        ...next.sides[row],
        [key]: key === 'name' ? value : Number(value) || 0,
      };
    } else if (key === 'name' || key === 'value') {
      next.center[key] = value;
    }
    return next;
  }
  return model;
}

/** 加行后的静态数据 */
export function applyAddRow(model: StaticTableModel, section: 'main' | 'sides' = 'main'): unknown {
  if (model.kind === 'axis') {
    const next = cloneJson(model.data);
    next.categories.push(`项${next.categories.length + 1}`);
    next.series.forEach((serie) => serie.data.push(0));
    return next;
  }
  if (model.kind === 'radar') {
    const next = cloneJson(model.data);
    next.indicators.push({ name: `维度${next.indicators.length + 1}`, max: 100 });
    next.series.forEach((serie) => serie.data.push(0));
    return next;
  }
  if (model.kind === 'nameValue') {
    const next = cloneJson(model.data);
    next.push({ name: `项${next.length + 1}`, value: 0 });
    return next;
  }
  if (model.kind === 'options') {
    const next = cloneJson(model.data);
    next.push({ label: `选项${next.length + 1}`, value: `opt${next.length + 1}` });
    return next;
  }
  if (model.kind === 'table') {
    const next = cloneJson(model.data);
    const row: Record<string, string | number> = {};
    next.columns.forEach((col) => {
      row[col.key] = '';
    });
    next.rows.push(row);
    return next;
  }
  if (model.kind === 'kpiList') {
    const next = cloneJson(model.data);
    next.push(emptyKpiRow(model.protocol));
    return next;
  }
  if (model.kind === 'kpi3' && section === 'sides') {
    const next = cloneJson(model.data);
    next.sides.push({ name: `项${next.sides.length + 1}`, percent: 0 });
    return next;
  }
  return model.kind === 'kpi5' || model.kind === 'kpi3' ? cloneJson(model.data) : model;
}

/** 加列后的静态数据 */
export function applyAddCol(model: StaticTableModel): unknown {
  if (model.kind === 'axis') {
    const next = cloneJson(model.data);
    if (model.combo) {
      const combo = next as ComboData;
      combo.series.push(createComboSerie(`系列${combo.series.length + 1}`, combo.categories.length));
    } else {
      const axis = next as AxisData;
      axis.series.push({ name: `系列${axis.series.length + 1}`, data: axis.categories.map(() => 0) });
    }
    return next;
  }
  if (model.kind === 'radar') {
    const next = cloneJson(model.data);
    next.series.push({
      name: `系列${next.series.length + 1}`,
      data: next.indicators.map(() => 0),
    });
    return next;
  }
  if (model.kind === 'table') {
    const next = cloneJson(model.data);
    const key = `col${next.columns.length + 1}`;
    next.columns.push({ key, label: `列${next.columns.length + 1}` });
    next.rows.forEach((row) => {
      row[key] = '';
    });
    return next;
  }
  return model;
}

/** 右键菜单后的静态数据 */
export function applyContextAction(
  model: StaticTableModel,
  action: string,
  row: number,
  colKey: string,
  section: 'main' | 'sides' = 'main',
): unknown {
  if (model.kind === 'axis') {
    const next = cloneJson(model.data);
    if (action === 'insertRowBefore' || action === 'insertRowAfter') {
      const at = action === 'insertRowBefore' ? row : row + 1;
      next.categories.splice(at, 0, '新项');
      next.series.forEach((serie) => serie.data.splice(at, 0, 0));
    } else if (action === 'deleteRow' && next.categories.length > 1) {
      next.categories.splice(row, 1);
      next.series.forEach((serie) => serie.data.splice(row, 1));
    } else if ((action === 'insertColBefore' || action === 'insertColAfter') && colKey !== 'categories') {
      const idx = next.series.findIndex((item) => item.name === colKey);
      const at = action === 'insertColBefore' ? idx : idx + 1;
      const serie = model.combo
        ? createComboSerie(`系列${next.series.length + 1}`, next.categories.length)
        : { name: `系列${next.series.length + 1}`, data: next.categories.map(() => 0) };
      next.series.splice(at, 0, serie);
    } else if (action === 'deleteCol' && colKey !== 'categories' && next.series.length > 1) {
      next.series = next.series.filter((item) => item.name !== colKey) as typeof next.series;
    }
    return next;
  }
  if (model.kind === 'radar') {
    const next = cloneJson(model.data);
    if (action === 'insertRowBefore' || action === 'insertRowAfter') {
      const at = action === 'insertRowBefore' ? row : row + 1;
      next.indicators.splice(at, 0, { name: '新维度', max: 100 });
      next.series.forEach((serie) => serie.data.splice(at, 0, 0));
    } else if (action === 'deleteRow' && next.indicators.length > 1) {
      next.indicators.splice(row, 1);
      next.series.forEach((serie) => serie.data.splice(row, 1));
    } else if ((action === 'insertColBefore' || action === 'insertColAfter') && colKey.startsWith('s:')) {
      const name = colKey.slice(2);
      const idx = next.series.findIndex((item) => item.name === name);
      const at = action === 'insertColBefore' ? idx : idx + 1;
      next.series.splice(at, 0, {
        name: `系列${next.series.length + 1}`,
        data: next.indicators.map(() => 0),
      });
    } else if (action === 'deleteCol' && colKey.startsWith('s:') && next.series.length > 1) {
      next.series = next.series.filter((item) => item.name !== colKey.slice(2));
    }
    return next;
  }
  if (model.kind === 'nameValue' || model.kind === 'options' || model.kind === 'kpiList') {
    const next = cloneJson(model.data) as Array<
      Record<string, string | number> | { name: string; value: number } | { label: string; value: string }
    >;
    if (action === 'insertRowBefore' || action === 'insertRowAfter') {
      const at = action === 'insertRowBefore' ? row : row + 1;
      if (model.kind === 'nameValue') {
        (next as NameValueData).splice(at, 0, { name: '新项', value: 0 });
      } else if (model.kind === 'options') {
        (next as DropdownOptions).splice(at, 0, { label: '新选项', value: `opt${next.length + 1}` });
      } else {
        (next as Record<string, string | number>[]).splice(at, 0, emptyKpiRow(model.protocol));
      }
    } else if (action === 'deleteRow' && next.length > 1) {
      next.splice(row, 1);
    }
    return next;
  }
  if (model.kind === 'table') {
    const next = cloneJson(model.data);
    if (action === 'insertRowBefore' || action === 'insertRowAfter') {
      const at = action === 'insertRowBefore' ? row : row + 1;
      const empty: Record<string, string | number> = {};
      next.columns.forEach((col) => {
        empty[col.key] = '';
      });
      next.rows.splice(at, 0, empty);
    } else if (action === 'deleteRow' && next.rows.length > 1) {
      next.rows.splice(row, 1);
    } else if ((action === 'insertColBefore' || action === 'insertColAfter') && colKey) {
      const idx = next.columns.findIndex((col) => col.key === colKey);
      if (idx >= 0) {
        const at = action === 'insertColBefore' ? idx : idx + 1;
        const key = `col${Date.now().toString(36)}`;
        next.columns.splice(at, 0, { key, label: `列${next.columns.length + 1}` });
        next.rows.forEach((item) => {
          item[key] = '';
        });
      }
    } else if (action === 'deleteCol' && next.columns.length > 1) {
      next.columns = next.columns.filter((col) => col.key !== colKey);
      next.rows.forEach((item) => {
        delete item[colKey];
      });
    }
    return next;
  }
  if (model.kind === 'kpi3' && section === 'sides') {
    const next = cloneJson(model.data);
    if (action === 'insertRowBefore' || action === 'insertRowAfter') {
      const at = action === 'insertRowBefore' ? row : row + 1;
      next.sides.splice(at, 0, { name: '新项', percent: 0 });
    } else if (action === 'deleteRow' && next.sides.length > 1) {
      next.sides.splice(row, 1);
    }
    return next;
  }
  return model.kind === 'kpi5' || model.kind === 'kpi3' ? cloneJson(model.data) : model;
}
