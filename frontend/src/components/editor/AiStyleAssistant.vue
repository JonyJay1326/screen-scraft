<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import {
  AI_PAGE_COMPONENT_LIMIT,
  AI_SCREEN_ANALYSIS_RECOMMENDED_COMPONENT_LIMIT,
  AI_SCREEN_COMPONENT_LIMIT,
  buildAiScreenStructureDraft,
  getBuiltinComponentMetadata,
  isProtocolValid,
  validateAiScreenStructureDraft,
  validateComponentDefinitionSnapshot,
  validateAiEditorPlanResponse,
  type AiGeneratedComponent,
  type AiReferenceAsset,
  type AiScreenBackgroundLayerKind,
  type AiScreenBounds,
  type AiScreenComponentType,
  type AiScreenDraftComponent,
  type AiScreenAnalysisTestResponse,
  type AiScreenStructureDraft,
  type AiEditorPlanRequest,
  type AiEditorPlanResponse,
  type ComponentDoc,
  type StyleValue,
} from '@screencraft/shared';
import { AlertTriangle, Check, Eye, Frame, ImagePlus, RotateCcw, Send, Sparkles, Trash2, WandSparkles, X } from 'lucide-vue-next';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  analyzeAiScreen,
  createAiEditorPlan,
  deleteAiReferenceAsset,
  getAiEditorCapabilities,
  generateAiComponent,
  uploadAiReferenceAsset,
} from '../../api/ai';
import { getTemplate } from '../../registry';
import { useScreenStore } from '../../stores/screen';

interface ChangeRow {
  targetKey: string;
  targetId: string;
  targetName: string;
  fieldKey: string;
  fieldLabel: string;
  before: StyleValue | unknown;
  after: StyleValue;
}

type EditorScope = AiEditorPlanRequest['scope'];

const backgroundLayerLabels: Record<AiScreenBackgroundLayerKind, string> = {
  image: '静态图片背景',
  interactiveScene: '交互式三维/GIS 场景',
  video: '视频背景',
  unknown: '未确认背景层',
};

const store = useScreenStore();
const screenScopeEnabled = import.meta.env.VITE_AI_SCREEN_SCOPE_ENABLED === 'true';
const open = ref(false);
const scope = ref<EditorScope>('selected');
const instruction = ref('');
const loading = ref(false);
const stage = ref('');
const errorMessage = ref('');
const lastAction = ref<'plan' | 'chart' | 'border' | 'screenTest'>('plan');
const plan = ref<AiEditorPlanResponse | null>(null);
const planRequest = ref<AiEditorPlanRequest | null>(null);
const generatedFeedback = ref<Pick<AiGeneratedComponent, 'name' | 'fidelity' | 'warnings' | 'unsupportedFeatures'> | null>(null);
const capabilitiesLoading = ref(false);
const visionEnabled = ref(false);
const visionUnavailableReason = ref('正在读取视觉能力…');
const referenceAsset = ref<AiReferenceAsset | null>(null);
const referencePreviewUrl = ref('');
const referenceBusy = ref(false);
const referenceDragging = ref(false);
const referenceInput = ref<HTMLInputElement | null>(null);
const screenAnalysis = ref<AiScreenAnalysisTestResponse | null>(null);
const structureDraft = ref<AiScreenStructureDraft | null>(null);
const activeDraftComponentId = ref('');
const structureConfirmed = ref(false);
let requestController: AbortController | null = null;
let requestSerial = 0;
let referenceSerial = 0;

const selectedComponents = computed(() => {
  const ids = new Set(store.selectedIds);
  return (store.currentPage?.components ?? []).filter((component) => ids.has(component.id));
});
const scopeComponents = computed(() => {
  if (scope.value === 'selected') {
    return selectedComponents.value;
  }
  if (scope.value === 'page') {
    return store.currentPage?.components ?? [];
  }
  return store.screen?.pages.flatMap((page) => page.components) ?? [];
});
const lockedCount = computed(() => scopeComponents.value.filter((component) => component.locked).length);
const hiddenCount = computed(() => scopeComponents.value.filter((component) => component.hidden).length);
const componentTypes = computed(() => [
  ...new Set(scopeComponents.value.map((component) => getTemplate(component.templateId)?.group ?? component.templateId)),
].slice(0, 3));
const stale = computed(() => Boolean(
  plan.value
  && planRequest.value
  && (plan.value.editorRevision !== store.editorRevision || planRequest.value.pageId !== store.currentPageId),
));
const scopeLimitError = computed(() => {
  if (scope.value === 'page' && scopeComponents.value.length > AI_PAGE_COMPONENT_LIMIT) {
    return `当前页面有 ${scopeComponents.value.length} 个组件，最多支持 ${AI_PAGE_COMPONENT_LIMIT} 个，请缩小范围`;
  }
  if (scope.value === 'screen' && scopeComponents.value.length > AI_SCREEN_COMPONENT_LIMIT) {
    return `整张大屏有 ${scopeComponents.value.length} 个组件，最多支持 ${AI_SCREEN_COMPONENT_LIMIT} 个，请缩小范围`;
  }
  return '';
});
const changes = computed<ChangeRow[]>(() => {
  if (!plan.value) {
    return [];
  }
  const components = new Map(
    (store.screen?.pages.flatMap((page) => page.components) ?? []).map((component) => [component.id, component]),
  );
  const pages = new Map((store.screen?.pages ?? []).map((page) => [page.id, page]));
  return plan.value.operations.flatMap((operation) => {
    if (operation.targetType === 'page') {
      const page = pages.get(operation.targetId);
      if (!page) {
        return [];
      }
      return Object.entries(operation.backgroundPatch).map(([fieldKey, after]) => ({
        targetKey: `page:${page.id}`,
        targetId: page.id,
        targetName: `${page.name}（页面背景）`,
        fieldKey,
        fieldLabel: fieldKey === 'color' ? '背景颜色' : '背景透明度',
        before: page.background[fieldKey as 'color' | 'opacity'],
        after,
      }));
    }
    const component = components.get(operation.targetId);
    if (!component) {
      return [];
    }
    const metadata = getBuiltinComponentMetadata(component.templateId);
    const template = getTemplate(component.templateId);
    return Object.entries(operation.stylePatch).map(([fieldKey, after]) => ({
      targetKey: `component:${component.id}`,
      targetId: component.id,
      targetName: component.name,
      fieldKey,
      fieldLabel: metadata?.styleSchema.find((field) => field.key === fieldKey)?.label ?? fieldKey,
      before: component.style[fieldKey] ?? template?.defaultStyle[component.theme]?.[fieldKey],
      after,
    }));
  });
});
const changeGroups = computed(() => {
  const groups = new Map<string, { targetName: string; rows: ChangeRow[] }>();
  changes.value.forEach((row) => {
    const current = groups.get(row.targetKey) ?? { targetName: row.targetName, rows: [] };
    current.rows.push(row);
    groups.set(row.targetKey, current);
  });
  return [...groups.entries()].map(([key, value]) => ({ key, ...value }));
});
const changedTargetCount = computed(() => changeGroups.value.length);
const mainColors = computed(() => {
  const result = new Set<string>();
  changes.value.forEach((item) => {
    const values = Array.isArray(item.after) ? item.after : [item.after];
    values.forEach((value) => {
      if (typeof value === 'string' && isColor(value)) {
        result.add(value);
      }
    });
  });
  return [...result].slice(0, 8);
});
const canGenerate = computed(() => Boolean(
  store.screen
  && store.currentPage
  && instruction.value.trim()
  && !scopeLimitError.value
  && (scope.value !== 'selected' || selectedComponents.value.length),
));
const canApply = computed(() => Boolean(plan.value?.operations.length && planRequest.value && !stale.value));
const structureDraftIssues = computed(() => (
  structureDraft.value ? validateAiScreenStructureDraft(structureDraft.value) : []
));
const includedDraftCount = computed(() => (
  structureDraft.value?.components.filter((component) => component.included).length ?? 0
));
const unsupportedDraftCount = computed(() => (
  structureDraft.value?.components.filter((component) => component.included && component.type === 'unsupported').length ?? 0
));
const screenComponentTypeOptions: Array<{ value: AiScreenComponentType; label: string }> = [
  { value: 'text', label: '文本' },
  { value: 'kpi', label: '单指标' },
  { value: 'kpiList', label: '指标列表' },
  { value: 'line', label: '折线图' },
  { value: 'bar', label: '柱状图' },
  { value: 'pie', label: '饼图/环图' },
  { value: 'gauge', label: '仪表盘' },
  { value: 'table', label: '表格' },
  { value: 'border', label: '装饰边框' },
  { value: 'unsupported', label: '待人工匹配' },
];
const draftBoundFields = ['x', 'y', 'w', 'h'] as const;

function showPanel(): void {
  open.value = true;
  void refreshCapabilities();
}

function closePanel(): void {
  cancelRequest();
  store.cancelAiPreview();
  plan.value = null;
  planRequest.value = null;
  generatedFeedback.value = null;
  screenAnalysis.value = null;
  clearStructureDraft();
  errorMessage.value = '';
  open.value = false;
  void removeReference(true);
}

async function refreshCapabilities(): Promise<void> {
  capabilitiesLoading.value = true;
  try {
    const capabilities = await getAiEditorCapabilities();
    visionEnabled.value = capabilities.visionEnabled;
    visionUnavailableReason.value = capabilities.visionUnavailableReason || '';
    if (!capabilities.visionEnabled && referenceAsset.value) {
      await removeReference(true);
    }
  } catch {
    visionEnabled.value = false;
    visionUnavailableReason.value = '无法读取视觉能力，请稍后重试';
  } finally {
    capabilitiesLoading.value = false;
  }
}

function selectReferenceFile(): void {
  if (visionEnabled.value && !referenceBusy.value) {
    referenceInput.value?.click();
  }
}

function handleReferenceInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) {
    void uploadReference(file);
  }
}

function handleReferenceDrop(event: DragEvent): void {
  referenceDragging.value = false;
  if (!visionEnabled.value || referenceBusy.value) {
    return;
  }
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    void uploadReference(file);
  }
}

async function uploadReference(file: File): Promise<void> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    errorMessage.value = '参考图仅支持 PNG、JPEG 或 WebP';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    errorMessage.value = '参考图不能超过 10MB';
    return;
  }
  const serial = ++referenceSerial;
  referenceBusy.value = true;
  errorMessage.value = '';
  screenAnalysis.value = null;
  clearStructureDraft();
  const previousId = referenceAsset.value?._id;
  try {
    const uploaded = await uploadAiReferenceAsset(file);
    if (serial !== referenceSerial) {
      await deleteAiReferenceAsset(uploaded._id).catch(() => {
        ElMessage.warning('参考图主动清理失败，将由服务端过期清理');
      });
      return;
    }
    clearReferencePreview();
    referenceAsset.value = uploaded;
    referencePreviewUrl.value = URL.createObjectURL(file);
    if (previousId && previousId !== uploaded._id) {
      void deleteAiReferenceAsset(previousId).catch(() => {
        ElMessage.warning('旧参考图主动清理失败，将由服务端过期清理');
      });
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  } finally {
    if (serial === referenceSerial) {
      referenceBusy.value = false;
    }
  }
}

async function removeReference(bestEffort = false): Promise<void> {
  const serial = ++referenceSerial;
  const id = referenceAsset.value?._id;
  clearReferencePreview();
  referenceAsset.value = null;
  screenAnalysis.value = null;
  clearStructureDraft();
  if (!id) {
    referenceBusy.value = false;
    return;
  }
  referenceBusy.value = true;
  try {
    await deleteAiReferenceAsset(id);
  } catch (error) {
    if (!bestEffort) {
      errorMessage.value = getErrorMessage(error);
    } else {
      ElMessage.warning('参考图主动清理失败，将由服务端过期清理');
    }
  } finally {
    if (serial === referenceSerial) {
      referenceBusy.value = false;
    }
  }
}

function clearReferencePreview(): void {
  if (referencePreviewUrl.value) {
    URL.revokeObjectURL(referencePreviewUrl.value);
    referencePreviewUrl.value = '';
  }
}

function cancelRequest(): void {
  requestSerial += 1;
  requestController?.abort();
  requestController = null;
  loading.value = false;
  stage.value = '';
}

function changeScope(nextScope: EditorScope): void {
  if (nextScope === 'screen' && !screenScopeEnabled) {
    return;
  }
  if (scope.value === nextScope) {
    return;
  }
  cancelRequest();
  store.cancelAiPreview();
  plan.value = null;
  planRequest.value = null;
  errorMessage.value = '';
  scope.value = nextScope;
}

async function generatePlan(): Promise<void> {
  if (!store.screen || !store.currentPage || !canGenerate.value) {
    return;
  }
  cancelRequest();
  store.cancelAiPreview();
  plan.value = null;
  planRequest.value = null;
  errorMessage.value = '';
  lastAction.value = 'plan';
  const controller = new AbortController();
  const serial = ++requestSerial;
  requestController = controller;
  loading.value = true;
  stage.value = '正在整理修改范围…';
  const revision = store.editorRevision;
  const pageId = store.currentPageId;
  const request: AiEditorPlanRequest = {
    screenId: store.screen._id,
    pageId,
    scope: scope.value,
    componentIds: scopeComponents.value.map((component) => component.id),
    instruction: instruction.value.trim(),
    ...(referenceAsset.value ? { referenceAssetId: referenceAsset.value._id } : {}),
    editorRevision: revision,
    context: {
      pageBackground: {
        color: store.currentPage.background.color,
        opacity: store.currentPage.background.opacity,
      },
      components: scopeComponents.value.map(toEditorContext),
    },
  };
  try {
    stage.value = 'DeepSeek 正在生成修改方案…';
    const result = await createAiEditorPlan(request, controller.signal);
    if (serial !== requestSerial) {
      return;
    }
    const issues = validateAiEditorPlanResponse(result);
    if (issues.length) {
      throw new Error(`方案未通过前端校验：${issues[0].message}`);
    }
    plan.value = result;
    planRequest.value = request;
    if (result.editorRevision !== store.editorRevision || pageId !== store.currentPageId) {
      errorMessage.value = '画布已变化，请重新生成';
    }
  } catch (error) {
    if (serial === requestSerial && !isCanceled(error)) {
      errorMessage.value = getErrorMessage(error);
    }
  } finally {
    if (serial === requestSerial && requestController === controller) {
      requestController = null;
      loading.value = false;
      stage.value = '';
    }
  }
}

function previewPlan(): void {
  if (!plan.value || !planRequest.value) {
    return;
  }
  const error = store.previewAiPlan(plan.value, planRequest.value);
  if (error) {
    errorMessage.value = error;
  }
}

function applyPlan(): void {
  if (!plan.value || !planRequest.value) {
    return;
  }
  const error = store.applyAiPlan(plan.value, planRequest.value);
  if (error) {
    errorMessage.value = error;
    return;
  }
  plan.value = null;
  planRequest.value = null;
  errorMessage.value = '';
  ElMessage.success('已应用，可撤销');
}

function cancelPreview(): void {
  store.cancelAiPreview();
}

async function generateCustomComponent(kind: 'chart' | 'border'): Promise<void> {
  if (!store.screen || !store.currentPage || !instruction.value.trim()) {
    return;
  }
  cancelRequest();
  store.cancelAiPreview();
  errorMessage.value = '';
  generatedFeedback.value = null;
  lastAction.value = kind;
  const controller = new AbortController();
  const serial = ++requestSerial;
  requestController = controller;
  loading.value = true;
  stage.value = kind === 'chart'
    ? 'DeepSeek 正在生成安全图表…'
    : 'DeepSeek 正在生成参数化边框…';
  const revision = store.editorRevision;
  try {
    const result = await generateAiComponent({
      screenId: store.screen._id,
      pageId: store.currentPageId,
      instruction: instruction.value.trim(),
      kind,
      ...(referenceAsset.value ? { referenceAssetId: referenceAsset.value._id } : {}),
      editorRevision: revision,
    }, controller.signal);
    if (serial !== requestSerial) {
      return;
    }
    assertGeneratedComponent(result, revision, kind);
    if (kind === 'chart' && result.definitionSnapshot.styleMode === 'locked') {
      await ElMessageBox.confirm(
        '现有可编辑字段无法完整表达该视觉结构。是否添加为锁定样式图表？数据绑定和交互事件仍可编辑。',
        '确认生成锁定样式图表',
        { type: 'warning', confirmButtonText: '确认添加', cancelButtonText: '取消' },
      );
    }
    if (revision !== store.editorRevision || !store.currentPage) {
      throw new Error('画布已变化，请重新生成组件');
    }
    const size = result.definitionSnapshot.defaultSize;
    const canvas = store.screen.canvas;
    const offset = (store.currentPage.components.length % 6) * 24;
    const created = store.addComponent({
      templateId: `custom:${crypto.randomUUID()}`,
      name: result.name,
      x: Math.max(0, Math.round((canvas.width - size.w) / 2 + offset)),
      y: Math.max(0, Math.round((canvas.height - size.h) / 2 + offset)),
      w: size.w,
      h: size.h,
      locked: false,
      hidden: false,
      groupId: store.inGroupId,
      theme: result.theme,
      style: { ...result.style },
      data: result.defaultData === undefined ? undefined : { source: 'static', staticData: result.defaultData },
      events: [],
      definitionSnapshot: result.definitionSnapshot,
    });
    plan.value = null;
    planRequest.value = null;
    generatedFeedback.value = {
      name: result.name,
      fidelity: result.fidelity,
      warnings: [...result.warnings],
      unsupportedFeatures: result.unsupportedFeatures.map((item) => ({ ...item })),
    };
    ElMessage.success(`已添加${result.fidelity === 'exact' ? '精确还原' : '近似还原'} AI ${kind === 'chart' ? '图表' : '边框'}「${created.name}」`);
  } catch (error) {
    if (serial === requestSerial && !isCanceled(error) && error !== 'cancel') {
      const action = error as string;
      if (action !== 'cancel' && action !== 'close') {
        errorMessage.value = getErrorMessage(error);
      }
    }
  } finally {
    if (serial === requestSerial && requestController === controller) {
      requestController = null;
      loading.value = false;
      stage.value = '';
    }
  }
}

async function testScreenAnalysis(): Promise<void> {
  if (!referenceAsset.value || !visionEnabled.value) {
    return;
  }
  cancelRequest();
  store.cancelAiPreview();
  errorMessage.value = '';
  generatedFeedback.value = null;
  plan.value = null;
  planRequest.value = null;
  screenAnalysis.value = null;
  clearStructureDraft();
  lastAction.value = 'screenTest';
  const controller = new AbortController();
  const serial = ++requestSerial;
  requestController = controller;
  loading.value = true;
  stage.value = 'DeepSeek 正在拆分整屏截图…';
  try {
    const result = await analyzeAiScreen(
      { referenceAssetId: referenceAsset.value._id },
      controller.signal,
    );
    if (serial !== requestSerial) {
      return;
    }
    screenAnalysis.value = result;
    const draft = buildAiScreenStructureDraft(result.parsedContent);
    if (draft) {
      structureDraft.value = draft;
      activeDraftComponentId.value = draft.components[0]?.id ?? '';
    }
    if (result.validationIssues.length) {
      ElMessage.warning(`模型已返回结果，但发现 ${result.validationIssues.length} 个契约问题`);
    } else if (!draft) {
      ElMessage.warning('模型结果无法转换为结构草稿，请查看原始 JSON');
    } else {
      ElMessage.success('整屏识别结果通过基础契约检查');
    }
  } catch (error) {
    if (serial === requestSerial && !isCanceled(error)) {
      errorMessage.value = getErrorMessage(error);
    }
  } finally {
    if (serial === requestSerial && requestController === controller) {
      requestController = null;
      loading.value = false;
      stage.value = '';
    }
  }
}

async function copyScreenAnalysis(): Promise<void> {
  if (!screenAnalysis.value?.rawContent) {
    return;
  }
  try {
    await navigator.clipboard.writeText(screenAnalysis.value.rawContent);
    ElMessage.success('模型原始 JSON 已复制');
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

function clearStructureDraft(): void {
  structureDraft.value = null;
  activeDraftComponentId.value = '';
  structureConfirmed.value = false;
}

function selectDraftComponent(component: AiScreenDraftComponent): void {
  activeDraftComponentId.value = component.id;
}

function draftBoundsStyle(bounds: AiScreenBounds): Record<string, string> {
  const canvas = structureDraft.value?.canvas;
  if (!canvas) {
    return {};
  }
  return {
    left: `${bounds.x / canvas.width * 100}%`,
    top: `${bounds.y / canvas.height * 100}%`,
    width: `${bounds.w / canvas.width * 100}%`,
    height: `${bounds.h / canvas.height * 100}%`,
  };
}

function draftBoxStyle(component: AiScreenDraftComponent): Record<string, string> {
  return draftBoundsStyle(component.bounds);
}

function normalizeDraftBounds(component: AiScreenDraftComponent): void {
  const canvas = structureDraft.value?.canvas;
  if (!canvas) {
    return;
  }
  const x = clampInteger(Number(component.bounds.x), 0, canvas.width - 1);
  const y = clampInteger(Number(component.bounds.y), 0, canvas.height - 1);
  component.bounds.x = x;
  component.bounds.y = y;
  component.bounds.w = clampInteger(Number(component.bounds.w), 1, canvas.width - x);
  component.bounds.h = clampInteger(Number(component.bounds.h), 1, canvas.height - y);
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

function confirmStructureDraft(): void {
  if (!structureDraft.value || structureDraftIssues.value.length) {
    return;
  }
  structureConfirmed.value = true;
  ElMessage.success(`已确认 ${includedDraftCount.value} 个结构组件`);
}

function retryLastAction(): void {
  if (lastAction.value === 'screenTest') {
    void testScreenAnalysis();
    return;
  }
  if (lastAction.value === 'plan') {
    void generatePlan();
    return;
  }
  void generateCustomComponent(lastAction.value);
}

function assertGeneratedComponent(
  result: AiGeneratedComponent,
  revision: number,
  kind: 'chart' | 'border',
): void {
  const issues = validateComponentDefinitionSnapshot(result.definitionSnapshot);
  if (issues.length) {
    throw new Error(`组件定义未通过前端校验：${issues[0].message}`);
  }
  if (result.editorRevision !== revision) {
    throw new Error('画布已变化，请重新生成组件');
  }
  const expectedRenderers = kind === 'chart'
    ? ['echarts-safe-v1']
    : ['border-parametric-v1', 'border-nine-slice-v1'];
  if (!expectedRenderers.includes(result.definitionSnapshot.rendererKey)) {
    throw new Error('组件类型与本次生成请求不一致');
  }
  if (result.fidelity !== 'exact' && result.fidelity !== 'approximate') {
    throw new Error('组件还原等级不合法');
  }
  if (!Array.isArray(result.warnings) || !Array.isArray(result.unsupportedFeatures)) {
    throw new Error('组件还原说明不合法');
  }
  if (!isProtocolValid(result.definitionSnapshot.dataProtocol, result.defaultData)) {
    throw new Error('组件模拟数据不符合声明协议');
  }
}

function formatSkippedTarget(targetId: string): string {
  const component = store.screen?.pages.flatMap((page) => page.components).find((item) => item.id === targetId);
  const page = store.screen?.pages.find((item) => item.id === targetId);
  return component?.name || page?.name || targetId;
}

function formatHandling(handling: AiEditorPlanResponse['unsupportedFeatures'][number]['handling']): string {
  return {
    approximate: '近似还原',
    customComponent: '可改用自定义组件',
    lockedStyleChart: '需重新生成锁定样式图表',
    unsupported: '暂不支持',
  }[handling];
}

function toEditorContext(component: ComponentDoc) {
  return {
    id: component.id,
    templateId: component.templateId,
    name: component.name,
    theme: component.theme,
    locked: component.locked,
    hidden: component.hidden,
    style: { ...component.style },
    ...(component.definitionSnapshot ? { definitionSnapshot: component.definitionSnapshot } : {}),
  };
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join('、');
  }
  if (typeof value === 'boolean') {
    return value ? '开启' : '关闭';
  }
  if (value === undefined) {
    return '默认值';
  }
  return String(value);
}

function isColor(value: string): boolean {
  return value === 'transparent'
    || /^#[0-9a-f]{3,8}$/i.test(value)
    || /^(?:rgb|rgba|hsl|hsla)\(/i.test(value);
}

function isCanceled(error: unknown): boolean {
  const candidate = error as { name?: string; code?: string };
  return candidate.name === 'CanceledError' || candidate.name === 'AbortError' || candidate.code === 'ERR_CANCELED';
}

function getErrorMessage(error: unknown): string {
  const candidate = error as {
    message?: string;
    response?: { data?: { message?: string } };
  };
  return candidate.response?.data?.message || candidate.message || '生成失败，请重试';
}

onUnmounted(() => {
  cancelRequest();
  store.cancelAiPreview();
  void removeReference(true);
});

watch(() => store.currentPageId, () => {
  if (!open.value) {
    return;
  }
  const hadRequestOrPlan = loading.value || Boolean(plan.value);
  cancelRequest();
  store.cancelAiPreview();
  if (hadRequestOrPlan) {
    errorMessage.value = '页面已切换，请重新生成修改方案';
  }
});

watch(() => store.editorRevision, () => {
  if (!open.value || !loading.value) {
    return;
  }
  cancelRequest();
  errorMessage.value = '画布已变化，请重新生成修改方案';
});

watch(structureDraft, () => {
  structureConfirmed.value = false;
}, { deep: true });
</script>

<template>
  <button v-if="!open" class="ai-fab" type="button" title="AI 智能设计助手" @click="showPanel">
    <WandSparkles :size="22" />
  </button>

  <aside v-else class="ai-panel" aria-label="AI 智能设计助手">
    <header class="ai-head">
      <div><Sparkles :size="18" /><strong>AI 智能设计助手</strong></div>
      <button class="ai-icon" type="button" title="关闭" @click="closePanel"><X :size="17" /></button>
    </header>

    <div class="ai-body">
      <section class="ai-section">
        <h4>作用范围</h4>
        <div class="ai-scope">
          <button :class="{ active: scope === 'selected' }" type="button" @click="changeScope('selected')">选中组件</button>
          <button :class="{ active: scope === 'page' }" type="button" @click="changeScope('page')">当前页面</button>
          <button
            :class="{ active: scope === 'screen' }"
            type="button"
            :disabled="!screenScopeEnabled"
            :title="screenScopeEnabled ? '整张大屏' : '性能开关未启用'"
            @click="changeScope('screen')"
          >整张大屏</button>
        </div>
        <p class="ai-tip">当前页最多 {{ AI_PAGE_COMPONENT_LIMIT }} 个组件；整屏最多 {{ AI_SCREEN_COMPONENT_LIMIT }} 个。</p>
        <p v-if="!screenScopeEnabled" class="ai-tip">整屏性能开关当前未启用。</p>
      </section>

      <section class="ai-section">
        <h4>上下文摘要</h4>
        <div class="ai-summary-strip">
          <span>目标 <b>{{ scopeComponents.length }}</b></span>
          <span>锁定 <b>{{ lockedCount }}</b></span>
          <span>隐藏 <b>{{ hiddenCount }}</b></span>
        </div>
        <p v-if="componentTypes.length" class="ai-types">{{ componentTypes.join('、') }}</p>
        <p v-else-if="scope === 'selected'" class="ai-empty">请先在画布中选中图表或指标卡。</p>
        <p v-else class="ai-types">当前范围没有组件，仍可修改页面背景。</p>
        <p class="ai-tip">锁定组件始终跳过；隐藏组件默认跳过。</p>
        <p v-if="scopeLimitError" class="ai-limit">{{ scopeLimitError }}</p>
      </section>

      <section class="ai-section">
        <h4>样式指令</h4>
        <el-input
          v-model="instruction"
          type="textarea"
          :rows="4"
          maxlength="2000"
          show-word-limit
          resize="none"
          placeholder="例如：隐藏图例，线宽改为 4，使用蓝青配色"
          :disabled="loading"
        />
        <div class="ai-reference-head">
          <span>参考图（可选）</span>
          <small>图片将发送至管理员配置的 DeepSeek 服务</small>
        </div>
        <input
          ref="referenceInput"
          class="ai-reference-input"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          @change="handleReferenceInput"
        />
        <div v-if="referenceAsset" class="ai-reference-preview">
          <img :src="referencePreviewUrl" alt="AI 样式参考图预览" />
          <div>
            <b>{{ referenceAsset.width }} × {{ referenceAsset.height }}</b>
            <span>{{ referenceAsset.mimeType.replace('image/', '').toUpperCase() }} · {{ (referenceAsset.size / 1024 / 1024).toFixed(2) }}MB</span>
            <small>到期自动清理</small>
          </div>
          <button type="button" title="删除参考图" :disabled="referenceBusy" @click="removeReference()">
            <Trash2 :size="16" />
          </button>
        </div>
        <button
          v-else
          class="ai-reference-drop"
          :class="{ dragging: referenceDragging }"
          type="button"
          :disabled="!visionEnabled || capabilitiesLoading || referenceBusy"
          @click="selectReferenceFile"
          @dragenter.prevent="referenceDragging = true"
          @dragover.prevent="referenceDragging = true"
          @dragleave.prevent="referenceDragging = false"
          @drop.prevent="handleReferenceDrop"
        >
          <ImagePlus :size="20" />
          <span>{{ referenceBusy ? '正在上传…' : '点击或拖入 PNG / JPEG / WebP' }}</span>
          <small>不超过 10MB，单边不超过 8192px</small>
        </button>
        <p v-if="!capabilitiesLoading && !visionEnabled" class="ai-reference-unavailable">
          {{ visionUnavailableReason }}，仍可使用文本样式编辑。
        </p>
        <button class="btn btn-pri ai-generate" type="button" :disabled="!canGenerate" @click="generatePlan">
          <Send :size="14" />{{ loading ? stage : '生成修改方案' }}
        </button>
        <button class="btn btn-ghost ai-generate ai-custom-generate" type="button" :disabled="!instruction.trim() || loading" @click="generateCustomComponent('chart')">
          <Sparkles :size="14" />生成自定义图表
        </button>
        <button class="btn btn-ghost ai-generate ai-custom-generate" type="button" :disabled="!instruction.trim() || loading" @click="generateCustomComponent('border')">
          <Frame :size="14" />生成参数化边框
        </button>
        <button
          class="btn btn-ghost ai-generate ai-screen-test"
          type="button"
          :disabled="!referenceAsset || !visionEnabled || loading"
          @click="testScreenAnalysis"
        >
          <ImagePlus :size="14" />{{ loading && lastAction === 'screenTest' ? stage : '测试整屏截图识别' }}
        </button>
        <p class="ai-tip">能力测试只返回模型 JSON，不会新增页面或修改画布。</p>
        <button v-if="loading" class="btn btn-ghost ai-cancel-request" type="button" @click="cancelRequest">取消请求</button>
      </section>

      <section v-if="errorMessage" class="ai-error">
        <AlertTriangle :size="16" />
        <span>{{ errorMessage }}</span>
        <button
          v-if="!loading && (lastAction === 'screenTest' ? referenceAsset : instruction.trim())"
          type="button"
          @click="retryLastAction"
        >重试</button>
      </section>

      <section v-if="screenAnalysis" class="ai-screen-analysis">
        <div class="ai-screen-analysis-head">
          <div>
            <strong>整屏识别原始 JSON</strong>
            <small>{{ screenAnalysis.model }} · 模型原文，结构草稿会按坐标重新排序</small>
          </div>
          <em :class="screenAnalysis.validationIssues.length ? 'invalid' : 'valid'">
            {{ screenAnalysis.validationIssues.length ? `${screenAnalysis.validationIssues.length} 个契约问题` : '基础校验通过' }}
          </em>
        </div>
        <pre>{{ screenAnalysis.rawContent }}</pre>
        <div v-if="screenAnalysis.validationIssues.length" class="ai-note warning">
          <b>契约问题</b>
          <p v-for="item in screenAnalysis.validationIssues" :key="item.path + item.message">
            <code>{{ item.path }}</code>：{{ item.message }}
          </p>
        </div>
        <button class="btn btn-pri ai-copy-json" type="button" @click="copyScreenAnalysis">复制原始 JSON</button>
      </section>

      <section v-if="structureDraft" class="ai-structure-draft">
        <div class="ai-structure-head">
          <div>
            <strong>整屏结构草稿</strong>
            <small>{{ includedDraftCount }} / {{ structureDraft.components.length }} 个组件参与确认</small>
          </div>
          <em :class="structureConfirmed ? 'confirmed' : 'pending'">
            {{ structureConfirmed ? '已确认' : '待检查' }}
          </em>
        </div>

        <div
          class="ai-structure-canvas"
          :style="{ aspectRatio: `${structureDraft.canvas.width} / ${structureDraft.canvas.height}` }"
        >
          <img :src="referencePreviewUrl" alt="整屏结构草稿参考图" />
          <div
            v-if="structureDraft.canvas.backgroundLayer"
            class="ai-structure-background"
            :style="draftBoundsStyle(structureDraft.canvas.backgroundLayer.bounds)"
            :title="structureDraft.canvas.backgroundLayer.description"
          >
            <span>背景层</span>
          </div>
          <button
            v-for="component in structureDraft.components"
            :key="component.id"
            class="ai-structure-box"
            :class="{
              active: activeDraftComponentId === component.id,
              excluded: !component.included,
            }"
            :style="draftBoxStyle(component)"
            type="button"
            :title="`${component.order}. ${component.name}`"
            @click="selectDraftComponent(component)"
          >
            <span>{{ component.order }}</span>
          </button>
        </div>

        <p class="ai-tip">边界框使用原图 {{ structureDraft.canvas.width }}×{{ structureDraft.canvas.height }} 坐标；点击框或列表可定位组件。</p>
        <div v-if="structureDraft.canvas.backgroundLayer" class="ai-background-summary">
          <strong>{{ backgroundLayerLabels[structureDraft.canvas.backgroundLayer.kind] }}</strong>
          <span>{{ structureDraft.canvas.backgroundLayer.description }}</span>
          <small>
            x={{ structureDraft.canvas.backgroundLayer.bounds.x }},
            y={{ structureDraft.canvas.backgroundLayer.bounds.y }},
            w={{ structureDraft.canvas.backgroundLayer.bounds.w }},
            h={{ structureDraft.canvas.backgroundLayer.bounds.h }} ·
            {{ Math.round(structureDraft.canvas.backgroundLayer.confidence * 100) }}%
          </small>
          <p v-if="structureDraft.canvas.backgroundLayer.notes">{{ structureDraft.canvas.backgroundLayer.notes }}</p>
        </div>

        <div class="ai-structure-list">
          <article
            v-for="component in structureDraft.components"
            :key="component.id"
            class="ai-structure-item"
            :class="{ active: activeDraftComponentId === component.id, excluded: !component.included }"
            @click="selectDraftComponent(component)"
          >
            <div class="ai-structure-item-head">
              <label @click.stop>
                <input v-model="component.included" type="checkbox" />
                <span>{{ component.order }}</span>
              </label>
              <input v-model.trim="component.name" class="ai-draft-name" maxlength="128" aria-label="组件名称" />
              <small>{{ Math.round(component.confidence * 100) }}%</small>
            </div>
            <select v-model="component.type" class="ai-draft-type" aria-label="组件类型" @click.stop>
              <option v-for="option in screenComponentTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <div class="ai-draft-bounds" @click.stop>
              <label v-for="field in draftBoundFields" :key="field">
                <span>{{ field }}</span>
                <input
                  v-model.number="component.bounds[field]"
                  type="number"
                  step="1"
                  @change="normalizeDraftBounds(component)"
                />
              </label>
            </div>
          </article>
        </div>

        <div v-if="structureDraftIssues.length" class="ai-note warning">
          <b>草稿待修正</b>
          <p v-for="item in structureDraftIssues" :key="item.path + item.message">{{ item.message }}</p>
        </div>
        <p v-if="unsupportedDraftCount" class="ai-draft-unsupported">
          {{ unsupportedDraftCount }} 个组件待人工匹配模板；本阶段允许保留。
        </p>
        <p
          v-if="includedDraftCount > AI_SCREEN_ANALYSIS_RECOMMENDED_COMPONENT_LIMIT"
          class="ai-draft-unsupported"
        >
          当前保留 {{ includedDraftCount }} 个组件，建议检查是否有可合并或误识别项；该提示不阻止确认。
        </p>
        <button
          class="btn btn-pri ai-confirm-structure"
          type="button"
          :disabled="Boolean(structureDraftIssues.length) || structureConfirmed"
          @click="confirmStructureDraft"
        >
          <Check :size="14" />{{ structureConfirmed ? '结构草稿已确认' : '确认结构草稿' }}
        </button>
        <p class="ai-tip">确认状态仅保存在当前面板，不会新增组件、修改画布或写入数据库。</p>
      </section>

      <section v-if="generatedFeedback" class="ai-generated-feedback">
        <div class="ai-plan-title">
          <Check :size="16" />
          <strong>{{ generatedFeedback.name }}</strong>
          <em :class="generatedFeedback.fidelity">
            {{ generatedFeedback.fidelity === 'exact' ? '精确还原' : '近似还原' }}
          </em>
        </div>
        <div v-if="generatedFeedback.unsupportedFeatures.length" class="ai-note unsupported">
          <b>不支持项</b>
          <p v-for="item in generatedFeedback.unsupportedFeatures" :key="item.description">
            <em>暂不支持</em>{{ item.description }}：{{ item.reason }}<template v-if="item.suggestion">；{{ item.suggestion }}</template>
          </p>
        </div>
        <div v-if="generatedFeedback.warnings.length" class="ai-note warning">
          <b>近似说明</b>
          <p v-for="item in generatedFeedback.warnings" :key="item">{{ item }}</p>
        </div>
      </section>

      <section v-if="plan" class="ai-plan" :class="{ stale }">
        <div class="ai-plan-title">
          <Check :size="16" />
          <strong>{{ plan.summary }}</strong>
        </div>
        <div class="ai-plan-meta">
          <span>{{ changedTargetCount }} 个对象</span>
          <span>{{ changes.length }} 个字段</span>
          <i v-for="color in mainColors" :key="color" :style="{ backgroundColor: color }" :title="color" />
        </div>
        <div v-if="stale" class="ai-stale">画布已变化，请重新生成</div>

        <details v-for="group in changeGroups" :key="group.key" open>
          <summary>{{ group.targetName }}</summary>
          <div
            v-for="row in group.rows"
            :key="row.targetKey + row.fieldKey"
            class="ai-diff"
          >
            <span>{{ row.fieldLabel }}</span>
            <code>{{ formatValue(row.before) }}</code>
            <b>→</b>
            <code>{{ formatValue(row.after) }}</code>
          </div>
        </details>

        <div v-if="plan.skipped.length" class="ai-note neutral">
          <b>跳过项</b>
          <p v-for="item in plan.skipped" :key="item.targetId + item.reason">{{ formatSkippedTarget(item.targetId) }}：{{ item.reason }}</p>
        </div>
        <div v-if="plan.unsupportedFeatures.length" class="ai-note unsupported">
          <b>不支持与近似项</b>
          <p v-for="item in plan.unsupportedFeatures" :key="item.description">
            <em>{{ formatHandling(item.handling) }}</em>
            {{ item.description }}：{{ item.reason }}<template v-if="item.suggestion">；{{ item.suggestion }}</template>
          </p>
        </div>
        <div v-if="plan.warnings.length" class="ai-note warning">
          <b>风险提示</b>
          <p v-for="item in plan.warnings" :key="item">{{ item }}</p>
        </div>

        <div class="ai-actions">
          <button class="btn btn-ghost" type="button" :disabled="!canApply" @click="previewPlan"><Eye :size="14" />预览</button>
          <button class="btn btn-pri" type="button" :disabled="!canApply" @click="applyPlan"><Check :size="14" />应用</button>
          <button class="btn btn-ghost" type="button" :disabled="loading" @click="generatePlan"><RotateCcw :size="14" />重新生成</button>
        </div>
      </section>
    </div>
  </aside>

  <div v-if="store.previewDraft" class="ai-preview-banner">
    <span>正在预览 AI 方案</span>
    <button class="btn btn-pri btn-sm" type="button" :disabled="!canApply" @click="applyPlan">应用</button>
    <button class="btn btn-ghost btn-sm" type="button" @click="cancelPreview">取消</button>
  </div>
</template>

<style scoped>
.ai-fab {
  position: fixed; right: 24px; bottom: 24px; z-index: 70; width: 52px; height: 52px;
  display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--pri);
  color: var(--t1); background: var(--pri); box-shadow: 0 10px 30px color-mix(in srgb, var(--pri) 38%, transparent);
}
.ai-panel {
  position: fixed; z-index: 80; top: 60px; right: 12px; width: min(440px, calc(100vw - 24px));
  max-height: min(760px, calc(100vh - 72px)); display: flex; flex-direction: column;
  border: 1px solid var(--border); border-radius: 10px; background: var(--panel);
  box-shadow: 0 18px 60px color-mix(in srgb, var(--bg) 75%, transparent); overflow: hidden;
}
.ai-head { height: 48px; padding: 0 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); }
.ai-head > div { display: flex; align-items: center; gap: 8px; color: var(--pri); }
.ai-head strong { color: var(--t1); font-size: 14px; }
.ai-icon { display: grid; place-items: center; width: 30px; height: 30px; border: 0; color: var(--t2); background: transparent; }
.ai-body { overflow: auto; padding: 12px; }
.ai-section { padding: 12px; margin-bottom: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel2); }
.ai-section h4 { margin: 0 0 10px; font-size: 12px; color: var(--t2); font-weight: 600; }
.ai-scope { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.ai-scope button { min-height: 32px; border: 0; border-right: 1px solid var(--border); color: var(--t2); background: transparent; font-size: 12px; }
.ai-scope button:last-child { border-right: 0; }
.ai-scope button.active { color: var(--t1); background: color-mix(in srgb, var(--pri) 22%, transparent); }
.ai-scope button:disabled { cursor: not-allowed; opacity: .45; }
.ai-tip, .ai-types, .ai-empty { margin: 8px 0 0; color: var(--t3); font-size: 11px; line-height: 1.5; }
.ai-empty { color: var(--warn); }
.ai-limit { margin: 8px 0 0; color: var(--err); font-size: 11px; line-height: 1.5; }
.ai-summary-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.ai-summary-strip span { padding: 7px; text-align: center; border-radius: 5px; background: color-mix(in srgb, var(--pri) 9%, transparent); color: var(--t2); font-size: 11px; }
.ai-summary-strip b { color: var(--t1); font-family: var(--font-num); }
.ai-reference-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; color: var(--t2); font-size: 12px; }
.ai-reference-head small { color: var(--warn); font-size: 10px; text-align: right; }
.ai-reference-input { display: none; }
.ai-reference-drop { width: 100%; min-height: 76px; margin-top: 7px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 1px dashed var(--border); border-radius: 6px; color: var(--t2); background: transparent; font-size: 11px; }
.ai-reference-drop.dragging { border-color: var(--pri); background: color-mix(in srgb, var(--pri) 9%, transparent); }
.ai-reference-drop:disabled { cursor: not-allowed; opacity: .48; }
.ai-reference-drop small { color: var(--t3); font-size: 10px; }
.ai-reference-preview { margin-top: 7px; display: grid; grid-template-columns: 72px 1fr 30px; align-items: center; gap: 9px; padding: 7px; border: 1px solid var(--border); border-radius: 6px; background: color-mix(in srgb, var(--pri) 6%, transparent); }
.ai-reference-preview img { width: 72px; height: 50px; object-fit: cover; border-radius: 4px; background: var(--bg); }
.ai-reference-preview > div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ai-reference-preview b { color: var(--t1); font: 600 11px var(--font-num); }
.ai-reference-preview span, .ai-reference-preview small { color: var(--t3); font-size: 10px; }
.ai-reference-preview button { display: grid; place-items: center; width: 28px; height: 28px; border: 0; color: var(--err); background: transparent; }
.ai-reference-unavailable { margin: 6px 0 0; color: var(--warn); font-size: 10px; line-height: 1.5; }
.ai-generate { width: 100%; margin-top: 10px; justify-content: center; }
.ai-cancel-request { width: 100%; margin-top: 6px; justify-content: center; }
.ai-screen-test { border-color: color-mix(in srgb, var(--ok) 45%, var(--border)); color: var(--ok); }
.ai-error { display: flex; align-items: flex-start; gap: 7px; padding: 10px; margin-bottom: 10px; border: 1px solid color-mix(in srgb, var(--err) 42%, var(--border)); border-radius: 7px; color: var(--err); font-size: 12px; }
.ai-error span { flex: 1; line-height: 1.5; }
.ai-error button { border: 0; background: transparent; color: inherit; text-decoration: underline; }
.ai-generated-feedback { padding: 12px; margin-bottom: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel2); }
.ai-generated-feedback .ai-plan-title { align-items: center; }
.ai-generated-feedback .ai-plan-title strong { flex: 1; }
.ai-generated-feedback .ai-plan-title > em { padding: 2px 6px; border: 1px solid currentColor; border-radius: 4px; font-size: 10px; font-style: normal; }
.ai-generated-feedback .ai-plan-title > em.exact { color: var(--ok); }
.ai-generated-feedback .ai-plan-title > em.approximate { color: var(--warn); }
.ai-screen-analysis { padding: 12px; margin-bottom: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel2); }
.ai-screen-analysis-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.ai-screen-analysis-head > div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ai-screen-analysis-head strong { color: var(--t1); font-size: 13px; }
.ai-screen-analysis-head small { overflow: hidden; color: var(--t3); font: 10px var(--font-num); text-overflow: ellipsis; white-space: nowrap; }
.ai-screen-analysis-head em { flex: none; padding: 2px 6px; border: 1px solid currentColor; border-radius: 4px; font-size: 10px; font-style: normal; }
.ai-screen-analysis-head em.valid { color: var(--ok); }
.ai-screen-analysis-head em.invalid { color: var(--warn); }
.ai-screen-analysis pre { max-height: 320px; margin: 10px 0 0; padding: 9px; overflow: auto; border: 1px solid var(--border); border-radius: 5px; color: var(--t2); background: var(--bg); font: 10px/1.55 var(--font-num); white-space: pre-wrap; word-break: break-all; }
.ai-copy-json { width: 100%; margin-top: 10px; justify-content: center; }
.ai-structure-draft { padding: 12px; margin-bottom: 10px; border: 1px solid color-mix(in srgb, var(--pri) 42%, var(--border)); border-radius: 8px; background: var(--panel2); }
.ai-structure-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.ai-structure-head > div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ai-structure-head strong { color: var(--t1); font-size: 13px; }
.ai-structure-head small { color: var(--t3); font-size: 10px; }
.ai-structure-head em { flex: none; padding: 2px 6px; border: 1px solid currentColor; border-radius: 4px; font-size: 10px; font-style: normal; }
.ai-structure-head em.pending { color: var(--warn); }
.ai-structure-head em.confirmed { color: var(--ok); }
.ai-structure-canvas { position: relative; width: 100%; margin-top: 10px; overflow: hidden; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); }
.ai-structure-canvas > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
.ai-structure-background { position: absolute; pointer-events: none; border: 1px dashed var(--warn); background: color-mix(in srgb, var(--warn) 6%, transparent); }
.ai-structure-background > span { position: absolute; right: 2px; top: 2px; padding: 0 3px; border-radius: 2px; color: var(--bg); background: var(--warn); font: 9px/14px var(--font-num); }
.ai-structure-box { position: absolute; min-width: 0; min-height: 0; padding: 0; border: 1px solid var(--pri); color: var(--t1); background: color-mix(in srgb, var(--pri) 15%, transparent); }
.ai-structure-box:hover, .ai-structure-box.active { z-index: 2; border-width: 2px; border-color: var(--ok); background: color-mix(in srgb, var(--ok) 18%, transparent); }
.ai-structure-box.excluded { border-style: dashed; border-color: var(--t3); background: color-mix(in srgb, var(--t3) 10%, transparent); opacity: .55; }
.ai-structure-box > span { position: absolute; top: 1px; left: 1px; min-width: 14px; padding: 0 3px; border-radius: 2px; color: var(--bg); background: var(--pri); font: 9px/14px var(--font-num); }
.ai-background-summary { display: grid; gap: 3px; margin-top: 8px; padding: 8px; border: 1px dashed color-mix(in srgb, var(--warn) 65%, var(--border)); border-radius: 6px; background: color-mix(in srgb, var(--warn) 7%, transparent); }
.ai-background-summary strong { color: var(--warn); font-size: 11px; }
.ai-background-summary span { color: var(--t1); font-size: 11px; }
.ai-background-summary small, .ai-background-summary p { margin: 0; color: var(--t3); font: 10px/1.5 var(--font-num); }
.ai-structure-list { max-height: 420px; margin-top: 10px; overflow: auto; display: flex; flex-direction: column; gap: 7px; }
.ai-structure-item { padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--panel); }
.ai-structure-item.active { border-color: var(--pri); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pri) 45%, transparent); }
.ai-structure-item.excluded { opacity: .55; }
.ai-structure-item-head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 7px; }
.ai-structure-item-head > label { display: flex; align-items: center; gap: 4px; color: var(--pri); font: 600 11px var(--font-num); }
.ai-structure-item-head small { color: var(--t3); font: 10px var(--font-num); }
.ai-draft-name, .ai-draft-type, .ai-draft-bounds input { width: 100%; min-width: 0; height: 28px; border: 1px solid var(--border); border-radius: 4px; outline: none; color: var(--t1); background: var(--bg); font-size: 11px; }
.ai-draft-name { height: 26px; padding: 0 6px; }
.ai-draft-type { margin-top: 7px; padding: 0 5px; }
.ai-draft-name:focus, .ai-draft-type:focus, .ai-draft-bounds input:focus { border-color: var(--pri); }
.ai-draft-bounds { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; margin-top: 7px; }
.ai-draft-bounds label { min-width: 0; display: grid; grid-template-columns: 12px minmax(0, 1fr); align-items: center; gap: 2px; color: var(--t3); font: 9px var(--font-num); }
.ai-draft-bounds input { height: 24px; padding: 0 3px; font-family: var(--font-num); }
.ai-draft-unsupported { margin: 8px 0 0; color: var(--warn); font-size: 11px; line-height: 1.5; }
.ai-confirm-structure { width: 100%; margin-top: 10px; justify-content: center; }
.ai-plan { padding: 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel2); }
.ai-plan.stale > :not(.ai-stale, .ai-actions) { opacity: .45; }
.ai-plan-title { display: flex; align-items: flex-start; gap: 7px; color: var(--ok); }
.ai-plan-title strong { color: var(--t1); font-size: 13px; line-height: 1.5; }
.ai-plan-meta { display: flex; align-items: center; gap: 7px; margin: 9px 0; color: var(--t3); font-size: 11px; }
.ai-plan-meta i { width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--border); }
.ai-stale { padding: 8px; margin-bottom: 8px; border-radius: 5px; color: var(--warn); background: color-mix(in srgb, var(--warn) 10%, transparent); font-size: 12px; }
details { margin-top: 7px; border-top: 1px solid var(--border); padding-top: 7px; }
summary { cursor: pointer; color: var(--t1); font-size: 12px; }
.ai-diff { display: grid; grid-template-columns: 82px 1fr 14px 1fr; align-items: center; gap: 6px; padding: 6px 0; color: var(--t3); font-size: 11px; }
.ai-diff code { overflow: hidden; text-overflow: ellipsis; color: var(--t2); font-family: var(--font-num); white-space: nowrap; }
.ai-diff b { color: var(--pri); }
.ai-note { margin-top: 8px; padding: 8px; border-radius: 5px; font-size: 11px; line-height: 1.5; }
.ai-note b { font-size: 11px; }
.ai-note p { margin: 3px 0 0; }
.ai-note em { display: inline-block; margin-right: 4px; padding: 0 4px; border: 1px solid currentColor; border-radius: 3px; font-style: normal; }
.ai-note.neutral { color: var(--t2); background: color-mix(in srgb, var(--t2) 8%, transparent); }
.ai-note.warning { color: var(--warn); background: color-mix(in srgb, var(--warn) 9%, transparent); }
.ai-note.unsupported { color: var(--err); background: color-mix(in srgb, var(--err) 8%, transparent); }
.ai-actions { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
.ai-actions .btn { flex: 1; justify-content: center; }
.ai-preview-banner {
  position: fixed; z-index: 75; top: 58px; left: 50%; transform: translateX(-50%); display: flex;
  align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid var(--pri); border-radius: 7px;
  color: var(--t1); background: var(--panel); box-shadow: 0 8px 24px color-mix(in srgb, var(--bg) 65%, transparent); font-size: 12px;
}
</style>
