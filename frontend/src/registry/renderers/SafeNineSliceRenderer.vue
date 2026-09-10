<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  validateComponentDefinitionSnapshot,
  type ComponentDoc,
} from '@screencraft/shared';
import { resolveSafeNineSliceStyle } from '../safe-nine-slice-style';

const props = defineProps<{
  doc: ComponentDoc;
  data: unknown;
  mode: 'edit' | 'runtime';
}>();

const imageFailed = ref(false);

const definitionValid = computed(() => Boolean(
  props.doc.definitionSnapshot
  && props.doc.definitionSnapshot.rendererKey === 'border-nine-slice-v1'
  && validateComponentDefinitionSnapshot(props.doc.definitionSnapshot).length === 0,
));

const style = computed(() => resolveSafeNineSliceStyle(props.doc));

const frameStyle = computed(() => {
  const top = Math.max(0, style.value.sliceTop);
  const right = Math.max(0, style.value.sliceRight);
  const bottom = Math.max(0, style.value.sliceBottom);
  const left = Math.max(0, style.value.sliceLeft);
  const url = style.value.assetUrl;
  return {
    borderStyle: 'solid',
    borderWidth: `${top}px ${right}px ${bottom}px ${left}px`,
    borderImageSource: url ? `url("${url.replace(/["'\\()]/g, '')}")` : 'none',
    borderImageSlice: `${top} ${right} ${bottom} ${left} fill`,
    borderImageWidth: `${top}px ${right}px ${bottom}px ${left}px`,
    borderImageRepeat: 'stretch',
    padding: `${style.value.contentPadding}px`,
    boxSizing: 'border-box' as const,
  };
});

/** 图片加载失败时显示资产失效占位。 */
function onImageError(): void {
  imageFailed.value = true;
}

/** 切换组件时重置失效态。 */
function onAssetChange(): void {
  imageFailed.value = false;
}
</script>

<template>
  <div class="safe-nine-slice">
    <div v-if="!definitionValid" class="safe-nine-slice__error">组件配置不可用</div>
    <div
      v-else-if="!style.assetUrl || imageFailed"
      class="safe-nine-slice__error"
    >边框资产失效</div>
    <div
      v-else
      class="safe-nine-slice__frame"
      :style="frameStyle"
    >
      <img
        class="safe-nine-slice__probe"
        :src="style.assetUrl"
        alt=""
        @load="onAssetChange"
        @error="onImageError"
      >
    </div>
  </div>
</template>

<style scoped>
.safe-nine-slice,
.safe-nine-slice__frame {
  width: 100%;
  height: 100%;
}
.safe-nine-slice {
  position: relative;
}
.safe-nine-slice__frame {
  position: relative;
  overflow: hidden;
}
.safe-nine-slice__probe {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
.safe-nine-slice__error {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--err);
  background: color-mix(in srgb, var(--err) 10%, transparent);
  border: 1px dashed var(--err);
  font-size: 12px;
}
</style>
