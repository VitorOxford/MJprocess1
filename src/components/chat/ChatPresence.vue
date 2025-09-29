<template>
  <div class="presence-sidebar" :class="{ 'is-expanded': isExpanded }" @mouseenter="isExpanded = true" @mouseleave="isExpanded = false">
    <div class="inner-content">
      <v-list class="bg-transparent pa-2">
        <v-list-item
          v-for="user in users"
          :key="user.id"
          class="user-item"
          @click="$emit('start-dm', user)"
        >
          <template #prepend>
            <v-avatar size="36" class="user-avatar">
              <v-img :src="user.avatar_url" :alt="user.full_name"></v-img>
              <div :class="['status-indicator', user.status || 'offline']"></div>
            </v-avatar>
          </template>
          <div v-if="isExpanded" class="user-details">
            <v-list-item-title class="font-weight-bold">{{ user.full_name }}</v-list-item-title>
            <v-list-item-subtitle class="text-caption">{{ user.role }}</v-list-item-subtitle>
          </div>
        </v-list-item>
      </v-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  users: any[];
}>();

defineEmits(['start-dm']);

const isExpanded = ref(false);
</script>

<style scoped lang="scss">
.presence-sidebar {
  width: 64px;
  background-color: rgba(30, 30, 30, 0.85);
  backdrop-filter: blur(10px);
  border-left: 1px solid #2E2E2E;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &.is-expanded {
    width: 280px;
    overflow-y: auto;
  }
}

.inner-content { width: 100%; }
.is-expanded::-webkit-scrollbar { width: 6px; }
.is-expanded::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.2); border-radius: 3px; }
.is-expanded::-webkit-scrollbar-track { background: transparent; }

.user-item {
  cursor: pointer;
  padding: 8px !important;
  transition: background-color 0.2s;
  min-height: 52px;

  &:hover { background-color: rgba(255, 255, 255, 0.1); }
}

/* CORREÇÃO APLICADA: Força o arredondamento usando :deep para penetrar nos estilos do Vuetify */
:deep(.user-avatar .v-img__img) {
  border-radius: 50%;
}

.user-avatar {
  position: relative;
  overflow: visible;
}

.status-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid #1e1e1e;

  &.online { background-color: #4CAF50; }
  &.away { background-color: #FFC107; }
  &.offline { background-color: #757575; }
}

.user-details {
  opacity: 0;
  transform: translateX(-10px);
  transition: opacity 0.3s 0.1s, transform 0.3s 0.1s;
  white-space: nowrap;
}

.is-expanded .user-details {
  opacity: 1;
  transform: translateX(0);
}
</style>
