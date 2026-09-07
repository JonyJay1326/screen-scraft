<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowLeft, BarChart3, BookOpen, ChevronLeft, Eye, EyeOff, Frame, Grid3x3, Image as ImageIcon,
  LayoutTemplate, Lock, MoreHorizontal, MousePointer, Plus, Redo2, Save, Search, Undo2, Unlock,
  ZoomIn, ZoomOut,
} from 'lucide-vue-next';
import { useScreenStore } from '../../stores/screen';
import { getTemplate, listTemplates } from '../../registry';
import CanvasItem from '../../components/editor/CanvasItem.vue';
import StyleForm from '../../components/editor/StyleForm.vue';
import DataPanel from '../../components/editor/DataPanel.vue';
import EventPanel from '../../components/editor/EventPanel.vue';
import AiChat from '../../components/ui/AiChat.vue';
import { saveAsTemplateApi } from '../../api/template';
import { CATEGORIES } from '../../utils/format';
import { cloneJson } from '../../utils/clone';

const CANVAS_W = 1920;
const CANVAS_H = 1080;
const TPL_MIME = 'application/x-screencraft-tpl';

const route = useRoute();
const router = useRouter();
const store = useScreenStore();
const leftTab = ref<'page' | 'lib'>('lib');
const rightTab = ref<'data' | 'style' | 'event'>('style');
const libTheme = ref<'dark' | 'light'>('dark');
const libCat = ref<'chart' | 'decoration' | 'media' | 'control'>('chart');
const libKw = ref('');
const leftCollapsed = ref(false);
const spacePan = ref(false);
const wrapEl = ref<HTMLElement | null>(null);
const canvasEl = ref<HTMLElement | null>(null);
const tplName = ref('');
const tplCat = ref<(typeof CATEGORIES)[number]>('通用');
const tplVisible = ref(false);
const shortcutVisible = ref(false);
const loadError = ref('');
const loading = ref(true);

const templates = computed(() =>
  listTemplates().filter((item) => {
    if (item.category !== libCat.value) {
      return false;
    }
    const kw = libKw.value.trim();
    return !kw || item.label.includes(kw) || item.group.includes(kw);
  }),
);
const selected = computed(() => store.currentPage?.components.find((item) => item.id === store.selectedIds[0]));
const canvasList = computed(() =>
  [...store.visibleComponents].sort((a, b) => a.zIndex - b.zIndex),
);
const sizerStyle = computed(() => ({
  width: `${CANVAS_W * (store.zoom / 100)}px`,
  height: `${CANVAS_H * (store.zoom / 100)}px`,
}));
const canvasStyle = computed(() => ({
  transform: `scale(${store.zoom / 100})`,
  backgroundColor: store.currentPage?.background.color || '#0D1730',
}));

/** 是否正在输入，避免快捷键抢走按键 */
function isEditableTarget(event: Event): boolean {
  const el = event.target as HTMLElement | null;
  if (!el) {
    return false;
  }
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  if (el.isContentEditable) {
    return true;
  }
  return Boolean(el.closest('.el-input, .el-textarea, .el-select, .el-color-picker, .vxe-table, .cm-editor'));
}

onMounted(async () => {
  document.documentElement.setAttribute('data-theme', 'dark');
  document.documentElement.classList.add('dark');
  try {
    await store.load(String(route.params.id));
    await nextTick();
    fitCanvas();
  } catch {
    loadError.value = '大屏加载失败';
  } finally {
    loading.value = false;
  }
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('beforeunload', onBeforeUnload);
});

onUnmounted(() => {
  document.documentElement.classList.remove('dark');
  document.documentElement.setAttribute('data-theme', 'light');
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('keyup', onKeyUp);
  window.removeEventListener('beforeunload', onBeforeUnload);
});

watch(
  () => store.dirty,
  (dirty) => {
    document.title = dirty ? '未保存 · ScreenCraft' : '已保存 · ScreenCraft';
  },
);

/** 刷新拦截 */
function onBeforeUnload(event: BeforeUnloadEvent): void {
  if (store.dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
}

/** 快捷键 */
function onKey(event: KeyboardEvent): void {
  if (event.code === 'Space' && !isEditableTarget(event)) {
    event.preventDefault();
    spacePan.value = true;
  }
  const meta = event.ctrlKey || event.metaKey;
  if (meta && event.code === 'KeyS') {
    event.preventDefault();
    void doSave();
    return;
  }
  if (isEditableTarget(event)) {
    return;
  }
  if (meta && event.code === 'KeyZ' && event.shiftKey) {
    event.preventDefault();
    store.redo();
  } else if (meta && event.code === 'KeyZ') {
    event.preventDefault();
    store.undo();
  }
  if (meta && event.code === 'KeyC') {
    store.copy();
  }
  if (meta && event.code === 'KeyV') {
    store.paste();
  }
  if (meta && event.code === 'KeyG' && event.shiftKey) {
    event.preventDefault();
    store.ungroupSelected();
  } else if (meta && event.code === 'KeyG') {
    event.preventDefault();
    store.groupSelected();
  }
  if (event.code === 'Delete' || (meta && event.code === 'Backspace')) {
    event.preventDefault();
    store.removeSelected();
  }
  if (event.code === 'Escape') {
    store.inGroupId = null;
    store.selectedIds = [];
  }
  const step = event.shiftKey ? 10 : 1;
  if (event.code === 'ArrowLeft') {
    event.preventDefault();
    store.nudge(-step, 0);
  }
  if (event.code === 'ArrowRight') {
    event.preventDefault();
    store.nudge(step, 0);
  }
  if (event.code === 'ArrowUp') {
    event.preventDefault();
    store.nudge(0, -step);
  }
  if (event.code === 'ArrowDown') {
    event.preventDefault();
    store.nudge(0, step);
  }
}

/** 空格结束 */
function onKeyUp(event: KeyboardEvent): void {
  if (event.code === 'Space') {
    spacePan.value = false;
  }
}

/** 适应画布 */
function fitCanvas(): void {
  const wrap = wrapEl.value;
  if (!wrap) {
    return;
  }
  const z = Math.min((wrap.clientWidth - 56) / CANVAS_W, (wrap.clientHeight - 56) / CANVAS_H);
  store.zoom = Math.round(Math.min(4, Math.max(0.2, z)) * 100);
}

/** 滚轮缩放 */
function onWheel(event: WheelEvent): void {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }
  event.preventDefault();
  const delta = event.deltaY > 0 ? -10 : 10;
  store.zoom = Math.min(400, Math.max(20, store.zoom + delta));
}

/** 空格拖动画布 */
function onWrapPointerDown(event: PointerEvent): void {
  if (!spacePan.value || !wrapEl.value) {
    return;
  }
  event.preventDefault();
  const wrap = wrapEl.value;
  const startX = event.clientX;
  const startY = event.clientY;
  const originLeft = wrap.scrollLeft;
  const originTop = wrap.scrollTop;
  const onMove = (ev: PointerEvent) => {
    wrap.scrollLeft = originLeft - (ev.clientX - startX);
    wrap.scrollTop = originTop - (ev.clientY - startY);
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

/** 保存，成功返回 true */
async function doSave(): Promise<boolean> {
  let thumbnail: string | undefined;
  try {
    if (canvasEl.value) {
      const { default: html2canvas } = await import('html2canvas');
      const pic = await html2canvas(canvasEl.value, { backgroundColor: '#0D1730', scale: 0.12, logging: false });
      thumbnail = pic.toDataURL('image/jpeg', 0.55);
    }
  } catch {
    /* 视频等跨域节点可能失败，忽略缩略图 */
  }
  try {
    await store.save(thumbnail);
    ElMessage.success('已保存');
    return true;
  } catch {
    return false;
  }
}

/** 新标签打开预览页（展示已保存版本） */
async function goPreview(): Promise<void> {
  if (!store.screen) {
    return;
  }
  if (store.dirty) {
    try {
      await ElMessageBox.confirm('有未保存修改。预览页展示已保存版本。', '预览', {
        distinguishCancelAndClose: true,
        confirmButtonText: '保存并预览',
        cancelButtonText: '直接预览',
        type: 'warning',
      });
      const ok = await doSave();
      if (!ok) {
        return;
      }
    } catch (action) {
      if (action !== 'cancel') {
        return;
      }
    }
  }
  window.open(`/preview/${store.screen._id}`, '_blank');
}

/** 返回列表 */
async function goBack(): Promise<void> {
  if (store.dirty) {
    await ElMessageBox.confirm('有未保存修改，确定离开？', '提示', { type: 'warning' });
  }
  if (store.screen) {
    void router.push(`/projects/${store.screen.projectId}/screens`);
  } else {
    void router.push('/projects');
  }
}

/** 点击添加落在画布中央；已有组件则错开，避免完全叠住点不到 */
function placeAtCenter(width: number, height: number): { x: number; y: number } {
  const baseX = (CANVAS_W - width) / 2;
  const baseY = (CANVAS_H - height) / 2;
  const index = store.currentPage?.components.length ?? 0;
  const offset = index * 64;
  return {
    x: Math.round(Math.max(0, Math.min(CANVAS_W - width, baseX + offset))),
    y: Math.round(Math.max(0, Math.min(CANVAS_H - height, baseY + offset))),
  };
}

/** 添加模板到画布 */
function addTpl(id: string, x?: number, y?: number): void {
  const tpl = getTemplate(id);
  if (!tpl) {
    ElMessage.error('未找到该组件模板');
    return;
  }
  const theme = libTheme.value;
  const at = x === undefined || y === undefined ? placeAtCenter(tpl.defaultSize.w, tpl.defaultSize.h) : { x, y };
  store.addComponent({
    templateId: tpl.id,
    name: tpl.label,
    x: Math.round(Math.max(0, at.x)),
    y: Math.round(Math.max(0, at.y)),
    w: tpl.defaultSize.w,
    h: tpl.defaultSize.h,
    locked: false,
    hidden: false,
    groupId: store.inGroupId,
    theme,
    style: { ...tpl.defaultStyle[theme] },
    data: tpl.defaultData ? { source: 'static', staticData: cloneJson(tpl.defaultData) } : undefined,
    events: [],
  });
  ElMessage.success(`已添加「${tpl.label}」到画布`);
  void nextTick(() => scrollToPoint(at.x + tpl.defaultSize.w / 2, at.y + tpl.defaultSize.h / 2));
}

/** 把画布某点滚到视口中央 */
function scrollToPoint(canvasX: number, canvasY: number): void {
  const wrap = wrapEl.value;
  if (!wrap) {
    return;
  }
  const z = store.zoom / 100;
  wrap.scrollTo({
    left: Math.max(0, canvasX * z - wrap.clientWidth / 2 + 28),
    top: Math.max(0, canvasY * z - wrap.clientHeight / 2 + 28),
    behavior: 'smooth',
  });
}

/** 组件库拖出 */
function onLibDragStart(event: DragEvent, id: string): void {
  event.dataTransfer?.setData(TPL_MIME, id);
  event.dataTransfer?.setData('text/plain', id);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy';
  }
}

/** 拖到画布放下 */
function onCanvasDrop(event: DragEvent): void {
  event.preventDefault();
  const id = event.dataTransfer?.getData(TPL_MIME) || event.dataTransfer?.getData('text/plain');
  if (!id || !canvasEl.value) {
    return;
  }
  const tpl = getTemplate(id);
  if (!tpl) {
    return;
  }
  const rect = canvasEl.value.getBoundingClientRect();
  const z = store.zoom / 100;
  const x = (event.clientX - rect.left) / z - tpl.defaultSize.w / 2;
  const y = (event.clientY - rect.top) / z - tpl.defaultSize.h / 2;
  addTpl(id, x, y);
}

/** 添加占位框 */
function addPlaceholder(): void {
  store.addComponent({
    templateId: 'placeholder',
    name: '占位组件',
    x: 200,
    y: 160,
    w: 360,
    h: 200,
    locked: false,
    hidden: false,
    groupId: store.inGroupId,
    theme: 'dark',
    style: {},
    events: [],
  });
}

/** 选中 */
function select(id: string, additive: boolean): void {
  if (additive) {
    store.selectedIds = store.selectedIds.includes(id)
      ? store.selectedIds.filter((item) => item !== id)
      : [...store.selectedIds, id];
  } else {
    store.selectedIds = [id];
  }
}

/** 新标签打开展示页 */
function openDisplay(): void {
  if (!store.screen) {
    return;
  }
  window.open(`/display/${store.screen._id}`, '_blank');
}

/** 导出 JSON */
function exportJson(): void {
  if (!store.screen) {
    return;
  }
  const blob = new Blob([JSON.stringify(store.screen, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${store.screen.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** 清空 */
async function clearPage(): Promise<void> {
  await ElMessageBox.confirm('清空当前页全部组件？', '清空画布', { type: 'warning' });
  store.clearCanvas();
}

/** 另存模板 */
async function saveTpl(): Promise<void> {
  if (!store.screen || !tplName.value.trim()) {
    return;
  }
  await saveAsTemplateApi(store.screen._id, tplName.value.trim(), tplCat.value);
  ElMessage.success('已存入个人模板');
  tplVisible.value = false;
}

/** 改页面背景色 */
function onPageBgColor(color: string | null): void {
  if (!color) {
    return;
  }
  store.mutatePage((page) => {
    page.background.color = color;
  });
}

/** 重命名页面 */
async function renamePage(pageId: string, name: string): Promise<void> {
  try {
    const { value } = await ElMessageBox.prompt('页面名称', '重命名页面', {
      inputValue: name,
      inputPattern: /\S+/,
      inputErrorMessage: '名称不能为空',
    });
    store.renamePage(pageId, value.trim());
  } catch {
    /* 取消 */
  }
}
</script>

<template>
  <div v-if="loading" class="ed-shell ed-state">加载中…</div>
  <div v-else-if="loadError" class="ed-shell ed-state">
    <p>{{ loadError }}</p>
    <button class="btn btn-pri" type="button" @click="goBack">返回</button>
  </div>
  <div v-else-if="store.screen" class="ed-shell">
    <div class="ed-top">
      <button class="ed-back" type="button" @click="goBack"><ArrowLeft :size="16" />返回</button>
      <span class="ed-sep" />
      <span class="ed-screen-name">{{ store.screen.name }}</span>
      <span class="tag" :class="store.dirty ? 'tag-warn' : 'tag-ok'">{{ store.dirty ? '未保存' : '已保存' }}</span>
      <span class="ed-sep" />
      <button class="ed-tool" type="button" title="收起左侧" :class="{ on: leftCollapsed }" @click="leftCollapsed = !leftCollapsed">
        <ChevronLeft :size="16" />
      </button>
      <span class="ed-sep" />
      <button class="ed-tool" type="button" title="撤销 (Ctrl+Z)" :disabled="!store.canUndo" @click="store.undo()"><Undo2 :size="16" /></button>
      <button class="ed-tool" type="button" title="重做 (Ctrl+Shift+Z)" :disabled="!store.canRedo" @click="store.redo()"><Redo2 :size="16" /></button>
      <span class="ed-sep" />
      <button class="ed-tool" type="button" title="缩小" @click="store.zoom = Math.max(20, store.zoom - 10)"><ZoomOut :size="16" /></button>
      <span class="ed-zoom">{{ store.zoom }}%</span>
      <button class="ed-tool" type="button" title="放大" @click="store.zoom = Math.min(400, store.zoom + 10)"><ZoomIn :size="16" /></button>
      <button class="ed-tool ed-tool-txt" type="button" @click="fitCanvas">适应画布</button>
      <span class="ed-sep" />
      <button class="ed-tool" :class="{ on: store.showGrid }" type="button" title="网格" @click="store.showGrid = !store.showGrid"><Grid3x3 :size="16" /></button>
      <span class="ed-fit" title="展示适配">
        <el-select v-model="store.screen.fitMode" size="small" @change="store.dirty = true">
          <el-option label="画面居中" value="center" />
          <el-option label="宽度铺满" value="width" />
          <el-option label="高度铺满" value="height" />
          <el-option label="全屏拉伸" value="stretch" />
        </el-select>
      </span>
      <div class="ed-top-right">
        <button class="btn btn-ghost btn-sm" type="button" @click="shortcutVisible = true"><BookOpen :size="14" />快捷键</button>
        <button class="btn btn-sm" type="button" :disabled="store.saving" @click="doSave"><Save :size="14" />保存</button>
        <button class="btn btn-sm" type="button" @click="tplVisible = true"><LayoutTemplate :size="14" />保存为模板</button>
        <button class="btn btn-pri btn-sm" type="button" @click="goPreview"><Eye :size="14" />预览</button>
        <el-dropdown>
          <button class="btn btn-ghost btn-sm" type="button"><MoreHorizontal :size="15" /></button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="openDisplay">进入展示页</el-dropdown-item>
              <el-dropdown-item @click="exportJson">导出配置 JSON</el-dropdown-item>
              <el-dropdown-item divided @click="clearPage">清空画布</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <div class="ed-body">
      <aside v-show="!leftCollapsed" class="ed-left">
        <div class="tabs">
          <button class="tab" :class="{ active: leftTab === 'page' }" type="button" @click="leftTab = 'page'">页面</button>
          <button class="tab" :class="{ active: leftTab === 'lib' }" type="button" @click="leftTab = 'lib'">组件</button>
        </div>
        <div v-if="leftTab === 'page'" class="ed-left-body">
          <div
            v-for="page in store.screen.pages"
            :key="page.id"
            class="tree-node"
            :class="{ active: page.id === store.currentPageId }"
            :style="{ marginLeft: page.parentId ? '18px' : '0' }"
            @click="store.currentPageId = page.id"
          >
            {{ page.name }}
            <span class="node-op">
              <button type="button" title="添加子页" @click.stop="store.addPage(page.id)">+</button>
              <button type="button" title="重命名" @click.stop="renamePage(page.id, page.name)">改</button>
              <button type="button" title="删除" @click.stop="store.removePage(page.id)">删</button>
            </span>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" style="width:100%;margin-top:10px" @click="store.addPage()">
            <Plus :size="12" />新建页面
          </button>
        </div>
        <div v-else class="ed-left-body">
          <div class="input-wrap lib-search">
            <Search :size="14" />
            <input v-model="libKw" class="input input-sm" placeholder="搜索组件" />
          </div>
          <div class="lib-cats">
            <button class="lib-cat" :class="{ active: libCat === 'chart' }" type="button" @click="libCat = 'chart'"><BarChart3 :size="17" />图表</button>
            <button class="lib-cat" :class="{ active: libCat === 'decoration' }" type="button" @click="libCat = 'decoration'"><Frame :size="17" />装饰</button>
            <button class="lib-cat" :class="{ active: libCat === 'media' }" type="button" @click="libCat = 'media'"><ImageIcon :size="17" />媒体</button>
            <button class="lib-cat" :class="{ active: libCat === 'control' }" type="button" @click="libCat = 'control'"><MousePointer :size="17" />控件</button>
          </div>
          <div class="seg" style="margin-bottom: 10px; width: 100%">
            <button class="seg-item" :class="{ active: libTheme === 'dark' }" type="button" @click="libTheme = 'dark'">暗</button>
            <button class="seg-item" :class="{ active: libTheme === 'light' }" type="button" @click="libTheme = 'light'">明</button>
          </div>
          <div v-if="!templates.length" class="empty" style="padding: 24px 0">无匹配组件</div>
          <div class="lib-grid">
            <div
              v-for="item in templates"
              :key="item.id"
              class="lib-item"
              draggable="true"
              title="点击或拖拽到画布"
              @click="addTpl(item.id)"
              @dragstart="onLibDragStart($event, item.id)"
            >
              <div class="lib-thumb">
                <img :src="'/' + (libTheme === 'dark' ? item.previews.dark : item.previews.light)" :alt="item.label" />
              </div>
              <div class="lib-name">{{ item.label }}</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" style="width:100%;margin-top:10px" @click="addPlaceholder">添加占位框</button>
        </div>
      </aside>
      <div
        ref="wrapEl"
        class="ed-canvas-wrap"
        :style="{ cursor: spacePan ? 'grab' : 'default' }"
        @wheel="onWheel"
        @pointerdown="onWrapPointerDown"
        @dragover.prevent
        @drop="onCanvasDrop"
      >
        <div class="ed-canvas-sizer" :style="sizerStyle">
          <div
            ref="canvasEl"
            class="ed-canvas"
            :class="{ nogrid: !store.showGrid }"
            :style="canvasStyle"
            @mousedown.self="store.selectedIds = []; store.inGroupId = null"
          >
            <CanvasItem v-for="comp in canvasList" :key="comp.id" :doc="comp" @select="select" />
          </div>
        </div>
      </div>
      <aside class="ed-right">
        <div v-if="selected" class="p-sec" style="display:flex;gap:8px;align-items:center">
          <el-input v-model="selected.name" size="small" @change="store.patchComponent(selected.id, { name: selected.name })" />
          <button class="ed-tool" type="button" :title="selected.hidden ? '显示' : '隐藏'" @click="store.patchComponent(selected.id, { hidden: !selected.hidden })">
            <EyeOff v-if="selected.hidden" :size="14" /><Eye v-else :size="14" />
          </button>
          <button class="ed-tool" type="button" :title="selected.locked ? '解锁' : '锁定'" @click="store.patchComponent(selected.id, { locked: !selected.locked })">
            <Lock v-if="selected.locked" :size="14" /><Unlock v-else :size="14" />
          </button>
        </div>
        <div v-if="store.selectedIds.length" class="p-sec" style="display:flex;flex-wrap:wrap;gap:6px">
          <button class="btn btn-sm" type="button" @click="store.changeLayer('top')">置顶</button>
          <button class="btn btn-sm" type="button" @click="store.changeLayer('bottom')">置底</button>
          <button class="btn btn-sm" type="button" @click="store.changeLayer('up')">上一层</button>
          <button class="btn btn-sm" type="button" @click="store.changeLayer('down')">下一层</button>
          <button class="btn btn-sm" type="button" @click="store.groupSelected()">组合</button>
          <button class="btn btn-sm" type="button" @click="store.ungroupSelected()">打散</button>
        </div>
        <div class="tabs">
          <button class="tab" :class="{ active: rightTab === 'data' }" type="button" @click="rightTab = 'data'">数据绑定</button>
          <button class="tab" :class="{ active: rightTab === 'style' }" type="button" @click="rightTab = 'style'">样式设置</button>
          <button class="tab" :class="{ active: rightTab === 'event' }" type="button" @click="rightTab = 'event'">交互事件</button>
        </div>
        <div class="ed-right-body">
          <DataPanel v-if="rightTab === 'data' && selected" />
          <StyleForm v-else-if="rightTab === 'style'" />
          <EventPanel v-else-if="rightTab === 'event'" />
          <section v-if="!selected" class="p-sec">
            <h4>页面背景</h4>
            <div class="f-row" v-if="store.currentPage">
              <span class="f-label">颜色</span>
              <el-color-picker
                :model-value="store.currentPage.background.color"
                @change="onPageBgColor"
              />
            </div>
          </section>
        </div>
      </aside>
    </div>
  </div>

  <el-dialog v-model="tplVisible" title="保存为模板" width="400px">
    <el-form label-width="80px">
      <el-form-item label="名称"><el-input v-model="tplName" maxlength="20" placeholder="例如：水务运营通用版" /></el-form-item>
      <el-form-item label="分类">
        <el-select v-model="tplCat">
          <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>
    </el-form>
    <p class="form-tip" style="margin-left:80px">保存为个人模板；管理员可在模板库中将其提升为公共模板。</p>
    <template #footer>
      <el-button @click="tplVisible = false">取消</el-button>
      <el-button type="primary" @click="saveTpl">保存模板</el-button>
    </template>
  </el-dialog>
  <el-dialog v-model="shortcutVisible" title="快捷键说明" width="420px">
    <table class="kbd-table">
      <tr><td>保存大屏</td><td><kbd>Ctrl</kbd><kbd>S</kbd></td></tr>
      <tr><td>撤销 / 重做</td><td><kbd>Ctrl</kbd><kbd>Z</kbd> / <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>Z</kbd></td></tr>
      <tr><td>复制 / 粘贴组件</td><td><kbd>Ctrl</kbd><kbd>C</kbd> / <kbd>Ctrl</kbd><kbd>V</kbd></td></tr>
      <tr><td>删除选中组件</td><td><kbd>Ctrl</kbd><kbd>BackSpace</kbd> / <kbd>Delete</kbd></td></tr>
      <tr><td>组合 / 取消组合</td><td><kbd>Ctrl</kbd><kbd>G</kbd> / <kbd>Ctrl</kbd><kbd>Shift</kbd><kbd>G</kbd></td></tr>
      <tr><td>微调位置（Shift ×10）</td><td><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd></td></tr>
      <tr><td>取消选中 / 退出组内模式</td><td><kbd>Esc</kbd></td></tr>
      <tr><td>拖动画布</td><td>空格 + 拖拽</td></tr>
    </table>
  </el-dialog>
  <AiChat v-if="!loading && !loadError" />
</template>

<style scoped>
.ed-canvas.nogrid::before { display: none; }
.ed-fit { width: 118px; margin-left: 6px; display: inline-block; }
.ed-fit :deep(.el-select) { width: 100%; }
.ed-state { align-items: center; justify-content: center; gap: 16px; color: var(--t2); }
.seg { width: 100%; }
.seg .seg-item { flex: 1; text-align: center; }
.kbd-table { width: 100%; font-size: 13px; border-collapse: collapse; }
.kbd-table td { padding: 8px 6px; border-bottom: 1px solid var(--border); color: var(--t2); }
.kbd-table td:last-child { text-align: right; color: var(--t1); }
kbd {
  display: inline-block; padding: 2px 7px; background: var(--panel2); border: 1px solid var(--border);
  border-bottom-width: 2px; border-radius: 4px; font-family: var(--font-num); font-size: 11.5px; color: var(--t1); margin-left: 4px;
}
</style>
