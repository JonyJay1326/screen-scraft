<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { sql } from '@codemirror/lang-sql';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const host = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

/** 浅色编辑器主题：白底深字，管理端弹窗内可读性更好 */
const sqlLightTheme = EditorView.theme(
  {
    '&': {
      color: '#303133',
      backgroundColor: '#ffffff',
      height: '100%',
    },
    '.cm-content': {
      caretColor: '#2f7ff7',
      fontFamily: 'var(--font-num)',
      fontSize: '13.5px',
      lineHeight: '1.65',
      padding: '10px 0',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#2f7ff7',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'rgba(47, 127, 247, 0.18)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(47, 127, 247, 0.06)',
    },
    '.cm-gutters': {
      backgroundColor: '#f5f7fa',
      color: '#909399',
      border: 'none',
      borderRight: '1px solid #e4e7ed',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(47, 127, 247, 0.08)',
      color: '#2f7ff7',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 10px 0 8px',
      minWidth: '32px',
    },
  },
  { dark: false },
);

onMounted(() => {
  if (!host.value) {
    return;
  }
  view = new EditorView({
    doc: props.modelValue || '',
    extensions: [
      basicSetup,
      sql(),
      sqlLightTheme,
      EditorView.lineWrapping,
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
.sql-host {
  width: 100%;
  border: 1px solid var(--border, #e4e7ed);
  border-radius: 6px;
  overflow: hidden;
  min-height: 320px;
  background: #fff;
}
.sql-host :deep(.cm-editor) {
  height: 320px;
  outline: none;
}
.sql-host :deep(.cm-editor.cm-focused) {
  outline: none;
}
.sql-host :deep(.cm-scroller) {
  overflow: auto;
  font-family: var(--font-num);
}
</style>
