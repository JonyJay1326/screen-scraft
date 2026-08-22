<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChevronDown, Folder, LogOut, Settings } from 'lucide-vue-next';
import { useUserStore } from '../../stores/user';

const props = defineProps<{ nav?: 'projects' | 'api-config' | 'admin' }>();
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const active = computed(() => props.nav ?? 'projects');
const displayName = computed(() => (userStore.isAdmin ? '管理员' : userStore.user?.username ?? '成员'));
const avatarText = computed(() => displayName.value.slice(0, 1));

/** 退出登录 */
function logout(): void {
  userStore.logout();
  void router.push('/login');
}
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <RouterLink class="brand" to="/projects">
        <span class="brand-mark">S</span>
        <span class="brand-name">ScreenCraft</span>
        <span class="brand-sub">大屏配置平台</span>
      </RouterLink>
      <nav class="topnav">
        <RouterLink data-nav="projects" to="/projects" :class="{ active: active === 'projects' || route.path.startsWith('/projects') }">
          <Folder :size="16" />项目
        </RouterLink>
        <RouterLink v-if="userStore.isAdmin" data-nav="admin" to="/admin" :class="{ active: active === 'admin' }">
          <Settings :size="16" />管理后台
        </RouterLink>
      </nav>
      <div class="topbar-right">
        <div class="user-chip">
          <span class="avatar">{{ avatarText }}</span>
          <span class="user-name">{{ displayName }}</span>
          <ChevronDown :size="14" />
          <div class="dropdown-menu">
            <RouterLink v-if="userStore.isAdmin" to="/admin"><Settings :size="14" />管理后台</RouterLink>
            <a href="javascript:void(0)" @click="logout"><LogOut :size="14" />退出登录</a>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
