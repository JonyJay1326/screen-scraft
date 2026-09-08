import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  getBuiltinComponentMetadata,
  validateAiEditorPlanResponse,
  validateAiStylePatch,
  type AiEditorPlanResponse,
  type ComponentDoc,
  type FitMode,
  type PageDoc,
  type ScreenDoc,
} from '@screencraft/shared';
import { fetchScreen, saveScreenApi } from '../api/screen';
import { cloneJson } from '../utils/clone';

const MAX_HISTORY = 50;

/** 深拷贝大屏快照 */
function cloneScreen(doc: ScreenDoc): ScreenDoc {
  return cloneJson(doc);
}

/** 生成短 id */
function uid(): string {
  return crypto.randomUUID();
}

/** 编辑器状态 */
export const useScreenStore = defineStore('screen', () => {
  const screen = ref<ScreenDoc | null>(null);
  const currentPageId = ref('');
  const selectedIds = ref<string[]>([]);
  const inGroupId = ref<string | null>(null);
  const clipboard = ref<ComponentDoc[]>([]);
  const past = ref<ScreenDoc[]>([]);
  const future = ref<ScreenDoc[]>([]);
  const dirty = ref(false);
  const editorRevision = ref(0);
  const previewDraft = ref<ScreenDoc | null>(null);
  const zoom = ref(50);
  const showGrid = ref(true);
  /** 拖拽吸附辅助线（仅编辑态临时显示） */
  const alignGuides = ref<{ orient: 'v' | 'h'; pos: number }[]>([]);
  const saving = ref(false);

  const currentPage = computed(() => screen.value?.pages.find((page) => page.id === currentPageId.value) ?? null);
  const previewPage = computed(() => previewDraft.value?.pages.find((page) => page.id === currentPageId.value) ?? null);
  const canUndo = computed(() => past.value.length > 0);
  const canRedo = computed(() => future.value.length > 0);

  /** 当前页可见组件（组内模式仅组内） */
  const visibleComponents = computed(() => {
    const page = previewPage.value ?? currentPage.value;
    if (!page) {
      return [];
    }
    if (inGroupId.value) {
      return page.components.filter((item) => item.groupId === inGroupId.value);
    }
    return page.components;
  });

  /** 压入历史 */
  function pushHistory(): void {
    if (!screen.value) {
      return;
    }
    past.value = [...past.value, cloneScreen(screen.value)].slice(-MAX_HISTORY);
    future.value = [];
    dirty.value = true;
    editorRevision.value += 1;
    previewDraft.value = null;
  }

  /** 加载大屏 */
  async function load(id: string): Promise<void> {
    screen.value = await fetchScreen(id);
    currentPageId.value = screen.value.pages[0]?.id ?? '';
    selectedIds.value = [];
    inGroupId.value = null;
    past.value = [];
    future.value = [];
    dirty.value = false;
    editorRevision.value = 0;
    previewDraft.value = null;
  }

  /** 保存（可附带缩略图 data URL） */
  async function save(thumbnail?: string): Promise<void> {
    if (!screen.value) {
      return;
    }
    saving.value = true;
    try {
      const saved = await saveScreenApi(screen.value._id, {
        updatedAt: screen.value.updatedAt,
        name: screen.value.name,
        category: screen.value.category,
        fitMode: screen.value.fitMode,
        pages: screen.value.pages,
        thumbnail,
      });
      screen.value = saved;
      dirty.value = false;
    } finally {
      saving.value = false;
    }
  }

  /** 撤销 */
  function undo(): void {
    const prev = past.value.at(-1);
    if (!prev || !screen.value) {
      return;
    }
    future.value = [cloneScreen(screen.value), ...future.value];
    past.value = past.value.slice(0, -1);
    screen.value = prev;
    dirty.value = true;
    editorRevision.value += 1;
    previewDraft.value = null;
  }

  /** 重做 */
  function redo(): void {
    const next = future.value[0];
    if (!next || !screen.value) {
      return;
    }
    past.value = [...past.value, cloneScreen(screen.value)];
    future.value = future.value.slice(1);
    screen.value = next;
    dirty.value = true;
    editorRevision.value += 1;
    previewDraft.value = null;
  }

  /** 当前页组件列表引用更新 */
  function mutatePage(mutator: (page: PageDoc) => void, record = true): void {
    if (!screen.value || !currentPage.value) {
      return;
    }
    if (record) {
      pushHistory();
    }
    const pages = screen.value.pages.map((page) => {
      if (page.id !== currentPageId.value) {
        return page;
      }
      const next = cloneJson(page);
      mutator(next);
      return next;
    });
    screen.value = { ...screen.value, pages };
    dirty.value = true;
  }

  /** 添加组件 */
  function addComponent(partial: Omit<ComponentDoc, 'id' | 'zIndex' | 'events'> & { events?: ComponentDoc['events'] }): ComponentDoc {
    const created: ComponentDoc = {
      ...partial,
      id: uid(),
      zIndex: (currentPage.value?.components.length ?? 0) + 1,
      groupId: partial.groupId ?? inGroupId.value,
      events: partial.events ?? [],
    };
    mutatePage((page) => {
      page.components.push(created);
    });
    selectedIds.value = [created.id];
    return created;
  }

  /** 更新几何（拖拽结束记一次） */
  function updateGeometry(id: string, geom: Partial<Pick<ComponentDoc, 'x' | 'y' | 'w' | 'h'>>, record: boolean): void {
    mutatePage((page) => {
      const target = page.components.find((item) => item.id === id);
      if (!target) {
        return;
      }
      Object.assign(target, geom);
    }, record);
  }

  /** 批量更新；record=false 用于输入过程中不刷历史 */
  function patchComponent(id: string, patch: Partial<ComponentDoc>, record = true): void {
    mutatePage((page) => {
      const target = page.components.find((item) => item.id === id);
      if (target) {
        Object.assign(target, patch);
      }
    }, record);
  }

  /** 删除选中 */
  function removeSelected(): void {
    if (!selectedIds.value.length) {
      return;
    }
    const ids = new Set(selectedIds.value);
    mutatePage((page) => {
      page.components = page.components.filter((item) => !ids.has(item.id));
    });
    selectedIds.value = [];
  }

  /** 将 id 列表展开为整组（非组内模式） */
  function expandToGroups(ids: string[]): string[] {
    const page = currentPage.value;
    if (!page || inGroupId.value) {
      return [...ids];
    }
    const set = new Set(ids);
    ids.forEach((id) => {
      const target = page.components.find((item) => item.id === id);
      if (!target?.groupId) {
        return;
      }
      page.components.forEach((item) => {
        if (item.groupId === target.groupId) {
          set.add(item.id);
        }
      });
    });
    return [...set];
  }

  /** 选中组件：组外模式点任一成员选中整组；Shift 追加/取消 */
  function selectComponent(id: string, additive = false): void {
    if (additive) {
      if (selectedIds.value.includes(id)) {
        const remove = new Set(expandToGroups([id]));
        selectedIds.value = selectedIds.value.filter((item) => !remove.has(item));
      } else {
        selectedIds.value = expandToGroups([...selectedIds.value, id]);
      }
      return;
    }
    selectedIds.value = expandToGroups([id]);
  }

  /** 批量写几何（拖拽整组） */
  function updateGeometries(
    updates: { id: string; geom: Partial<Pick<ComponentDoc, 'x' | 'y' | 'w' | 'h'>> }[],
    record: boolean,
  ): void {
    if (!updates.length) {
      return;
    }
    mutatePage((page) => {
      updates.forEach(({ id, geom }) => {
        const target = page.components.find((item) => item.id === id);
        if (target && !target.locked) {
          Object.assign(target, geom);
        }
      });
    }, record);
  }

  /** 复制 */
  function copy(): void {
    const page = currentPage.value;
    if (!page) {
      return;
    }
    clipboard.value = page.components.filter((item) => selectedIds.value.includes(item.id)).map((item) => cloneJson(item));
  }

  /** 粘贴（保留组关系，生成新 groupId） */
  function paste(): void {
    if (!clipboard.value.length) {
      return;
    }
    const gidMap = new Map<string, string>();
    const created: ComponentDoc[] = clipboard.value.map((item) => {
      let nextGroup = item.groupId;
      if (nextGroup) {
        if (!gidMap.has(nextGroup)) {
          gidMap.set(nextGroup, uid());
        }
        nextGroup = gidMap.get(nextGroup)!;
      }
      return {
        ...cloneJson(item),
        id: uid(),
        x: item.x + 16,
        y: item.y + 16,
        groupId: nextGroup ?? inGroupId.value,
        name: item.name,
      };
    });
    mutatePage((page) => {
      page.components.push(...created);
    });
    selectedIds.value = created.map((item) => item.id);
  }

  /** 组合：至少 2 个选中；返回是否成功 */
  function groupSelected(): boolean {
    if (selectedIds.value.length < 2) {
      return false;
    }
    const gid = uid();
    mutatePage((page) => {
      page.components.forEach((item) => {
        if (selectedIds.value.includes(item.id)) {
          item.groupId = gid;
        }
      });
    });
    return true;
  }

  /** 打散：清除选中项所属整组的 groupId；返回是否成功 */
  function ungroupSelected(): boolean {
    const page = currentPage.value;
    if (!page) {
      return false;
    }
    const gids = new Set(
      page.components
        .filter((item) => selectedIds.value.includes(item.id) && item.groupId)
        .map((item) => item.groupId as string),
    );
    if (!gids.size) {
      return false;
    }
    mutatePage((pageNext) => {
      pageNext.components.forEach((item) => {
        if (item.groupId && gids.has(item.groupId)) {
          item.groupId = null;
        }
      });
    });
    inGroupId.value = null;
    return true;
  }

  /** 图层 */
  function changeLayer(mode: 'top' | 'bottom' | 'up' | 'down'): void {
    mutatePage((page) => {
      const selected = page.components.filter((item) => selectedIds.value.includes(item.id));
      if (!selected.length) {
        return;
      }
      const zs = page.components.map((item) => item.zIndex);
      const max = Math.max(...zs);
      const min = Math.min(...zs);
      selected.forEach((item) => {
        if (mode === 'top') {
          item.zIndex = max + 1;
        } else if (mode === 'bottom') {
          item.zIndex = min - 1;
        } else if (mode === 'up') {
          item.zIndex += 1;
        } else {
          item.zIndex -= 1;
        }
      });
    });
  }

  /** 清空当前页组件 */
  function clearCanvas(): void {
    mutatePage((page) => {
      page.components = [];
    });
    selectedIds.value = [];
  }

  /** 添加页面 */
  function addPage(parentId: string | null = null): void {
    if (!screen.value) {
      return;
    }
    pushHistory();
    const page: PageDoc = {
      id: uid(),
      name: `页面 ${screen.value.pages.length + 1}`,
      parentId,
      background: { type: 'normal', color: '#0D1730', opacity: 100, fill: 'cover' },
      components: [],
    };
    screen.value = { ...screen.value, pages: [...screen.value.pages, page] };
    currentPageId.value = page.id;
    dirty.value = true;
  }

  /** 删除页面 */
  function removePage(pageId: string): void {
    if (!screen.value || screen.value.pages.length <= 1) {
      return;
    }
    pushHistory();
    const pages = screen.value.pages.filter((page) => page.id !== pageId && page.parentId !== pageId);
    screen.value = { ...screen.value, pages };
    if (currentPageId.value === pageId) {
      currentPageId.value = pages[0].id;
    }
    dirty.value = true;
  }

  /** 重命名页面 */
  function renamePage(pageId: string, name: string): void {
    if (!screen.value) {
      return;
    }
    pushHistory();
    screen.value = {
      ...screen.value,
      pages: screen.value.pages.map((page) => (page.id === pageId ? { ...page, name } : page)),
    };
    dirty.value = true;
  }

  /** 微调移动 */
  function nudge(dx: number, dy: number): void {
    mutatePage((page) => {
      page.components.forEach((item) => {
        if (selectedIds.value.includes(item.id) && !item.locked) {
          item.x += dx;
          item.y += dy;
        }
      });
    });
  }

  /** 修改展示适配并纳入统一历史与 AI 版本。 */
  function setFitMode(fitMode: FitMode): void {
    if (!screen.value || screen.value.fitMode === fitMode) {
      return;
    }
    pushHistory();
    screen.value = { ...screen.value, fitMode };
    dirty.value = true;
  }

  /** 生成只读 AI 预览草稿，不触碰正式状态与历史。 */
  function previewAiPlan(plan: AiEditorPlanResponse): string | null {
    const result = buildAiDraft(plan);
    if (typeof result === 'string') {
      previewDraft.value = null;
      return result;
    }
    previewDraft.value = result;
    return null;
  }

  /** 原子应用整份 AI 方案，一次应用只写入一条撤销历史。 */
  function applyAiPlan(plan: AiEditorPlanResponse): string | null {
    const result = buildAiDraft(plan);
    if (typeof result === 'string') {
      previewDraft.value = null;
      return result;
    }
    if (!screen.value) {
      return '大屏尚未加载';
    }
    past.value = [...past.value, cloneScreen(screen.value)].slice(-MAX_HISTORY);
    future.value = [];
    screen.value = result;
    dirty.value = true;
    editorRevision.value += 1;
    previewDraft.value = null;
    return null;
  }

  /** 清理 AI 临时预览。 */
  function cancelAiPreview(): void {
    previewDraft.value = null;
  }

  /** 基于正式 screen 构造经过共享校验的内存副本。 */
  function buildAiDraft(plan: AiEditorPlanResponse): ScreenDoc | string {
    if (!screen.value || !currentPage.value) {
      return '大屏尚未加载';
    }
    if (plan.editorRevision !== editorRevision.value) {
      return '画布已变化，请重新生成';
    }
    const planIssues = validateAiEditorPlanResponse(plan);
    if (planIssues.length) {
      return `AI 方案结构不合法：${planIssues[0].message}`;
    }
    if (!plan.operations.length) {
      return '方案中没有可应用的修改';
    }
    const draft = cloneScreen(screen.value);
    const page = draft.pages.find((item) => item.id === currentPageId.value);
    if (!page) {
      return '方案目标页面已不存在';
    }
    for (const operation of plan.operations) {
      if (operation.targetType !== 'component') {
        return '当前里程碑不支持页面样式操作';
      }
      const component = page.components.find((item) => item.id === operation.targetId);
      if (!component) {
        return `方案目标组件 ${operation.targetId} 已不存在`;
      }
      if (component.locked || component.hidden) {
        return `组件“${component.name}”当前不可修改`;
      }
      if (component.definitionSnapshot || !isM91SupportedTemplate(component.templateId)) {
        return `组件“${component.name}”当前不支持 AI 样式编辑`;
      }
      const metadata = getBuiltinComponentMetadata(component.templateId);
      if (!metadata) {
        return `组件“${component.name}”缺少共享样式目录`;
      }
      const patchIssues = validateAiStylePatch(metadata.styleSchema, operation.stylePatch);
      if (patchIssues.length) {
        return `组件“${component.name}”的方案未通过校验：${patchIssues[0].message}`;
      }
      component.style = { ...component.style, ...operation.stylePatch };
    }
    return draft;
  }

  return {
    screen,
    currentPageId,
    selectedIds,
    inGroupId,
    clipboard,
    dirty,
    editorRevision,
    previewDraft,
    zoom,
    showGrid,
    alignGuides,
    saving,
    currentPage,
    canUndo,
    canRedo,
    visibleComponents,
    load,
    save,
    undo,
    redo,
    addComponent,
    updateGeometry,
    updateGeometries,
    patchComponent,
    removeSelected,
    selectComponent,
    copy,
    paste,
    groupSelected,
    ungroupSelected,
    changeLayer,
    clearCanvas,
    addPage,
    removePage,
    renamePage,
    nudge,
    setFitMode,
    previewAiPlan,
    applyAiPlan,
    cancelAiPreview,
    mutatePage,
    pushHistory,
  };
});

function isM91SupportedTemplate(templateId: string): boolean {
  return templateId.startsWith('chart-') || templateId.startsWith('kpi-');
}
