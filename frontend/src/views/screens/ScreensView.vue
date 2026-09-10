<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ChevronRight, MoreHorizontal, Plus } from 'lucide-vue-next';
import type { Category, ScreenDoc } from '@screencraft/shared';
import AppTopbar from '../../components/ui/AppTopbar.vue';
import { fetchProjects, type ProjectListItem } from '../../api/project';
import {
  copyScreenApi,
  createScreenApi,
  deleteScreenApi,
  fetchScreens,
  setDeployedApi,
} from '../../api/screen';
import {
  createScreenFromTemplateApi,
  deleteTemplateApi,
  fetchTemplates,
  promoteTemplateApi,
  type TemplateListItem,
} from '../../api/template';
import { CATEGORIES, formatRelative } from '../../utils/format';
import { useUserStore } from '../../stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const projectId = computed(() => String(route.params.projectId));
const project = ref<ProjectListItem | null>(null);
const tab = ref<'list' | 'tpl'>('list');
const category = ref<Category | '全部'>('全部');
const screens = ref<ScreenDoc[]>([]);
const templates = ref<TemplateListItem[]>([]);
const tplScope = ref<'public' | 'personal'>('public');
const createVisible = ref(false);
const createName = ref('未命名大屏');
const createCategory = ref<Category>('通用');
const promotingId = ref('');

onMounted(() => {
  document.documentElement.setAttribute('data-theme', 'light');
  void bootstrap();
});

/** 加载项目与大屏 */
async function bootstrap(): Promise<void> {
  const list = await fetchProjects();
  project.value = list.find((item) => item._id === projectId.value) ?? null;
  screens.value = await fetchScreens(projectId.value);
  await loadTemplates();
}

/** 切换分类并刷新当前 Tab 数据 */
async function setCategory(next: Category | '全部'): Promise<void> {
  category.value = next;
  if (tab.value === 'tpl') {
    await loadTemplates();
  }
}

/** 加载模板 */
async function loadTemplates(): Promise<void> {
  templates.value = await fetchTemplates(tplScope.value, category.value === '全部' ? undefined : category.value);
}

const filteredScreens = computed(() =>
  screens.value.filter((item) => category.value === '全部' || item.category === category.value),
);

/** 新建空白并进编辑器 */
async function submitCreate(): Promise<void> {
  if (!createName.value.trim()) {
    ElMessage.error('请输入大屏名称');
    return;
  }
  const created = await createScreenApi({
    projectId: projectId.value,
    name: createName.value.trim(),
    category: createCategory.value,
  });
  createVisible.value = false;
  await router.push(`/editor/${created._id}`);
}

/** 进入编辑器 */
function edit(item: ScreenDoc): void {
  void router.push(`/editor/${item._id}`);
}

/** 复制 */
async function copy(item: ScreenDoc): Promise<void> {
  const cloned = await copyScreenApi(item._id);
  ElMessage.success(`已复制为「${cloned.name}」`);
  screens.value = await fetchScreens(projectId.value);
}

/** 删除 */
async function remove(item: ScreenDoc): Promise<void> {
  const extra = item.deployed ? '该大屏处于投放中，删除将影响展示设备。' : '';
  await ElMessageBox.confirm(`确定删除「${item.name}」？${extra}`, '删除大屏', {
    type: 'warning',
    confirmButtonText: '删除',
  });
  await deleteScreenApi(item._id);
  ElMessage.success('已删除');
  screens.value = await fetchScreens(projectId.value);
}

/** 切换投放 */
async function toggleDeploy(item: ScreenDoc): Promise<void> {
  await setDeployedApi(item._id, !item.deployed);
  screens.value = await fetchScreens(projectId.value);
}

/** 用模板新建 */
async function useTemplate(tpl: TemplateListItem): Promise<void> {
  const created = await createScreenFromTemplateApi(tpl._id, projectId.value);
  await router.push(`/editor/${created._id}`);
}

/** 新标签打开模板预览（全屏无控制条） */
function previewTemplate(tpl: TemplateListItem): void {
  window.open(`/preview/${tpl._id}?from=template`, '_blank');
}

/** 管理员将个人模板提升为公共 */
async function promoteTemplate(tpl: TemplateListItem): Promise<void> {
  await ElMessageBox.confirm(
    `将个人模板「${tpl.name}」提升为公共模板后，所有成员可见可用。是否继续？`,
    '提升为公共模板',
    { type: 'warning', confirmButtonText: '提升' },
  );
  promotingId.value = tpl._id;
  try {
    await promoteTemplateApi(tpl._id);
    ElMessage.success('已提升为公共模板');
    tplScope.value = 'public';
    await loadTemplates();
  } finally {
    promotingId.value = '';
  }
}

/** 删除个人模板 */
async function removeTemplate(tpl: TemplateListItem): Promise<void> {
  await ElMessageBox.confirm(`删除模板「${tpl.name}」？`, '删除模板', { type: 'warning' });
  await deleteTemplateApi(tpl._id);
  await loadTemplates();
}

/** 新标签打开展示页 */
function openDisplay(id: string): void {
  window.open(`/display/${id}`, '_blank');
}
</script>

<template>
  <div>
    <AppTopbar nav="projects" />
    <main class="app-content">
      <div class="crumb">
        <RouterLink to="/projects">项目</RouterLink>
        <span class="sep"><ChevronRight :size="13" /></span>
        <span class="cur">{{ project?.name ?? '大屏' }}</span>
      </div>
      <div class="page-head">
        <div>
          <h1>{{ project?.name ?? '大屏列表' }}</h1>
          <div class="desc">管理该项目下的大屏与模板</div>
        </div>
        <button class="btn btn-pri" type="button" @click="createVisible = true"><Plus :size="15" />新建空白大屏</button>
      </div>
      <div class="tabs">
        <button class="tab" :class="{ active: tab === 'list' }" type="button" @click="tab = 'list'">大屏列表</button>
        <button class="tab" :class="{ active: tab === 'tpl' }" type="button" @click="tab = 'tpl'">模板库</button>
      </div>

      <div v-if="tab === 'list'">
        <div class="tool-row">
          <div class="chips">
            <button class="chip" :class="{ active: category === '全部' }" type="button" @click="setCategory('全部')">全部</button>
            <button
              v-for="item in CATEGORIES"
              :key="item"
              class="chip"
              :class="{ active: category === item }"
              type="button"
              @click="setCategory(item)"
            >
              {{ item }}
            </button>
          </div>
          <span class="muted">共 {{ filteredScreens.length }} 块</span>
        </div>
        <div v-if="!filteredScreens.length" class="empty">暂无大屏</div>
        <div class="screen-grid">
          <article v-for="item in filteredScreens" :key="item._id" class="card screen-card">
            <div class="scr-thumb" @click="edit(item)">
              <img v-if="item.thumbnail" class="ph-img" :src="item.thumbnail" alt="" />
              <div v-else class="ph" />
              <div class="scr-topbar">
                <span v-if="item.deployed" class="tag">使用中</span>
                <div class="thumb-btn" @click.stop>
                  <MoreHorizontal :size="14" />
                  <div class="dropdown-menu">
                    <button type="button" @click.stop="copy(item)">复制</button>
                    <button type="button" @click.stop="openDisplay(item._id)">进入展示页</button>
                    <button type="button" @click.stop="toggleDeploy(item)">
                      {{ item.deployed ? '取消投放' : '标记为投放中' }}
                    </button>
                    <button class="danger" type="button" @click.stop="remove(item)">删除</button>
                  </div>
                </div>
              </div>
              <div class="scr-acts"><button class="btn btn-pri btn-sm" type="button">编辑</button></div>
            </div>
            <div class="scr-body">
              <div class="scr-name">{{ item.name }}</div>
              <div class="scr-meta">
                <span class="tag">{{ item.category }}</span>
                <span class="muted">{{ formatRelative(item.updatedAt) }}</span>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div v-else>
        <div class="tool-row">
          <div class="seg">
            <button class="seg-item" :class="{ active: tplScope === 'public' }" type="button" @click="tplScope = 'public'; loadTemplates()">公共模板</button>
            <button class="seg-item" :class="{ active: tplScope === 'personal' }" type="button" @click="tplScope = 'personal'; loadTemplates()">个人模板</button>
          </div>
          <span class="muted">共 {{ templates.length }} 个</span>
        </div>
        <div class="tool-row">
          <div class="chips">
            <button class="chip" :class="{ active: category === '全部' }" type="button" @click="setCategory('全部')">全部</button>
            <button
              v-for="item in CATEGORIES"
              :key="item"
              class="chip"
              :class="{ active: category === item }"
              type="button"
              @click="setCategory(item)"
            >
              {{ item }}
            </button>
          </div>
        </div>
        <div v-if="!templates.length" class="empty">暂无模板</div>
        <div class="screen-grid">
          <article v-for="tpl in templates" :key="tpl._id" class="card tpl-card">
            <div class="scr-thumb">
              <img v-if="tpl.thumbnail" class="ph-img" :src="tpl.thumbnail" alt="" />
              <div v-else class="ph" />
              <div class="scr-acts">
                <button class="btn btn-pri btn-sm" type="button" @click="useTemplate(tpl)">以此新建</button>
                <button class="btn btn-sm" type="button" @click="previewTemplate(tpl)">预览</button>
                <button
                  v-if="userStore.isAdmin && tpl.scope === 'personal'"
                  class="btn btn-sm"
                  type="button"
                  :disabled="promotingId === tpl._id"
                  @click="promoteTemplate(tpl)"
                >
                  提升为公共
                </button>
                <button
                  v-if="tpl.scope === 'personal' || userStore.isAdmin"
                  class="btn btn-sm"
                  type="button"
                  @click="removeTemplate(tpl)"
                >
                  删除
                </button>
              </div>
            </div>
            <div class="scr-body">
              <div class="scr-name">{{ tpl.name }}</div>
              <div class="scr-meta">
                <span class="tag">{{ tpl.category }}</span>
                <span class="muted">{{ formatRelative(tpl.updatedAt) }}</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </main>

    <el-dialog v-model="createVisible" class="ed-dialog" title="新建空白大屏" width="440px" append-to-body>
      <el-form label-width="88px">
        <el-form-item label="名称">
          <el-input v-model="createName" size="small" maxlength="20" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="createCategory" popper-class="ed-select-popper" size="small" style="width: 100%">
            <el-option v-for="item in CATEGORIES" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">创建并编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.tool-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 16px 0; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.screen-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.screen-card, .tpl-card { position: relative; overflow: visible; }
.scr-thumb { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: #0d1730; border-radius: var(--r-lg) var(--r-lg) 0 0; }
.ph, .ph-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  image-rendering: auto;
}
.ph { background: radial-gradient(circle at 30% 20%, rgba(47,127,247,.35), transparent 50%), #0d1730; }
.scr-topbar { position: absolute; top: 8px; right: 8px; display: flex; align-items: center; gap: 6px; z-index: 5; }
.thumb-btn { position: relative; width: 26px; height: 26px; display: grid; place-items: center; border-radius: var(--r-sm); background: var(--mask); color: #fff; cursor: pointer; }
.thumb-btn .dropdown-menu { right: 0; left: auto; min-width: 140px; }
.thumb-btn:hover .dropdown-menu, .thumb-btn:focus-within .dropdown-menu { display: block; }
.scr-acts {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  flex-wrap: wrap; gap: 8px; padding: 12px; background: var(--mask); opacity: 0; z-index: 2; pointer-events: none;
}
.scr-acts .btn { pointer-events: auto; }
.screen-card:hover .scr-acts, .tpl-card:hover .scr-acts { opacity: 1; }
.scr-body { padding: 12px 14px; }
.scr-name { font-size: 14px; font-weight: 500; }
.scr-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
</style>
