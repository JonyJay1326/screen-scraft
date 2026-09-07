<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { sql } from '@codemirror/lang-sql';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const host = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

onMounted(() => {
  if (!host.value) {
    return;
  }
  view = new EditorView({
    doc: props.modelValue || '',
    extensions: [
      basicSetup,
      sql(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString());
        }
      }),
    ],
    parent: host.value,
  });
});

watch(
  () => props.modelValue,
  (value) => {
    if (!view || value === view.state.doc.toString()) {
      return;
    }
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value || '' } });
  },
);

onBeforeUnmount(() => view?.destroy());
</script>

<template>
  <div ref="host" class="sql-host" />
</template>

<style scoped>
.sql-host { border: 1px solid var(--border); border-radius: 6px; overflow: hidden; min-height: 160px; background: #0f172a; }
.sql-host :deep(.cm-editor) { height: 180px; font-size: 13px; }
.sql-host :deep(.cm-scroller) { font-family: var(--font-num); }
</style>
