<template>
  <v-toolbar density="compact" color="rgba(30, 30, 30, 0.7)" class="chat-header">
    <v-btn v-if="isMobile" icon="mdi-arrow-left" variant="text" class="mr-2" @click="$emit('back')"></v-btn>

    <template v-if="!isSearchActive">
      <div v-if="channel" class="d-flex align-center" style="min-width: 0;">
        <v-avatar :image="getChannelAvatar(channel)" size="40" class="mr-3"></v-avatar>
        <div style="min-width: 0;">
          <h3 class="font-weight-bold text-body-1 text-truncate">{{ getChannelName(channel) }}</h3>
          <p class="text-caption text-medium-emphasis">{{ getStatusText }}</p>
        </div>
      </div>
      <v-spacer></v-spacer>
    </template>

    <template v-else>
       <v-text-field
        :model-value="searchQuery"
        @update:model-value="$emit('update:searchQuery', $event)"
        placeholder="Buscar na conversa..."
        variant="solo"
        flat
        dense
        hide-details
        autofocus
        prepend-inner-icon="mdi-magnify"
        class="search-input"
      ></v-text-field>
    </template>

    <div class="header-actions">
      <v-btn v-if="!isSearchActive" icon="mdi-magnify" variant="text" @click="isSearchActive = true"></v-btn>
      <v-btn v-else icon="mdi-close" variant="text" @click="closeSearch"></v-btn>

      <v-btn variant="text" @click="$emit('toggle-repository')" icon>
        <v-icon>mdi-information-outline</v-icon>
        <v-tooltip activator="parent" location="bottom">Mídia e Arquivos</v-tooltip>
      </v-btn>
    </div>
  </v-toolbar>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  channel: any;
  onlineUsers: any[];
  isMobile: boolean;
  searchQuery: string;
}>();
const emit = defineEmits(['toggle-repository', 'back', 'update:searchQuery']);

const isSearchActive = ref(false);

const closeSearch = () => {
    isSearchActive.value = false;
    emit('update:searchQuery', '');
};

const getChannelName = (channel: any) => {
  if (channel.is_private_dm && channel.other_participant) {
    return channel.other_participant.full_name;
  }
  return channel.name || 'Canal';
};

const getChannelAvatar = (channel: any) => {
  if (channel.is_private_dm && channel.other_participant) {
    return channel.other_participant.avatar_url;
  }
  return channel.icon_image_url;
};

const getStatusText = computed(() => {
    if (!props.channel) return '';
    if (!props.channel.is_private_dm) return 'Grupo';
    const participant = props.channel.other_participant;
    if(!participant) return 'Grupo';
    const onlineInfo = props.onlineUsers.find(u => u.id === participant.id);
    const status = onlineInfo?.status || 'offline';
    return status.charAt(0).toUpperCase() + status.slice(1);
});
</script>

<style scoped lang="scss">
.chat-header {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  padding: 0 8px;
}
.header-actions {
    display: flex;
    align-items: center;
    gap: 4px;
}
.search-input {
    :deep(.v-field) {
        background-color: rgba(255,255,255,0.1) !important;
        box-shadow: none !important;
    }
}
</style>
