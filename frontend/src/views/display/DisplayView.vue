<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ScreenDoc } from '@screencraft/shared';
import { fetchDisplayScreen } from '../../api/runtime';
import RuntimeStage from '../../components/runtime/RuntimeStage.vue';

const route = useRoute();
const router = useRouter();
const screen = ref<ScreenDoc | null>(null);
const error = ref('');

onMounted(async () => {
  document.documentElement.setAttribute('data-theme', 'dark');
  try {
    screen.value = await fetchDisplayScreen(String(route.params.id));
  } catch {
    error.value = '展示页加载失败';
  }
});
</script>

<template>
  <RuntimeStage v-if="screen" :screen="screen" chrome="display" @configure="router.push(`/editor/${screen!._id}`)" />
  <div v-else class="stage">{{ error || '加载中…' }}</div>
</template>
