<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import type { ScreenDoc } from '@screencraft/shared';
import { fetchScreen } from '../../api/screen';
import RuntimeStage from '../../components/runtime/RuntimeStage.vue';

const route = useRoute();
const screen = ref<ScreenDoc | null>(null);
const error = ref('');

onMounted(async () => {
  document.documentElement.setAttribute('data-theme', 'dark');
  const local = sessionStorage.getItem('sc_preview_doc');
  if (route.query.local === '1' && local) {
    screen.value = JSON.parse(local) as ScreenDoc;
    return;
  }
  try {
    screen.value = await fetchScreen(String(route.params.id));
  } catch {
    error.value = '预览加载失败';
  }
});
</script>

<template>
  <RuntimeStage v-if="screen" :screen="screen" chrome="none" />
  <div v-else class="stage">{{ error || '加载中…' }}</div>
</template>
