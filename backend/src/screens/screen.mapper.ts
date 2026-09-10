import { Category, ScreenDoc } from '@screencraft/shared';
import { Screen, ScreenDocument } from './screen.schema';

/** 大屏文档转契约 */
export function toScreenDoc(doc: ScreenDocument | (Screen & { _id: { toString(): string }; createdAt: Date; updatedAt: Date })): ScreenDoc {
  return {
    _id: String(doc._id),
    projectId: doc.projectId,
    name: doc.name,
    category: doc.category as Category,
    deployed: doc.deployed,
    fitMode: doc.fitMode,
    canvas: doc.canvas,
    pages: doc.pages,
    thumbnail: doc.thumbnail,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
