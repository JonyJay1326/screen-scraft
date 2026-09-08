<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search } from 'lucide-vue-next';
import AppTopbar from '../../components/ui/AppTopbar.vue';
import SqlEditor from '../../components/editor/SqlEditor.vue';
import {
  createApiConfig,
  deleteApiConfig,
  fetchApiConfigs,
  testApiConfig,
  updateApiConfig,
  type ApiConfigListItem,
  type UpsertApiPayload,
} from '../../api/apiConfig';
import { formatRelative } from '../../utils/format';
import { cloneJson } from '../../utils/clone';
import { useUserStore } from '../../stores/user';

const userStore = useUserStore();
const list = ref<ApiConfigListItem[]>([]);
const kw = ref('');
const visible = ref(false);
const testing = ref(false);
const testResult = ref<{ columns: string[]; rows: Record<string, unknown>[]; protocolValid: boolean; protocolIssues: { message: string }[] } | null>(null);
const editingId = ref<string | null>(null);
/** 编辑表单：SQL / 外部字段始终有值，避免模板里写非空断言 */
type ApiFormState = {
  name: string;
  type: 'sql' | 'external';
  sql: string;
  external: {
    url: string;
    method: 'GET' | 'POST';
    headers: Record<string, string>;
    authType: 'none' | 'bearer' | 'basic';
    authSecret?: string;
  };
  params: UpsertApiPayload['params'];
};

const form = reactive<ApiFormState>({
  name: '',
  type: 'sql',
  sql: 'SELECT name, value FROM demo WHERE region = :region',
  external: { url: '', method: 'GET', authType: 'none', headers: {} },
  params: [{ name: 'region', type: 'string', defaultValue: 'all' }],
});

const filtered = computed(() =>
  list.value.filter((item) => !kw.value || item.name.includes(kw.value) || item.path.includes(kw.value)),
);

onMounted(() => {
  document.documentElement.setAttribute('data-theme', 'light');
  void load();
});

/** 加载列表 */
async function load(): Promise<void> {
  list.value = await fetchApiConfigs();
}

/** 打开新建 */
function openNew(): void {
  editingId.value = null;
  form.name = '';
  form.type = 'sql';
  form.sql = 'SELECT name, value FROM demo WHERE region = :region';
  form.external = { url: '', method: 'GET', authType: 'none', headers: {} };
  form.params = [{ name: 'region', type: 'string', defaultValue: 'all' }];
  testResult.value = null;
  visible.value = true;
}

/** 打开编辑 */
function openEdit(row: ApiConfigListItem): void {
  editingId.value = row._id;
  form.name = row.name;
  form.type = row.type;
  form.sql = row.sql ?? '';
  form.external = {
    url: row.external?.url ?? '',
    method: row.external?.method ?? 'GET',
    authType: row.external?.authType ?? 'none',
    headers: row.external?.headers ?? {},
  };
  form.params = row.params?.length ? cloneJson(row.params) : [];
  testResult.value = null;
  visible.value = true;
}

/** 保存 */
async function save(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.error('请填写名称');
    return;
  }
  if (editingId.value) {
    await updateApiConfig(editingId.value, form);
  } else {
    await createApiConfig(form);
  }
  ElMessage.success('已保存');
  visible.value = false;
  await load();
}

/** 删除 */
async function remove(row: ApiConfigListItem): Promise<void> {
  await ElMessageBox.confirm(`删除 API「${row.name}」？被引用时将被拒绝。`, '删除', { type: 'warning' });
  await deleteApiConfig(row._id);
  ElMessage.success('已删除');
  await load();
}

/** 试运行 */
async function runTest(): Promise<void> {
  let id = editingId.value;
  if (!id) {
    const created = await createApiConfig(form);
    id = created._id;
    editingId.value = id;
  } else {
    await updateApiConfig(id, form);
  }
  testing.value = true;
  try {
    const params: Record<string, unknown> = {};
    form.params.forEach((item) => {
      params[item.name] = item.defaultValue;
    });
    testResult.value = await testApiConfig(id, params);
    if (!testResult.value.protocolValid && testResult.value.protocolIssues.length) {
      ElMessage.warning(testResult.value.protocolIssues.map((i) => i.message).join('；') || '返回不符合协议');
    }
  } finally {
    testing.value = false;
  }
}

/** 加参数 */
function addParam(): void {
  form.params.push({ name: `p${form.params.length + 1}`, type: 'string', defaultValue: '' });
}

/** 切换 API 类型（单选值域比表单窄，需收窄类型） */
function setApiType(value: string | number | boolean | undefined): void {
  if (value === 'sql' || value === 'external') {
    form.type = value;
  }
}
</script>

<template>
  <div>
    <AppTopbar nav="api-config" />
    <main class="app-content">
      <div class="page-head">
        <div>
          <h1>API 配置</h1>
          <div class="desc">组件的数据接入统一在这里管理：SQL 生成（内置业务库）或外部接口</div>
        </div>
        <div class="flex gap-8">
          <div class="input-wrap" style="width:250px">
            <Search :size="15" />
            <input v-model="kw" class="input" placeholder="按名称 / 接口路径搜索" />
          </div>
          <button v-if="userStore.isAdmin" class="btn btn-pri" type="button" @click="openNew"><Plus :size="15" />新建 API</button>
        </div>
      </div>
      <div class="card">
        <table class="table">
          <thead>
            <tr>
              <th>名称</th><th>类型</th><th>请求方式</th><th>接口路径</th><th>更新时间</th><th>引用</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filtered" :key="row._id">
              <td>{{ row.name }}</td>
              <td>{{ row.type === 'sql' ? 'SQL 生成' : '外部登记' }}</td>
              <td>{{ row.method }}</td>
              <td class="muted">{{ row.path }}</td>
              <td class="muted">{{ formatRelative(row.updatedAt) }}</td>
              <td>{{ row.refCount }}</td>
              <td>
                <div class="row-ops">
                  <button v-if="userStore.isAdmin" class="btn btn-ghost" type="button" @click="openEdit(row)">编辑</button>
                  <button v-if="userStore.isAdmin" class="btn btn-ghost" type="button" @click="openEdit(row)">试运行</button>
                  <button v-if="userStore.isAdmin" class="btn btn-ghost" type="button" @click="remove(row)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!filtered.length" class="empty">暂无 API</div>
      </div>
    </main>

    <el-dialog v-model="visible" class="ed-dialog api-dialog" :title="editingId ? '编辑 API' : '新建 API'" width="960px" append-to-body>
      <el-form label-width="100px">
        <el-form-item label="名称"><el-input v-model="form.name" size="small" /></el-form-item>
        <el-form-item label="类型">
          <el-radio-group :model-value="form.type" @change="setApiType">
            <el-radio value="sql">SQL 生成</el-radio>
            <el-radio value="external">外部登记</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.type === 'sql'" label="SQL">
          <SqlEditor v-model="form.sql" />
        </el-form-item>
        <template v-else>
          <el-form-item label="URL"><el-input v-model="form.external.url" size="small" /></el-form-item>
          <el-form-item label="方法">
            <el-select v-model="form.external.method" popper-class="ed-select-popper" size="small" style="width:120px">
              <el-option label="GET" value="GET" /><el-option label="POST" value="POST" />
            </el-select>
          </el-form-item>
          <el-form-item label="鉴权">
            <el-select v-model="form.external.authType" popper-class="ed-select-popper" size="small" style="width:160px">
              <el-option label="无" value="none" />
              <el-option label="Bearer" value="bearer" />
              <el-option label="Basic" value="basic" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="form.external.authType !== 'none'" label="密钥">
            <el-input v-model="form.external.authSecret" type="password" show-password placeholder="不回显明文，留空表示不修改" />
          </el-form-item>
        </template>
        <div class="params-head">
          <h4>占位符参数</h4>
          <button class="btn btn-sm" type="button" @click="addParam">加参数</button>
        </div>
        <table class="mini-table">
          <thead><tr><th>名称</th><th>类型</th><th>默认值</th></tr></thead>
          <tbody>
            <tr v-for="(p, i) in form.params" :key="i">
              <td><input v-model="p.name" class="input input-sm" /></td>
              <td>
                <select v-model="p.type" class="select input-sm">
                  <option value="string">string</option>
                  <option value="number">number</option>
                </select>
              </td>
              <td><input v-model="p.defaultValue" class="input input-sm" /></td>
            </tr>
          </tbody>
        </table>
      </el-form>
      <div v-if="testResult" class="test-box">
        <p class="test-meta">{{ testResult.protocolValid ? '协议提示：可对照组件协议检查' : testResult.protocolIssues.map(i => i.message).join('；') }}</p>
        <div class="test-table">
          <table class="table">
            <thead><tr><th v-for="c in testResult.columns" :key="c">{{ c }}</th></tr></thead>
            <tbody>
              <tr v-for="(row, i) in testResult.rows.slice(0, 20)" :key="i">
                <td v-for="c in testResult.columns" :key="c">{{ row[c] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button :loading="testing" @click="runTest">试运行</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.params-head { display: flex; justify-content: space-between; align-items: center; margin: 12px 0; }
.test-box { margin-top: 16px; border-top: 1px solid var(--border); padding-top: 12px; }
.test-table { max-height: 240px; overflow: auto; }
.test-meta { font-size: 12px; color: var(--t2); margin-bottom: 8px; }
</style>

<style>
/* API 弹窗加宽加高，SQL 编辑区占满 */
.api-dialog.el-dialog {
  max-width: min(960px, calc(100vw - 48px));
}
.api-dialog .el-dialog__body {
  max-height: min(72vh, 780px);
  overflow-y: auto;
}
.api-dialog .el-form-item:has(.sql-host) .el-form-item__content {
  width: 100%;
  max-width: 100%;
}
</style>
