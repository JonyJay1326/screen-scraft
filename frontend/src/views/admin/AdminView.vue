<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { User as UserIcon } from 'lucide-vue-next';
import type { UserDoc } from '@screencraft/shared';
import AppTopbar from '../../components/ui/AppTopbar.vue';
import { createUserApi, fetchUsers, resetPasswordApi, setUserStatusApi } from '../../api/users';

const users = ref<UserDoc[]>([]);
const creating = ref(false);
const createVisible = ref(false);
const resetVisible = ref(false);
const resetTarget = ref<UserDoc | null>(null);
const createForm = reactive({ username: '', password: '', role: 'member' as 'admin' | 'member' });
const resetForm = reactive({ password: '' });

onMounted(() => {
  document.documentElement.setAttribute('data-theme', 'light');
  void load();
});

/** 加载用户列表 */
async function load(): Promise<void> {
  users.value = await fetchUsers();
}

/** 角色中文 */
function roleLabel(role: UserDoc['role']): string {
  return role === 'admin' ? '管理员' : '普通成员';
}

/** 提交新建 */
async function submitCreate(): Promise<void> {
  if (!createForm.username.trim() || createForm.password.length < 8) {
    ElMessage.error('请填写用户名，密码至少 8 位');
    return;
  }
  creating.value = true;
  try {
    await createUserApi({
      username: createForm.username.trim(),
      password: createForm.password,
      role: createForm.role,
    });
    ElMessage.success('已创建，该账号首次登录需改密');
    createVisible.value = false;
    createForm.username = '';
    createForm.password = '';
    createForm.role = 'member';
    await load();
  } finally {
    creating.value = false;
  }
}

/** 打开重置弹窗 */
function openReset(row: UserDoc): void {
  resetTarget.value = row;
  resetForm.password = '';
  resetVisible.value = true;
}

/** 提交重置密码 */
async function submitReset(): Promise<void> {
  if (!resetTarget.value || resetForm.password.length < 8) {
    ElMessage.error('新密码至少 8 位');
    return;
  }
  await resetPasswordApi(resetTarget.value._id, resetForm.password);
  ElMessage.success('密码已重置，对方下次登录需再改密');
  resetVisible.value = false;
}

/** 切换启用状态 */
async function toggleStatus(row: UserDoc): Promise<void> {
  const next = !row.enabled;
  const action = next ? '启用' : '禁用';
  await ElMessageBox.confirm(`确定${action}账号「${row.username}」？`, '请确认', { type: 'warning' });
  await setUserStatusApi(row._id, next);
  ElMessage.success(`已${action}`);
  await load();
}

/** 格式化时间 */
function formatTime(iso: string): string {
  return iso.replace('T', ' ').slice(0, 16);
}
</script>

<template>
  <div>
    <AppTopbar nav="admin" />
    <main class="app-content">
      <div class="page-head">
        <div>
          <h1>管理后台</h1>
          <div class="desc">仅管理员可见：用户管理与 AI 客服配置</div>
        </div>
      </div>
      <div class="tabs">
        <button class="tab active" type="button">用户管理</button>
        <button class="tab" type="button" disabled title="M8 实现">AI 设置</button>
      </div>
      <div class="toolbar-row">
        <span class="muted">共 <b class="num">{{ users.length }}</b> 位用户</span>
        <button class="btn btn-pri" type="button" @click="createVisible = true"><UserIcon :size="15" />新建用户</button>
      </div>
      <div class="card">
        <table class="table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>角色</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in users" :key="row._id">
              <td>{{ row.username }}</td>
              <td>{{ roleLabel(row.role) }}</td>
              <td>
                <span class="tag" :class="row.enabled ? 'tag-ok' : 'tag-err'">{{ row.enabled ? '启用' : '禁用' }}</span>
              </td>
              <td class="muted">{{ formatTime(row.createdAt) }}</td>
              <td>
                <div class="row-ops">
                  <button class="btn btn-ghost" type="button" @click="openReset(row)">重置密码</button>
                  <button class="btn btn-ghost" type="button" @click="toggleStatus(row)">{{ row.enabled ? '禁用' : '启用' }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <el-dialog v-model="createVisible" title="新建用户" width="440px">
      <el-form label-width="88px">
        <el-form-item label="用户名">
          <el-input v-model="createForm.username" maxlength="20" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="createForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="createForm.role">
            <el-option label="普通成员" value="member" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="submitCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetVisible" title="重置密码" width="440px">
      <p class="muted">将重置「{{ resetTarget?.username }}」的密码，并强制其下次登录改密。</p>
      <el-form label-width="88px" class="mt-16">
        <el-form-item label="新密码">
          <el-input v-model="resetForm.password" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReset">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0 12px;
}
</style>
