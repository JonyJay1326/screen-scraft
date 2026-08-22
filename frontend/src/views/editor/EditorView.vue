<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  ArrowLeft, ChevronLeft, Eye, EyeOff, Grid3x3, Keyboard, Lock, Plus, Redo2, Save, Undo2, Unlock,
} from 'lucide-vue-next';
import { useScreenStore } from '../../stores/screen';
import { getTemplate, listTemplates } from '../../registry';
import CanvasItem from '../../components/editor/CanvasItem.vue';
import StyleForm from '../../components/editor/StyleForm.vue';
import DataPanel from '../../components/editor/DataPanel.vue';
import { saveAsTemplateApi } from '../../api/template';
import { CATEGORIES } from '../../utils/format';

const route = useRoute();
const router = useRouter();
const store = useScreenStore();
const leftTab = ref<'page' | 'lib'>('lib');
const rightTab = ref<'data' | 'style' | 'event'>('style');
const libTheme = ref<'dark' | 'light'>('dark');
const libCat = ref<'chart' | 'decoration' | 'media' | 'control'>('chart');
const spacePan = ref(false);
const pan = ref({ x: 0, y: 0 });
const tplName = ref('');
const tplCat = ref<(typeof CATEGORIES)[number]>('通用');
const tplVisible = ref(false);
const shortcutVisible = ref(false);

const templates = computed(() => listTemplates().filter((item) => item.category === libCat.value));
const selected = computed(() => store.currentPage?.components.find((item) => item.id === store.selectedIds[0]));

onMounted(async () => {
  document.documentElement.setAttribute('data-theme', 'dark');
  await store.load(String(route.params.id));
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('beforeunload', onBeforeUnload);
});

onUnmounted(() => {
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
  if (event.code === 'Space') {
    spacePan.value = true;
  }
  const meta = event.ctrlKey || event.metaKey;
  if (meta && event.code === 'KeyS') {
    event.preventDefault();
    void doSave();
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
  if (meta && event.code === 'Backspace') {
    event.preventDefault();
    store.removeSelected();
  }
  if (event.code === 'Escape') {
    store.inGroupId = null;
    store.selectedIds = [];
  }
  const step = event.shiftKey ? 10 : 1;
  if (event.code === 'ArrowLeft') {
    store.nudge(-step, 0);
  }
  if (event.code === 'ArrowRight') {
    store.nudge(step, 0);
  }
  if (event.code === 'ArrowUp') {
    store.nudge(0, -step);
  }
  if (event.code === 'ArrowDown') {
    store.nudge(0, step);
  }
}

/** 空格结束 */
function onKeyUp(event: KeyboardEvent): void {
  if (event.code === 'Space') {
    spacePan.value = false;
  }
}

/** 保存 */
async function doSave(): Promise<void> {
  try {
    await store.save();
    ElMessage.success('已保存');
  } catch {
    /* axios 已提示 */
  }
}

/** 返回列表 */
async function goBack(): Promise<void> {
  if (store.dirty) {
    await ElMessageBox.confirm('有未保存修改，确定离开？', '提示', { type: 'warning' });
  }
  if (store.screen) {
    void router.push(`/projects/${store.screen.projectId}/screens`);
  }
}

/** 添加模板到画布中央 */
function addTpl(id: string): void {
  const tpl = getTemplate(id);
  if (!tpl) {
    return;
  }
  const theme = libTheme.value;
  store.addComponent({
    templateId: tpl.id,
    name: tpl.label,
    x: (1920 - tpl.defaultSize.w) / 2,
    y: (1080 - tpl.defaultSize.h) / 2,
    w: tpl.defaultSize.w,
    h: tpl.defaultSize.h,
    locked: false,
    hidden: false,
    groupId: null,
    theme,
    style: { ...tpl.defaultStyle[theme] },
    data: tpl.defaultData ? { source: 'static', staticData: structuredClone(tpl.defaultData) } : undefined,
    events: [],
  });
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
    groupId: null,
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

const scaleStyle = computed(() => ({ transform: `scale(${store.zoom / 100}) translate(${pan.value.x}px, ${pan.value.y}px)` }));
</script>

<template>
  <div v-if="store.screen" class="ed-shell" @mousedown.self="store.selectedIds = []">
    <div class="ed-top">
      <button class="ed-back" type="button" @click="goBack"><ArrowLeft :size="16" />返回</button>
      <strong>{{ store.screen.name }}</strong>
      <span class="ed-sep" />
      <button class="ed-tool" :class="{ on: leftTab === 'page' }" type="button" title="页面层级" @click="leftTab = 'page'"><ChevronLeft :size="16" /></button>
      <button class="ed-tool" :class="{ on: leftTab === 'lib' }" type="button" title="组件库" @click="leftTab = 'lib'">组件</button>
      <span class="ed-sep" />
      <el-select v-model="store.screen.fitMode" size="small" style="width: 120px">
        <el-option label="画面居中" value="center" />
        <el-option label="宽度铺满" value="width" />
        <el-option label="高度铺满" value="height" />
        <el-option label="全屏拉伸" value="stretch" />
      </el-select>
      <button class="ed-tool" type="button" title="快捷键" @click="shortcutVisible = true"><Keyboard :size="16" /></button>
      <button class="ed-tool" type="button" @click="store.zoom = Math.max(20, store.zoom - 10)">−</button>
      <span class="ed-zoom">{{ store.zoom }}%</span>
      <button class="ed-tool" type="button" @click="store.zoom = Math.min(400, store.zoom + 10)">+</button>
      <button class="ed-tool" type="button" @click="store.zoom = 50">适应画布</button>
      <button class="ed-tool" :class="{ on: store.showGrid }" type="button" @click="store.showGrid = !store.showGrid"><Grid3x3 :size="16" /></button>
      <button class="ed-tool" :disabled="!store.canUndo" type="button" @click="store.undo()"><Undo2 :size="16" /></button>
      <button class="ed-tool" :disabled="!store.canRedo" type="button" @click="store.redo()"><Redo2 :size="16" /></button>
      <div class="ed-top-right">
        <span class="tag" :class="store.dirty ? 'tag-err' : 'tag-ok'">{{ store.dirty ? '未保存' : '已保存' }}</span>
        <button class="btn" type="button" @click="tplVisible = true">保存为模板</button>
        <button class="btn btn-pri" type="button" :disabled="store.saving" @click="doSave"><Save :size="14" />保存</button>
        <el-dropdown>
          <button class="btn" type="button">更多</button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="exportJson">导出 JSON</el-dropdown-item>
              <el-dropdown-item @click="clearPage">清空画布</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <div class="ed-body">
      <aside class="ed-left">
        <div class="tabs">
          <button class="tab" :class="{ active: leftTab === 'page' }" type="button" @click="leftTab = 'page'">页面</button>
          <button class="tab" :class="{ active: leftTab === 'lib' }" type="button" @click="leftTab = 'lib'">组件库</button>
        </div>
        <div v-if="leftTab === 'page'" class="ed-left-body">
          <button class="btn btn-sm" type="button" @click="store.addPage()"><Plus :size="12" />添加页面</button>
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
              <button type="button" @click.stop="store.addPage(page.id)">+</button>
              <button type="button" @click.stop="store.renamePage(page.id, prompt('页面名称', page.name) || page.name)">改</button>
              <button type="button" @click.stop="store.removePage(page.id)">删</button>
            </span>
          </div>
        </div>
        <div v-else class="ed-left-body">
          <div class="lib-cats">
            <button class="lib-cat" :class="{ active: libCat === 'chart' }" type="button" @click="libCat = 'chart'">图表</button>
            <button class="lib-cat" :class="{ active: libCat === 'decoration' }" type="button" @click="libCat = 'decoration'">装饰</button>
            <button class="lib-cat" :class="{ active: libCat === 'media' }" type="button" @click="libCat = 'media'">媒体</button>
            <button class="lib-cat" :class="{ active: libCat === 'control' }" type="button" @click="libCat = 'control'">控件</button>
          </div>
          <div class="seg" style="margin-bottom: 10px">
            <button class="seg-item" :class="{ active: libTheme === 'dark' }" type="button" @click="libTheme = 'dark'">暗</button>
            <button class="seg-item" :class="{ active: libTheme === 'light' }" type="button" @click="libTheme = 'light'">明</button>
          </div>
          <button class="btn btn-sm" type="button" style="margin-bottom: 8px" @click="addPlaceholder">添加占位框</button>
          <div class="lib-grid">
            <div v-for="item in templates" :key="item.id" class="lib-item" @click="addTpl(item.id)">
              <div class="lib-thumb">{{ item.label }}</div>
              <div class="lib-name">{{ item.label }}</div>
            </div>
          </div>
        </div>
      </aside>
      <div class="ed-canvas-wrap" :style="{ cursor: spacePan ? 'grab' : 'default' }">
        <div class="ed-canvas" :class="{ nogrid: !store.showGrid }" :style="scaleStyle" @mousedown.self="store.selectedIds = []; store.inGroupId = null">
          <CanvasItem
            v-for="comp in [...(store.currentPage?.components ?? [])].sort((a, b) => a.zIndex - b.zIndex)"
            :key="comp.id"
            :doc="comp"
            @select="select"
          />
        </div>
      </div>
      <aside class="ed-right">
        <div v-if="selected" class="p-sec" style="display:flex;gap:8px;align-items:center">
          <el-input v-model="selected.name" size="small" @change="store.patchComponent(selected.id, { name: selected.name })" />
          <button class="ed-tool" type="button" @click="store.patchComponent(selected.id, { hidden: !selected.hidden })">
            <EyeOff v-if="selected.hidden" :size="14" /><Eye v-else :size="14" />
          </button>
          <button class="ed-tool" type="button" @click="store.patchComponent(selected.id, { locked: !selected.locked })">
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
          <div v-else class="p-sec muted">交互事件在 M6 配置，运行时 M7 生效。当前可先保存事件结构。</div>
          <section v-if="!selected" class="p-sec">
            <h4>页面背景</h4>
            <div class="f-row" v-if="store.currentPage">
              <span class="f-label">颜色</span>
              <el-color-picker v-model="store.currentPage.background.color" @change="store.mutatePage((p) => { p.background.color = store.currentPage!.background.color })" />
            </div>
          </section>
        </div>
      </aside>
    </div>
  </div>

  <el-dialog v-model="tplVisible" title="保存为模板" width="400px">
    <el-form label-width="80px">
      <el-form-item label="名称"><el-input v-model="tplName" /></el-form-item>
      <el-form-item label="分类">
        <el-select v-model="tplCat">
          <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="tplVisible = false">取消</el-button>
      <el-button type="primary" @click="saveTpl">保存</el-button>
    </template>
  </el-dialog>
  <el-dialog v-model="shortcutVisible" title="快捷键" width="420px">
    <p>空格+拖拽移动画布 · Ctrl+S 保存 · Ctrl+Z 撤销 · Ctrl+Shift+Z 重做</p>
    <p>Ctrl+C/V 复制粘贴 · Ctrl+BackSpace 删除 · 方向键微调 / Shift 10px</p>
  </el-dialog>
</template>

<style scoped>
.ed-canvas.nogrid::before { display: none; }
.ed-canvas { transform-origin: top left; }
</style>
