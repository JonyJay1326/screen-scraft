<script setup lang="ts">
import { ref } from 'vue';
import { Bot, Send, X } from 'lucide-vue-next';
import { chatAi } from '../../api/runtime';

const open = ref(false);
const input = ref('');
const sessionId = crypto.randomUUID();
const msgs = ref<{ role: 'bot' | 'me'; text: string }[]>([
  { role: 'bot', text: '你好，我是 ScreenCraft 智能客服。关于组件使用、数据绑定、事件联动的问题都可以问我。' },
]);

/** 发送 */
async function send(text?: string): Promise<void> {
  const q = (text ?? input.value).trim();
  if (!q) {
    return;
  }
  msgs.value.push({ role: 'me', text: q });
  input.value = '';
  try {
    const { answer } = await chatAi(q, sessionId);
    msgs.value.push({ role: 'bot', text: answer });
  } catch {
    msgs.value.push({ role: 'bot', text: '暂时无法回答，请稍后重试。' });
  }
}
</script>

<template>
  <button class="ai-fab" type="button" title="AI 客服" @click="open = !open"><Bot :size="22" /></button>
  <div v-if="open" class="ai-drawer show">
    <div class="ai-head">
      <span class="dot" />AI 客服<span class="muted" style="font-weight:400;font-size:12px">基于知识库问答</span>
      <button class="x" type="button" style="margin-left:auto" @click="open = false"><X :size="15" /></button>
    </div>
    <div class="ai-msgs">
      <div v-for="(m, i) in msgs" :key="i" class="ai-msg" :class="m.role">{{ m.text }}</div>
    </div>
    <div class="ai-chips">
      <button type="button" @click="send('如何添加图表组件？')">如何添加图表？</button>
      <button type="button" @click="send('下拉框如何联动其他组件？')">下拉框联动</button>
      <button type="button" @click="send('如何保存为模板？')">保存模板</button>
    </div>
    <div class="ai-input">
      <input v-model="input" class="input input-sm" placeholder="输入问题，Enter 发送" @keydown.enter="send()" />
      <button class="btn btn-pri btn-sm" type="button" @click="send()"><Send :size="14" /></button>
    </div>
  </div>
</template>
