<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { DEFAULT_DEEPSEEK_SETTINGS } from '@screencraft/shared';
import { ElMessage } from 'element-plus';
import { fetchAiSettings, saveAiSettings, testAiSettings } from '../../api/runtime';

const saving = ref(false);
const testing = ref<'text' | 'vision' | null>(null);
const settings = reactive<{
  baseUrl: string;
  apiKey: string;
  textModel: string;
  visionModel: string;
  visionEnabled: boolean;
  apiKeyMasked: string;
}>({
  baseUrl: DEFAULT_DEEPSEEK_SETTINGS.baseUrl,
  apiKey: '',
  textModel: DEFAULT_DEEPSEEK_SETTINGS.textModel,
  visionModel: DEFAULT_DEEPSEEK_SETTINGS.visionModel,
  visionEnabled: DEFAULT_DEEPSEEK_SETTINGS.visionEnabled,
  apiKeyMasked: '',
});

onMounted(() => {
  void loadSettings();
});

async function loadSettings(): Promise<void> {
  const data = await fetchAiSettings();
  settings.baseUrl = data.baseUrl;
  settings.textModel = data.textModel;
  settings.visionModel = data.visionModel;
  settings.visionEnabled = data.visionEnabled;
  settings.apiKeyMasked = data.apiKeyMasked;
  settings.apiKey = '';
}

async function persistSettings(showSuccess: boolean): Promise<void> {
  const payload: {
    baseUrl: string;
    textModel: string;
    visionModel: string;
    visionEnabled: boolean;
    apiKey?: string;
  } = {
    baseUrl: settings.baseUrl.trim(),
    textModel: settings.textModel.trim(),
    visionModel: settings.visionModel.trim(),
    visionEnabled: settings.visionEnabled,
  };
  if (settings.apiKey.trim()) {
    payload.apiKey = settings.apiKey;
  }
  const saved = await saveAiSettings(payload);
  settings.apiKeyMasked = saved.apiKeyMasked;
  settings.apiKey = '';
  if (showSuccess) {
    ElMessage.success('DeepSeek 配置已保存');
  }
}

async function submitSettings(): Promise<void> {
  saving.value = true;
  try {
    await persistSettings(true);
  } finally {
    saving.value = false;
  }
}

async function testCapability(capability: 'text' | 'vision'): Promise<void> {
  testing.value = capability;
  try {
    await persistSettings(false);
    const result = await testAiSettings(capability);
    ElMessage.success(`${capability === 'text' ? '文本 JSON' : '视觉图片'}能力测试通过：${result.model}`);
  } finally {
    testing.value = null;
  }
}
</script>

<template>
  <div class="card ai-settings-card">
    <div class="settings-head">
      <div>
        <h3>DeepSeek 模型设置</h3>
        <p class="muted">文本与视觉能力分别配置、分别测试。API Key 只写入后端，页面不会读取明文。</p>
      </div>
      <span class="tag">deepseek</span>
    </div>

    <el-form label-width="120px">
      <el-form-item label="BaseURL">
        <el-input v-model="settings.baseUrl" :placeholder="DEFAULT_DEEPSEEK_SETTINGS.baseUrl" />
      </el-form-item>
      <el-form-item label="API Key">
        <el-input
          v-model="settings.apiKey"
          type="password"
          show-password
          autocomplete="new-password"
          :placeholder="settings.apiKeyMasked || '未配置'"
        />
      </el-form-item>
      <el-form-item label="文本模型">
        <el-input v-model="settings.textModel" :placeholder="DEFAULT_DEEPSEEK_SETTINGS.textModel" />
      </el-form-item>
      <el-form-item label="视觉模型">
        <el-input v-model="settings.visionModel" :placeholder="DEFAULT_DEEPSEEK_SETTINGS.visionModel" />
      </el-form-item>
      <el-form-item label="视觉能力">
        <el-switch
          :model-value="settings.visionEnabled"
          @update:model-value="settings.visionEnabled = Boolean($event)"
        />
        <span class="muted switch-tip">关闭后编辑器不允许上传参考图</span>
      </el-form-item>
      <el-form-item>
        <div class="actions">
          <el-button type="primary" :loading="saving" @click="submitSettings">保存</el-button>
          <el-button :loading="testing === 'text'" @click="testCapability('text')">测试文本 JSON</el-button>
          <el-button
            :disabled="!settings.visionEnabled"
            :loading="testing === 'vision'"
            @click="testCapability('vision')"
          >
            测试视觉图片
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.ai-settings-card {
  max-width: 720px;
  padding: 20px;
}

.settings-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.settings-head h3 {
  margin: 0 0 8px;
}

.settings-head p {
  margin: 0;
}

.switch-tip {
  margin-left: 12px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
