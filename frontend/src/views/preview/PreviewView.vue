<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { ScreenDoc } from '@screencraft/shared';
import { fetchScreen } from '../../api/screen';
import { fetchTemplateDetail } from '../../api/template';
import RuntimeStage from '../../components/runtime/RuntimeStage.vue';

const route = useRoute();
const screen = ref<ScreenDoc | null>(null);
const error = ref('');

onMounted(() => {
  document.documentElement.setAttribute('data-theme', 'dark');
  void load();
});

/** 加载预览：大屏 / 模板快照 / 本地未保存草稿 */
async function load(): Promise<void> {
  const local = sessionStorage.getItem('sc_preview_doc');
  if (route.query.local === '1' && local) {
    screen.value = JSON.parse(local) as ScreenDoc;
    return;
  }
  try {
    if (route.query.from === 'template') {
      const detail = await fetchTemplateDetail(String(route.params.id));
      screen.value = detail.screen;
      return;
    }
    screen.value = await fetchScreen(String(route.params.id));
  } catch {
    error.value = '预览加载失败';
  }
}
</script>

<template>
  <RuntimeStage v-if="screen" :screen="screen" chrome="none" />
  <div v-else class="stage">{{ error || '加载中…' }}</div>
</template>
