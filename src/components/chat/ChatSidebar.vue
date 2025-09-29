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
          lines="two"
        >
          <template v-slot:prepend>
            <v-avatar :image="channel.icon_image_url" size="40"></v-avatar>
          </template>
          <v-list-item-title class="font-weight-medium">{{ channel.name || 'Canal sem nome' }}</v-list-item-title>

          <v-list-item-subtitle class="last-message-preview" :class="{ 'font-weight-bold text-white': channel.unread_count > 0 }">
            {{ channel.last_message_content || 'Nenhuma mensagem ainda.' }}
          </v-list-item-subtitle>

          <template v-slot:append>
            <v-badge
              v-if="channel.unread_count > 0"
              color="error"
              :content="channel.unread_count"
              inline
            ></v-badge>
          </template>
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
.last-message-preview {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
</style>
