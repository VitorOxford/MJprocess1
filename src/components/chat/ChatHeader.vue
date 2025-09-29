<template>
  <header class="chat-header">
    <div v-if="channel" class="d-flex align-center">
      <v-avatar :image="getChannelAvatar(channel)" size="40" class="mr-3"></v-avatar>
      <div>
        <h3 class="font-weight-bold">{{ getChannelName(channel) }}</h3>
        <p class="text-caption text-medium-emphasis">{{ getStatusText }}</p>
      </div>
    </div>
    <v-spacer></v-spacer>
    <div class="header-actions">
        <v-btn icon="mdi-video-outline" variant="text"></v-btn>
        <v-btn icon="mdi-magnify" variant="text"></v-btn>
        <v-btn icon="mdi-information-outline" variant="text" @click="$emit('toggle-repository')"></v-btn>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ channel: any; onlineUsers: any[] }>();
defineEmits(['toggle-repository']);

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

const getStatusText = computed(() => {
    if (!props.channel || !props.channel.is_private_dm) return 'Grupo';
    const participant = props.channel.other_participant;
    const onlineInfo = props.onlineUsers.find(u => u.id === participant.id);
    const status = onlineInfo?.status || 'offline';
    return status.charAt(0).toUpperCase() + status.slice(1);
});
</script>

<style scoped lang="scss">
.chat-header {
  padding: 12px 16px;
  background-color: #1E1E1E;
  border-bottom: 1px solid #2E2E2E;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
</style>
