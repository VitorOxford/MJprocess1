<template>
  <header class="chat-header">
    <div class="d-flex align-center">
      <v-avatar :image="getChannelAvatar(channel)" size="40" class="mr-4"></v-avatar>
      <h3 class="font-weight-bold">{{ getChannelName(channel) }}</h3>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';
const props = defineProps<{ channel: any }>();
const userStore = useUserStore();

const getChannelName = (channel) => {
  if (channel.is_private_dm && channel.other_participant) {
    return channel.other_participant.full_name;
  }
  return channel.name || 'Canal';
};

const getChannelAvatar = (channel) => {
  if (channel.is_private_dm && channel.other_participant) {
    return channel.other_participant.avatar_url;
  }
  return channel.icon_image_url;
};
</script>

<style scoped>
.chat-header {
  padding: 16px;
  background-color: #1E1E1E;
  border-bottom: 1px solid #2E2E2E;
  flex-shrink: 0;
}
</style>
