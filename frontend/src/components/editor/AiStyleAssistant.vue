<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import {
  AI_PAGE_COMPONENT_LIMIT,
  AI_SCREEN_COMPONENT_LIMIT,
  getBuiltinComponentMetadata,
  validateAiEditorPlanResponse,
  type AiEditorPlanRequest,
  type AiEditorPlanResponse,
  type ComponentDoc,
  type StyleValue,
} from '@screencraft/shared';
import { AlertTriangle, Check, Eye, RotateCcw, Send, Sparkles, WandSparkles, X } from 'lucide-vue-next';
import { ElMessage } from 'element-plus';
import { createAiEditorPlan } from '../../api/ai';
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

const store = useScreenStore();
const screenScopeEnabled = import.meta.env.VITE_AI_SCREEN_SCOPE_ENABLED === 'true';
const open = ref(false);
const scope = ref<EditorScope>('selected');
const instruction = ref('');
const loading = ref(false);
const stage = ref('');
const errorMessage = ref('');
const plan = ref<AiEditorPlanResponse | null>(null);
const planRequest = ref<AiEditorPlanRequest | null>(null);
let requestController: AbortController | null = null;
let requestSerial = 0;

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

function showPanel(): void {
  open.value = true;
}

function closePanel(): void {
  cancelRequest();
  store.cancelAiPreview();
  plan.value = null;
  planRequest.value = null;
  errorMessage.value = '';
  open.value = false;
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
        <div class="ai-reference-disabled">参考图风格迁移将在 M9.3 开放</div>
        <button class="btn btn-pri ai-generate" type="button" :disabled="!canGenerate" @click="generatePlan">
          <Send :size="14" />{{ loading ? stage : '生成修改方案' }}
        </button>
        <button v-if="loading" class="btn btn-ghost ai-cancel-request" type="button" @click="cancelRequest">取消请求</button>
      </section>

      <section v-if="errorMessage" class="ai-error">
        <AlertTriangle :size="16" />
        <span>{{ errorMessage }}</span>
        <button v-if="!loading && instruction.trim()" type="button" @click="generatePlan">重试</button>
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
.ai-reference-disabled { margin-top: 10px; padding: 8px; border: 1px dashed var(--border); border-radius: 6px; color: var(--t3); font-size: 11px; text-align: center; }
.ai-generate { width: 100%; margin-top: 10px; justify-content: center; }
.ai-cancel-request { width: 100%; margin-top: 6px; justify-content: center; }
.ai-error { display: flex; align-items: flex-start; gap: 7px; padding: 10px; margin-bottom: 10px; border: 1px solid color-mix(in srgb, var(--err) 42%, var(--border)); border-radius: 7px; color: var(--err); font-size: 12px; }
.ai-error span { flex: 1; line-height: 1.5; }
.ai-error button { border: 0; background: transparent; color: inherit; text-decoration: underline; }
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
