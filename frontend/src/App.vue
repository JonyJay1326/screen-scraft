<script setup lang="ts">
import { useRoute } from 'vue-router';
import ChangePasswordDialog from './components/ui/ChangePasswordDialog.vue';

const route = useRoute();
</script>

<template>
  <router-view />
  <ChangePasswordDialog v-if="route.path !== '/login'" />
</template>
