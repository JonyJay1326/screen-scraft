import { chartLine1Template } from './templates/chart-line-1/meta';
import { buildCatalog } from './catalog';
import type { ComponentTemplate } from './types';

const metas: Omit<ComponentTemplate, 'renderer'>[] = [chartLine1Template, ...buildCatalog()];
const map = new Map(metas.map((item) => [item.id, item]));

/** 无 renderer 的模板元数据 */
export function listMetas(): Omit<ComponentTemplate, 'renderer'>[] {
  return metas;
}

/** 按 id 取元数据 */
export function getMeta(id: string): Omit<ComponentTemplate, 'renderer'> | undefined {
  return map.get(id);
}
