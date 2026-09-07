<script setup lang="ts">
import { computed } from 'vue';
import type { ComponentDoc } from '@screencraft/shared';
import { getMeta } from '../meta-lookup';
import VideoPlayer from './VideoPlayer.vue';

const props = defineProps<{ doc: ComponentDoc; data: unknown; mode: 'edit' | 'runtime' }>();
const emit = defineEmits<{ change: [value: string] }>();
const tpl = computed(() => getMeta(props.doc.templateId));
const style = computed(() => ({ ...(tpl.value?.defaultStyle[props.doc.theme] ?? {}), ...props.doc.style }));
const id = computed(() => props.doc.templateId);

/** 文本内容：样式优先，画布双击在编辑器改 style.content */
const text = computed(() => String(style.value.content ?? style.value.text ?? ''));
</script>

<template>
  <img v-if="id === 'media-image'" class="img" :src="String(style.src || '')" alt="" :style="{ borderRadius: (style.radius || 0) + 'px' }" />
  <div v-else-if="id === 'media-video'" class="video">
    <VideoPlayer
      v-if="style.src"
      :src="String(style.src)"
      :autoplay="Boolean(style.autoplay)"
      :loop="Boolean(style.loop)"
      :muted="Boolean(style.muted)"
      :runtime="mode === 'runtime'"
    />
    <div v-else class="ph">视频未配置地址</div>
  </div>
  <button v-else-if="id === 'control-button'" class="btn-reg" :style="{ background: String(style.bgColor), fontSize: style.fontSize + 'px' }" type="button">
    {{ style.text }}
  </button>
  <button v-else-if="id === 'control-imageButton'" class="btn-img" type="button" :style="{ backgroundImage: style.src ? `url(${style.src})` : undefined }">
    {{ style.text }}
  </button>
  <div v-else-if="id === 'control-hotspot'" class="hot" :style="{ background: `rgba(47,127,247,${Number(style.opacity || 0) / 100})` }" />
  <label v-else-if="id === 'control-dropdown'" class="dd">
    <select :value="String(style.defaultValue ?? '')" @change="mode === 'runtime' && emit('change', ($event.target as HTMLSelectElement).value)">
      <option v-for="opt in ((data as { label: string; value: string }[]) ?? [])" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </label>
  <div v-else-if="id === 'control-text'" class="txt" :style="{ fontSize: style.fontSize + 'px', color: String(style.color), textAlign: String(style.align) as 'left' }">
    {{ text }}
  </div>
</template>

<style scoped>
.img, .video, video { width: 100%; height: 100%; object-fit: cover; display: block; background: #0A1428; }
.ph, .hot { width: 100%; height: 100%; display: grid; place-items: center; color: var(--t2); font-size: 12px; }
.btn-reg, .btn-img {
  width: 100%; height: 100%; border: none; border-radius: 6px; color: #fff; letter-spacing: 4px; font-weight: 500;
  background: linear-gradient(135deg, var(--pri), #1E6AE0);
}
.btn-img { background-size: cover; }
.dd { width: 100%; height: 100%; display: flex; align-items: center; }
.dd select {
  width: 100%; height: 100%; background: var(--panel2); color: var(--t1); border: 1px solid var(--border); border-radius: 6px; padding: 0 12px;
}
.txt { width: 100%; height: 100%; padding: 10px 12px; line-height: 1.8; box-sizing: border-box; overflow: hidden; }
</style>
