import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from '../api/http';
import { useUserStore } from '../stores/user';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/login/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      redirect: '/projects',
    },
    {
      path: '/projects',
      name: 'projects',
      component: () => import('../views/projects/ProjectsView.vue'),
    },
    {
      path: '/projects/:projectId/screens',
      name: 'screens',
      component: () => import('../views/screens/ScreensView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/admin/AdminView.vue'),
      meta: { admin: true },
    },
    {
      path: '/api-configs',
      name: 'api-configs',
      component: () => import('../views/api-config/ApiConfigView.vue'),
      meta: { admin: true },
    },
    {
      path: '/editor/:id',
      name: 'editor',
      component: () => import('../views/editor/EditorView.vue'),
    },
    {
      path: '/preview/:id',
      name: 'preview',
      component: () => import('../views/preview/PreviewView.vue'),
    },
    {
      path: '/display/:id',
      name: 'display',
      component: () => import('../views/display/DisplayView.vue'),
    },
  ],
});

router.beforeEach(async (to) => {
  const token = getToken();
  if (to.meta.public) {
    if (token && to.path === '/login') {
      return '/projects';
    }
    return true;
  }
  if (!token) {
    return '/login';
  }
  const userStore = useUserStore();
  if (!userStore.user) {
    try {
      await userStore.hydrate();
    } catch {
      userStore.logout();
      return '/login';
    }
  }
  if (to.meta.admin && !userStore.isAdmin) {
    return '/projects';
  }
  return true;
});

export default router;
