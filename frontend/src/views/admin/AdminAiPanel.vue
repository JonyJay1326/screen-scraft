<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  createKbDoc,
  deleteKbDoc,
  fetchAiSettings,
  fetchKbDoc,
  fetchKbDocs,
  saveAiSettings,
  updateKbDoc,
} from '../../api/runtime';

const tab = ref<'model' | 'kb'>('model');
const saving = ref(false);
const settings = reactive({
  baseUrl: '',
  apiKey: '',
  chatModel: '',
  embeddingModel: '',
  apiKeyMasked: '',
});
const docs = ref<{ _id: string; title: string; format: string; updatedAt: string }[]>([]);
const docVisible = ref(false);
const editingId = ref<string | null>(null);
const docForm = reactive({ title: '', content: '', format: 'md' as 'md' | 'txt' });

onMounted(() => {
  void loadSettings();
  void loadDocs();
});

/** 加载模型配置 */
async function loadSettings(): Promise<void> {
  const data = await fetchAiSettings();
  settings.baseUrl = data.baseUrl;
  settings.chatModel = data.chatModel;
  settings.embeddingModel = data.embeddingModel;
  settings.apiKeyMasked = data.apiKeyMasked;
  settings.apiKey = '';
}

/** 保存模型配置（含 * 的输入视为未改密钥） */
async function submitSettings(): Promise<void> {
  saving.value = true;
  try {
    const payload: { baseUrl: string; chatModel: string; embeddingModel?: string; apiKey?: string } = {
      baseUrl: settings.baseUrl.trim(),
      chatModel: settings.chatModel.trim(),
      embeddingModel: settings.embeddingModel.trim(),
    };
    if (settings.apiKey && !settings.apiKey.includes('*')) {
      payload.apiKey = settings.apiKey;
    }
    const saved = await saveAiSettings(payload);
    settings.apiKeyMasked = saved.apiKeyMasked;
    settings.apiKey = '';
    ElMessage.success('已保存');
  } finally {
    saving.value = false;
  }
}

/** 加载知识库列表 */
async function loadDocs(): Promise<void> {
  docs.value = await fetchKbDocs();
}

/** 打开新建文档 */
function openNewDoc(): void {
  editingId.value = null;
  docForm.title = '';
  docForm.content = '';
  docForm.format = 'md';
  docVisible.value = true;
}

/** 打开编辑 */
async function openEditDoc(id: string): Promise<void> {
  const row = await fetchKbDoc(id);
  editingId.value = id;
  docForm.title = row.title;
  docForm.content = row.content;
  docForm.format = row.format === 'txt' ? 'txt' : 'md';
  docVisible.value = true;
}

/** 保存文档并重索引 */
async function submitDoc(): Promise<void> {
  if (!docForm.title.trim() || !docForm.content.trim()) {
    ElMessage.error('请填写标题与正文');
    return;
  }
  if (editingId.value) {
    await updateKbDoc(editingId.value, { ...docForm });
  } else {
    await createKbDoc({ ...docForm });
  }
  ElMessage.success('已保存，索引已更新');
  docVisible.value = false;
  await loadDocs();
}

/** 删除文档 */
async function removeDoc(id: string, title: string): Promise<void> {
  await ElMessageBox.confirm(`删除知识库文档「${title}」？`, '删除', { type: 'warning' });
  await deleteKbDoc(id);
  ElMessage.success('已删除');
  await loadDocs();
}

/** 选择本地 md/txt 填入正文 */
async function onFile(ev: Event): Promise<void> {
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file) {
    return;
  }
  docForm.content = await file.text();
  if (!docForm.title) {
    docForm.title = file.name.replace(/\.(md|txt)$/i, '');
  }
  docForm.format = file.name.toLowerCase().endsWith('.txt') ? 'txt' : 'md';
}
</script>

<template>
  <div>
    <div class="seg" style="margin-bottom: 16px; width: 280px">
      <button class="seg-item" :class="{ active: tab === 'model' }" type="button" @click="tab = 'model'">大模型</button>
      <button class="seg-item" :class="{ active: tab === 'kb' }" type="button" @click="tab = 'kb'">知识库</button>
    </div>

    <div v-if="tab === 'model'" class="card" style="padding: 20px; max-width: 640px">
      <p class="muted" style="margin-bottom: 16px">
        走 OpenAI 兼容接口。未配置 Key 时客服降级为知识库 BM25 摘录。密钥只存后端，回显为掩码。
      </p>
      <el-form label-width="120px">
        <el-form-item label="BaseURL">
          <el-input v-model="settings.baseUrl" placeholder="https://api.example.com/v1" />
        </el-form-item>
        <el-form-item label="API Key">
          <el-input v-model="settings.apiKey" type="password" show-password :placeholder="settings.apiKeyMasked || '未配置'" />
        </el-form-item>
        <el-form-item label="对话模型">
          <el-input v-model="settings.chatModel" placeholder="如 gpt-4o-mini" />
        </el-form-item>
        <el-form-item label="Embedding">
          <el-input v-model="settings.embeddingModel" placeholder="可选；空则仅 BM25" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="submitSettings">保存</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div v-else>
      <div class="toolbar-row">
        <span class="muted">共 <b class="num">{{ docs.length }}</b> 篇</span>
        <button class="btn btn-pri" type="button" @click="openNewDoc">新建文档</button>
      </div>
      <div class="card">
        <table class="table">
          <thead>
            <tr><th>标题</th><th>格式</th><th>更新时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in docs" :key="row._id">
              <td>{{ row.title }}</td>
              <td>{{ row.format }}</td>
              <td class="muted">{{ row.updatedAt.replace('T', ' ').slice(0, 16) }}</td>
              <td>
                <div class="row-ops">
                  <button class="btn btn-ghost" type="button" @click="openEditDoc(row._id)">编辑</button>
                  <button class="btn btn-ghost" type="button" @click="removeDoc(row._id, row.title)">删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!docs.length" class="empty">暂无知识库文档</div>
      </div>
    </div>

    <el-dialog v-model="docVisible" :title="editingId ? '编辑文档' : '新建文档'" width="720px">
      <el-form label-width="88px">
        <el-form-item label="标题"><el-input v-model="docForm.title" /></el-form-item>
        <el-form-item label="格式">
          <el-select v-model="docForm.format" style="width: 120px">
            <el-option label="Markdown" value="md" />
            <el-option label="纯文本" value="txt" />
          </el-select>
        </el-form-item>
        <el-form-item label="导入文件">
          <input type="file" accept=".md,.txt,text/plain,text/markdown" @change="onFile" />
        </el-form-item>
        <el-form-item label="正文">
          <el-input v-model="docForm.content" type="textarea" :rows="14" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="docVisible = false">取消</el-button>
        <el-button type="primary" @click="submitDoc">保存并索引</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 12px;
}
</style>
