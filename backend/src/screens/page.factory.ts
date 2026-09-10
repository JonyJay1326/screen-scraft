import { randomUUID } from 'crypto';
import type { PageDoc } from '@screencraft/shared';

/** 新建空白页 */
export function createBlankPage(name = '页面 1'): PageDoc {
  return {
    id: randomUUID(),
    name,
    parentId: null,
    background: {
      type: 'normal',
      color: '#0D1730',
      opacity: 100,
      fill: 'cover',
    },
    components: [],
  };
}
