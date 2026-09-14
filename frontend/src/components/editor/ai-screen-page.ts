import {
  createAiScreenCanvasTransform,
  projectAiScreenBounds,
  type AiScreenCanvasTransform,
  type AiScreenComponentType,
  type AiScreenStructureDraft,
  type ComponentDoc,
  type PageDoc,
} from '@screencraft/shared';
import { getTemplate } from '../../registry';
import { cloneJson } from '../../utils/clone';

const TEMPLATE_BY_TYPE: Partial<Record<AiScreenComponentType, string>> = {
  text: 'control-text',
  kpi: 'kpi-card-1',
  kpiList: 'kpi-card-list',
  line: 'chart-line-1',
  bar: 'chart-bar-1',
  pie: 'chart-pie-1',
  gauge: 'chart-gauge-1',
  table: 'table-list',
  border: 'border-1',
};

export interface AiScreenPageMapping {
  draftId: string;
  componentName: string;
  componentType: AiScreenComponentType;
  templateId: string;
  templateLabel: string;
}

export interface AiScreenPageSkippedItem {
  draftId: string;
  componentName: string;
  componentType: AiScreenComponentType;
  reason: string;
}

export interface AiScreenPageSkeleton {
  page: Omit<PageDoc, 'id'>;
  mappings: AiScreenPageMapping[];
  skipped: AiScreenPageSkippedItem[];
  warnings: string[];
  transform: AiScreenCanvasTransform;
}

/** 将已校对的结构草稿转换为无副作用的页面骨架预览。 */
export function buildAiScreenPageSkeleton(
  draft: AiScreenStructureDraft,
  targetCanvas: { width: number; height: number },
  pageName: string,
): AiScreenPageSkeleton {
  const transform = createAiScreenCanvasTransform(draft.canvas, targetCanvas);
  const theme = inferTheme(draft.canvas.backgroundColor);
  const mappings: AiScreenPageMapping[] = [];
  const skipped: AiScreenPageSkippedItem[] = [];
  const components: ComponentDoc[] = [];

  draft.components.filter((component) => component.included).forEach((component) => {
    const templateId = TEMPLATE_BY_TYPE[component.type];
    if (!templateId) {
      skipped.push({
        draftId: component.id,
        componentName: component.name,
        componentType: component.type,
        reason: component.type === 'unsupported' ? '待人工选择模板，未自动生成' : '没有对应的内置模板',
      });
      return;
    }
    const template = getTemplate(templateId);
    if (!template) {
      skipped.push({
        draftId: component.id,
        componentName: component.name,
        componentType: component.type,
        reason: `内置模板 ${templateId} 不存在`,
      });
      return;
    }
    const bounds = projectAiScreenBounds(component.bounds, transform, targetCanvas);
    const style = cloneJson(template.defaultStyle[theme]);
    applyRecognizedText(style, component.type, component.title || component.name, component.visibleTexts);
    components.push({
      id: `preview-${component.id}`,
      templateId,
      name: component.name,
      ...bounds,
      zIndex: components.length + 1,
      locked: false,
      hidden: false,
      groupId: null,
      theme,
      style,
      ...(template.defaultData === undefined
        ? {}
        : { data: { source: 'static' as const, staticData: cloneJson(template.defaultData) } }),
      events: [],
    });
    mappings.push({
      draftId: component.id,
      componentName: component.name,
      componentType: component.type,
      templateId,
      templateLabel: template.label,
    });
  });

  const warnings: string[] = [];
  if (draft.canvas.backgroundLayer) {
    warnings.push(`背景层“${draft.canvas.backgroundLayer.description}”不会生成，仅应用纯色背景`);
  }
  if (transform.scale !== 1 || transform.offsetX !== 0 || transform.offsetY !== 0) {
    warnings.push(`参考图按 ${(transform.scale * 100).toFixed(1)}% 等比缩放并居中到当前画布`);
  }

  return {
    page: {
      name: pageName,
      parentId: null,
      background: {
        type: 'normal',
        color: normalizeBackgroundColor(draft.canvas.backgroundColor),
        opacity: 100,
        fill: 'cover',
      },
      components,
    },
    mappings,
    skipped,
    warnings,
    transform,
  };
}

function applyRecognizedText(
  style: Record<string, unknown>,
  type: AiScreenComponentType,
  title: string,
  visibleTexts: string[],
): void {
  if (type === 'text') {
    style.content = visibleTexts.join(' ') || title;
    return;
  }
  if ('boardTitle' in style) {
    style.boardTitle = title;
  }
  if (type === 'border' && 'title' in style) {
    style.title = title;
  }
}

function inferTheme(backgroundColor: string): ComponentDoc['theme'] {
  const normalized = normalizeBackgroundColor(backgroundColor).slice(1);
  const [red, green, blue] = normalized.length === 3
    ? normalized.split('').map((value) => Number.parseInt(value + value, 16))
    : [normalized.slice(0, 2), normalized.slice(2, 4), normalized.slice(4, 6)].map((value) => Number.parseInt(value, 16));
  return red * 0.299 + green * 0.587 + blue * 0.114 > 160 ? 'light' : 'dark';
}

function normalizeBackgroundColor(color: string): string {
  return /^#[\da-f]{3}([\da-f]{3})?$/i.test(color) ? color : '#0D1730';
}
