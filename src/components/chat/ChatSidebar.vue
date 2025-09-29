<template>
  <aside class="chat-sidebar">
    <header class="sidebar-header">
      <h2 class="font-weight-bold">Conversas</h2>
      <v-btn icon="mdi-plus" variant="text" @click="newConversationModal = true"></v-btn>
    </header>

    <div class="channel-list">
      <v-list nav class="bg-transparent">
        <v-list-item
          v-for="channel in channels"
          :key="channel.id"
          @click="$emit('select-channel', channel.id)"
          :active="channel.id === activeChannelId"
          class="channel-item"
        >
          <template v-slot:prepend>
            <v-avatar :image="getChannelAvatar(channel)" size="40"></v-avatar>
          </template>
          <v-list-item-title class="font-weight-medium">{{ getChannelName(channel) }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </div>

    <NewConversationModal v-model="newConversationModal" @conversation-started="handleConversationStart" />
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import NewConversationModal from './NewConversationModal.vue';

defineProps<{
  channels: any[];
  activeChannelId: number | null;
}>();
const emit = defineEmits(['select-channel']);

const newConversationModal = ref(false);

const getChannelName = (channel: any) => {
  if (channel.is_private_dm && channel.other_participant) {
    return channel.other_participant.full_name;
  }
  return channel.name || 'Canal sem nome';
};

const getChannelAvatar = (channel: any) => {
  if (channel.is_private_dm && channel.other_participant) {
    return channel.other_participant.avatar_url;
  }
  return channel.icon_image_url;
};

const handleConversationStart = (channelId: number) => {
    emit('select-channel', channelId);
    newConversationModal.value = false;
};
</script>

<style lang="scss" scoped>
.chat-sidebar {
  width: 320px;
  background-color: #1E1E1E;
  border-right: 1px solid #2E2E2E;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.sidebar-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #2E2E2E;
}
.channel-list {
  overflow-y: auto;
  flex-grow: 1;
}
.channel-item {
  margin: 8px;
  border-radius: 8px;
}
</style>
