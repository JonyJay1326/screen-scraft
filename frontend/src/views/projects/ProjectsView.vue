<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Folder, MoreHorizontal, Plus, Search } from 'lucide-vue-next';
import AppTopbar from '../../components/ui/AppTopbar.vue';
import {
  createProjectApi,
  deleteProjectApi,
  fetchProjects,
  updateProjectApi,
  type ProjectListItem,
} from '../../api/project';
import { formatRelative } from '../../utils/format';

const router = useRouter();
const loading = ref(false);
const keyword = ref('');
const projects = ref<ProjectListItem[]>([]);
const createVisible = ref(false);
const renameVisible = ref(false);
const createName = ref('');
const renameName = ref('');
const renameTarget = ref<ProjectListItem | null>(null);

const filtered = computed(() =>
  projects.value.filter((item) => item.name.toLowerCase().includes(keyword.value.trim().toLowerCase())),
);

onMounted(() => {
  document.documentElement.setAttribute('data-theme', 'light');
  void load();
});

/** 加载项目 */
async function load(): Promise<void> {
  loading.value = true;
  try {
    projects.value = await fetchProjects();
  } finally {
    loading.value = false;
  }
}

/** 进入大屏列表 */
function enter(item: ProjectListItem): void {
  void router.push(`/projects/${item._id}/screens`);
}

/** 创建项目 */
async function submitCreate(): Promise<void> {
  if (!createName.value.trim()) {
    ElMessage.error('请输入项目名称');
    return;
  }
  await createProjectApi(createName.value.trim());
  ElMessage.success('已创建');
  createVisible.value = false;
  createName.value = '';
  await load();
}

/** 打开重命名 */
function openRename(item: ProjectListItem): void {
  renameTarget.value = item;
  renameName.value = item.name;
  renameVisible.value = true;
}

/** 提交重命名 */
async function submitRename(): Promise<void> {
  if (!renameTarget.value || !renameName.value.trim()) {
    return;
  }
  await updateProjectApi(renameTarget.value._id, renameName.value.trim());
  ElMessage.success('已重命名');
  renameVisible.value = false;
  await load();
}

/** 删除项目 */
async function remove(item: ProjectListItem): Promise<void> {
  await ElMessageBox.confirm(
    `删除项目「${item.name}」将同时删除其下 ${item.screenCount} 块大屏，此操作不可恢复。`,
    '删除项目',
    { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  );
  await deleteProjectApi(item._id);
  ElMessage.success('已删除');
  await load();
}
</script>

<template>
  <div>
    <AppTopbar nav="projects" />
    <main class="app-content">
      <div class="page-head">
        <div>
          <h1>项目</h1>
          <div class="desc">按项目组织大屏，一个项目对应一块物理大屏或一个业务域</div>
        </div>
        <div class="proj-head-actions">
          <div class="input-wrap proj-search">
            <Search :size="15" />
            <input v-model="keyword" class="input" placeholder="搜索项目名称" />
          </div>
          <button class="btn btn-pri" type="button" @click="createVisible = true"><Plus :size="15" />新建项目</button>
        </div>
      </div>
      <div v-if="!filtered.length && !loading" class="empty">暂无项目，点击右上角新建</div>
      <div class="proj-grid">
        <article v-for="item in filtered" :key="item._id" class="card card-hover proj-card" @click="enter(item)">
          <div class="proj-top">
            <span class="proj-ico"><Folder :size="18" /></span>
            <div class="proj-name">{{ item.name }}</div>
            <button class="icon-btn" type="button" @click.stop>
              <MoreHorizontal :size="16" />
              <div class="dropdown-menu">
                <button type="button" @click.stop="openRename(item)">重命名</button>
                <button class="danger" type="button" @click.stop="remove(item)">删除</button>
              </div>
            </button>
          </div>
          <div class="proj-meta">
            <span class="muted">{{ item.screenCount }} 块大屏</span>
            <span class="muted">{{ formatRelative(item.updatedAt) }}</span>
          </div>
        </article>
      </div>
    </main>

    <el-dialog v-model="createVisible" title="新建项目" width="440px">
      <el-form label-width="88px">
        <el-form-item label="项目名称">
          <el-input v-model="createName" maxlength="20" placeholder="请输入项目名称（20 字以内）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="renameVisible" title="重命名项目" width="440px">
      <el-form label-width="88px">
        <el-form-item label="项目名称">
          <el-input v-model="renameName" maxlength="20" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="renameVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRename">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.proj-head-actions { display: flex; align-items: center; gap: 12px; }
.proj-search { width: 240px; }
.proj-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.proj-card { padding: 16px; }
.proj-top { display: flex; align-items: center; gap: 12px; }
.proj-ico {
  width: 36px; height: 36px; border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--pri), var(--acc));
  color: #fff; display: grid; place-items: center; flex: none;
}
.proj-name { flex: 1; min-width: 0; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.icon-btn { position: relative; width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--t2); }
.icon-btn:hover { background: var(--panel2); color: var(--t1); }
.icon-btn:hover .dropdown-menu, .icon-btn:focus-within .dropdown-menu { display: block; }
.proj-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; font-size: 13px; }
</style>
