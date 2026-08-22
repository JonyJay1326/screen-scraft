<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ErrorCode } from '@screencraft/shared';
import { fetchHealth, type HealthPayload } from './api/health';

const loading = ref(true);
const health = ref<HealthPayload | null>(null);
const errorText = ref('');

/** 探测后端健康检查 */
async function probe(): Promise<void> {
  loading.value = true;
  errorText.value = '';
  try {
    health.value = await fetchHealth();
  } catch {
    errorText.value = '无法连接后端 /api/v1/health';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void probe();
});
</script>

<template>
  <div class="shell">
    <h1>ScreenCraft</h1>
    <p class="sub">大屏配置系统 · 工程脚手架</p>
    <p class="code">shared ErrorCode.OK = {{ ErrorCode.OK }}</p>
    <p v-if="loading">正在检查后端…</p>
    <p v-else-if="health" class="ok">健康检查通过，Mongo：{{ health.mongo }}</p>
    <p v-else class="err">{{ errorText }}</p>
    <button type="button" @click="probe">重新检查</button>
  </div>
</template>
