<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Eye, EyeOff, Info, Layers, Lock, Plug, Bot, User } from 'lucide-vue-next';
import { useUserStore } from '../../stores/user';

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const showPwd = ref(false);
const pwdError = ref(false);
const form = reactive({ username: '', password: '' });

onMounted(() => {
  document.documentElement.setAttribute('data-theme', 'light');
});

/** 提交登录 */
async function doLogin(): Promise<void> {
  if (!form.username.trim() || !form.password) {
    pwdError.value = !form.password;
    ElMessage.error('请输入用户名和密码');
    return;
  }
  loading.value = true;
  pwdError.value = false;
  try {
    await userStore.login(form.username.trim(), form.password);
    ElMessage.success('登录成功，正在进入工作台');
    await router.push('/projects');
  } catch {
    pwdError.value = true;
  } finally {
    loading.value = false;
  }
}

/** 忘记密码提示 */
function forgot(): void {
  ElMessage.info('请联系系统管理员重置密码');
}
</script>

<template>
  <div class="login-shell">
    <div class="login-left">
      <div class="login-brand">
        <span class="brand-mark">S</span><b>ScreenCraft</b><span>大屏配置平台</span>
      </div>
      <div class="login-copy">
        <h1>拖拽之间<br />让数据<em>点亮大屏</em></h1>
        <p>面向运营与技术人员的一站式大屏搭建平台：组件化编辑、API 数据接入、模板复用、一键投放展示。</p>
        <ul class="login-feats">
          <li><span class="fi"><Layers :size="16" /></span>63 个组件模板 · 图表 / 装饰 / 媒体 / 控件四大类</li>
          <li><span class="fi"><Plug :size="16" /></span>SQL 生成与外部接口双通道数据接入</li>
          <li><span class="fi"><Bot :size="16" /></span>内置 AI 客服，配置问题随问随答</li>
        </ul>
      </div>
      <div class="login-illu">
        <img src="/login_illustration.jpg" alt="ScreenCraft 大屏示意" />
      </div>
    </div>
    <div class="login-right" style="position: relative">
      <div class="login-card">
        <h2>欢迎登录</h2>
        <p class="sub">ScreenCraft 大屏配置平台 · 请使用管理员分配的账号</p>
        <div class="form-row" style="display: block">
          <label class="form-label">用户名</label>
          <div class="input-wrap">
            <User :size="15" />
            <input v-model="form.username" class="input" placeholder="请输入用户名" autocomplete="username" @keydown.enter="doLogin" />
          </div>
        </div>
        <div class="form-row" style="display: block">
          <label class="form-label">密码</label>
          <div class="input-wrap">
            <Lock :size="15" />
            <input
              v-model="form.password"
              class="input"
              :class="{ 'is-err': pwdError }"
              :type="showPwd ? 'text' : 'password'"
              placeholder="请输入密码"
              autocomplete="current-password"
              @keydown.enter="doLogin"
            />
            <button class="pwd-toggle" type="button" title="显示/隐藏密码" @click="showPwd = !showPwd">
              <EyeOff v-if="showPwd" :size="15" />
              <Eye v-else :size="15" />
            </button>
          </div>
        </div>
        <div class="login-line">
          <span class="muted">账号由管理员创建</span>
          <a href="javascript:void(0)" @click="forgot">忘记密码？</a>
        </div>
        <button class="btn btn-pri btn-login" type="button" :disabled="loading" @click="doLogin">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        <div class="demo-tip">
          <Info :size="14" />
          <span>演示账号：<b>admin</b> / <b>ScreenCraft@2026</b>（首次登录需强制修改密码）</span>
        </div>
      </div>
      <div class="login-foot">ScreenCraft v1.0 · 账号由管理员统一创建，不支持自助注册</div>
    </div>
  </div>
</template>
