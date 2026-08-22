<script setup lang="ts">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useUserStore } from '../../stores/user';

const userStore = useUserStore();
const saving = ref(false);
const form = reactive({ oldPassword: '', newPassword: '', confirm: '' });

/** 提交改密 */
async function submit(): Promise<void> {
  if (form.newPassword.length < 8) {
    ElMessage.error('新密码至少 8 位');
    return;
  }
  if (form.newPassword !== form.confirm) {
    ElMessage.error('两次输入的新密码不一致');
    return;
  }
  saving.value = true;
  try {
    await userStore.changePassword(form.oldPassword, form.newPassword);
    ElMessage.success('密码已更新，请使用新密码');
    form.oldPassword = '';
    form.newPassword = '';
    form.confirm = '';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="userStore.mustChangePassword"
    title="首次登录请修改密码"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    width="420px"
  >
    <p class="hint">为保障账号安全，首次登录或管理员重置后必须修改密码，旧密码将立即失效。</p>
    <el-form label-width="96px">
      <el-form-item label="原密码">
        <el-input v-model="form.oldPassword" type="password" show-password autocomplete="current-password" />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="form.newPassword" type="password" show-password autocomplete="new-password" />
      </el-form-item>
      <el-form-item label="确认新密码">
        <el-input v-model="form.confirm" type="password" show-password autocomplete="new-password" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" :loading="saving" @click="submit">确认修改</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.hint {
  font-size: 13px;
  color: #909399;
  margin: 0 0 16px;
  line-height: 1.7;
}
</style>
