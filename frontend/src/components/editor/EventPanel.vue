<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { EventDoc } from '@screencraft/shared';
import { useScreenStore } from '../../stores/screen';
import { cloneJson } from '../../utils/clone';
import { getTemplate } from '../../registry';

const store = useScreenStore();
const selected = computed(() => store.currentPage?.components.find((item) => item.id === store.selectedIds[0]));
const tpl = computed(() => (selected.value ? getTemplate(selected.value.templateId) : undefined));
const showEv = ref(false);
const form = reactive<EventDoc>({
  id: '',
  name: '未命名事件',
  trigger: 'click',
  action: 'jumpPage',
  config: {},
});

const others = computed(() => store.currentPage?.components.filter((item) => item.id !== selected.value?.id) ?? []);

/** 显示/隐藏目标 id，避免 el-select 对对象值绑定失败 */
const visibilityIds = computed({
  get(): string[] {
    return form.config.targets?.map((item) => item.componentId) ?? [];
  },
  set(ids: string[]): void {
    form.config.targets = ids.map((componentId) => ({ componentId, state: 'toggle' as const }));
  },
});

/** 调 API 刷新目标 id */
const apiTargetIds = computed({
  get(): string[] {
    return form.config.targetComponentIds ?? [];
  },
  set(ids: string[]): void {
    form.config.targetComponentIds = ids;
  },
});

/** 打开新建 */
function openNew(): void {
  form.id = crypto.randomUUID();
  form.name = '未命名事件';
  form.trigger = selected.value?.templateId === 'control-dropdown' ? 'change' : 'click';
  form.action = selected.value?.templateId === 'control-dropdown' ? 'callApi' : 'jumpPage';
  form.config = { targets: [], targetComponentIds: [] };
  showEv.value = true;
}

/** 编辑 */
function openEdit(ev: EventDoc): void {
  Object.assign(form, cloneJson(ev));
  showEv.value = true;
}

/** 保存事件 */
function saveEv(): void {
  if (!selected.value) {
    return;
  }
  const next = selected.value.events.filter((item) => item.id !== form.id);
  next.push(cloneJson(form));
  store.patchComponent(selected.value.id, { events: next });
  showEv.value = false;
}

/** 删除 */
function removeEv(id: string): void {
  if (!selected.value) {
    return;
  }
  store.patchComponent(selected.value.id, { events: selected.value.events.filter((item) => item.id !== id) });
}

const triggerLabel: Record<EventDoc['trigger'], string> = {
  click: '单击',
  dblclick: '双击',
  mouseenter: '鼠标进入',
  mouseleave: '鼠标离开',
  change: '值变化',
};
const actionLabel: Record<EventDoc['action'], string> = {
  jumpPage: '跳转页面',
  jumpLink: '跳转超链接',
  toggleVisibility: '显示/隐藏',
  callApi: '调用 API',
};
</script>

<template>
  <div v-if="selected && tpl?.hasEventTab" class="p-sec">
    <button class="btn btn-sm" type="button" @click="openNew">新增事件</button>
    <div v-for="ev in selected.events" :key="ev.id" class="event-card">
      <div class="ev-row"><b>名称</b>{{ ev.name }}</div>
      <div class="ev-row"><b>触发</b>{{ triggerLabel[ev.trigger] }}</div>
      <div class="ev-row"><b>动作</b>{{ actionLabel[ev.action] }}</div>
      <div class="ops">
        <button class="btn btn-ghost btn-sm" type="button" @click="openEdit(ev)">编辑</button>
        <button class="btn btn-ghost btn-sm" type="button" @click="removeEv(ev.id)">删除</button>
      </div>
    </div>
    <p v-if="!selected.events.length" class="muted">尚未配置事件。运行时（预览/展示）生效。</p>

    <el-dialog v-model="showEv" title="事件配置" width="440px">
      <el-form label-width="88px">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="触发">
          <el-select v-model="form.trigger">
            <el-option v-for="(lab, key) in triggerLabel" :key="key" :label="lab" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="动作">
          <el-select v-model="form.action">
            <el-option v-for="(lab, key) in actionLabel" :key="key" :label="lab" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.action === 'jumpPage'" label="目标页面">
          <el-select v-model="form.config.pageId">
            <el-option v-for="p in store.screen?.pages" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.action === 'jumpLink'" label="链接">
          <el-input v-model="form.config.url" />
        </el-form-item>
        <el-form-item v-if="form.action === 'toggleVisibility'" label="目标组件">
          <el-select v-model="visibilityIds" multiple placeholder="选择要控制的组件">
            <el-option v-for="c in others" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.action === 'callApi'" label="刷新组件">
          <el-select v-model="apiTargetIds" multiple placeholder="选择要刷新的组件">
            <el-option v-for="c in others" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEv = false">取消</el-button>
        <el-button type="primary" @click="saveEv">保存</el-button>
      </template>
    </el-dialog>
  </div>
  <div v-else class="p-sec muted">当前组件无交互事件</div>
</template>

<style scoped>
.event-card { border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; background: var(--panel2); margin: 10px 0; }
.ev-row { display: flex; gap: 8px; font-size: 12px; margin-bottom: 4px; }
.ev-row b { width: 42px; color: var(--t2); font-weight: 400; }
.ops { display: flex; gap: 6px; margin-top: 6px; }
</style>
