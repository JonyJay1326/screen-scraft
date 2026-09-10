<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const props = defineProps<{
  src: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  runtime: boolean;
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
let player: ReturnType<typeof videojs> | null = null;

/** 把三开关与地址同步到播放器 */
function applyOptions(): void {
  if (!player) {
    return;
  }
  if (props.src) {
    player.src({ src: props.src });
  }
  player.loop(props.loop);
  player.muted(props.muted);
  if (props.runtime && props.autoplay && props.src) {
    void player.play()?.catch(() => undefined);
  }
}

onMounted(() => {
  if (!videoEl.value) {
    return;
  }
  player = videojs(videoEl.value, {
    controls: true,
    fill: true,
    autoplay: props.runtime && props.autoplay,
    loop: props.loop,
    muted: props.muted,
    preload: 'metadata',
    sources: props.src ? [{ src: props.src }] : [],
  });
});

watch(
  () => [props.src, props.autoplay, props.loop, props.muted, props.runtime],
  () => applyOptions(),
);

onBeforeUnmount(() => {
  player?.dispose();
  player = null;
});
</script>

<template>
  <div class="vwrap">
    <video ref="videoEl" class="video-js vjs-big-play-centered" playsinline />
  </div>
</template>

<style scoped>
.vwrap { width: 100%; height: 100%; }
.vwrap :deep(.video-js) { width: 100%; height: 100%; }
</style>
