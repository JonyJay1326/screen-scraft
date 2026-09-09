import { getBuiltinComponentMetadata } from './component-metadata';
import { validateAiEditorPlanResponse, validateAiStylePatch } from './ai-validators';
import type {
  AiEditorPlanRequest,
  AiEditorPlanResponse,
  ComponentDoc,
  PageDoc,
  ScreenDoc,
  StyleValue,
} from './types';

export type AiEditorDraftResult =
  | { ok: true; screen: ScreenDoc }
  | { ok: false; error: string };

/**
 * 从正式大屏构造 AI 预览副本。调用方只需在成功后选择预览或原子替换，
 * 因此预览和应用共享同一套目标边界及样式校验。
 */
export function buildAiEditorDraft(
  screen: ScreenDoc,
  plan: AiEditorPlanResponse,
  request: AiEditorPlanRequest,
  currentEditorRevision: number,
): AiEditorDraftResult {
  if (plan.editorRevision !== currentEditorRevision || plan.editorRevision !== request.editorRevision) {
    return failure('画布已变化，请重新生成');
  }
  const planIssues = validateAiEditorPlanResponse(plan);
  if (planIssues.length) {
    return failure(`AI 方案结构不合法：${planIssues[0].message}`);
  }
  if (!plan.operations.length) {
    return failure('方案中没有可应用的修改');
  }

  const draft = cloneScreen(screen);
  const requestPage = draft.pages.find((page) => page.id === request.pageId);
  if (!requestPage) {
    return failure('方案目标页面已不存在');
  }
  const allowedComponentIds = new Set(request.componentIds);
  const allowedPageIds = new Set([request.pageId]);

  for (const operation of plan.operations) {
    if (operation.targetType === 'page') {
      if (request.scope === 'selected' || !allowedPageIds.has(operation.targetId)) {
        return failure(`页面 ${operation.targetId} 不在本次 AI 修改范围内`);
      }
      const page = draft.pages.find((item) => item.id === operation.targetId);
      if (!page) {
        return failure(`方案目标页面 ${operation.targetId} 已不存在`);
      }
      page.background = { ...page.background, ...operation.backgroundPatch };
      continue;
    }

    if (!allowedComponentIds.has(operation.targetId)) {
      return failure(`组件 ${operation.targetId} 不在本次 AI 修改范围内`);
    }
    const located = findTargetComponent(draft.pages, requestPage, request.scope, operation.targetId);
    if (!located) {
      return failure(`方案目标组件 ${operation.targetId} 已不存在`);
    }
    const componentError = validateTargetComponent(located.component, operation.stylePatch);
    if (componentError) {
      return failure(componentError);
    }
    located.component.style = { ...located.component.style, ...operation.stylePatch };
  }
  return { ok: true, screen: draft };
}

function findTargetComponent(
  pages: PageDoc[],
  requestPage: PageDoc,
  scope: AiEditorPlanRequest['scope'],
  targetId: string,
): { page: PageDoc; component: ComponentDoc } | null {
  const candidates = scope === 'screen' ? pages : [requestPage];
  for (const page of candidates) {
    const component = page.components.find((item) => item.id === targetId);
    if (component) {
      return { page, component };
    }
  }
  return null;
}

function validateTargetComponent(
  component: ComponentDoc,
  stylePatch: Record<string, StyleValue>,
): string | null {
  if (component.locked || component.hidden) {
    return `组件“${component.name}”当前不可修改`;
  }
  if (component.definitionSnapshot) {
    return `组件“${component.name}”当前不支持 AI 样式编辑`;
  }
  if (!component.templateId.startsWith('chart-') && !component.templateId.startsWith('kpi-')) {
    return `组件“${component.name}”当前不支持 AI 样式编辑`;
  }
  const metadata = getBuiltinComponentMetadata(component.templateId);
  if (!metadata) {
    return `组件“${component.name}”缺少共享样式目录`;
  }
  const patchIssues = validateAiStylePatch(metadata.styleSchema, stylePatch);
  if (patchIssues.length) {
    return `组件“${component.name}”的方案未通过校验：${patchIssues[0].message}`;
  }
  return null;
}

function cloneScreen(screen: ScreenDoc): ScreenDoc {
  return JSON.parse(JSON.stringify(screen)) as ScreenDoc;
}

function failure(error: string): AiEditorDraftResult {
  return { ok: false, error };
}
