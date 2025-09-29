<template>
  <aside class="chat-sidebar" :class="{ 'is-mobile-hidden': isMobile && isChatActive }">
    <header class="sidebar-header">
      <h2 class="font-weight-bold">Conversas</h2>
       <v-menu location="bottom end">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon="mdi-plus" variant="text"></v-btn>
        </template>
        <v-list density="compact" class="menu-list-styling">
          <v-list-item @click="$emit('open-new-chat-modal', 'dm')" prepend-icon="mdi-account-plus-outline">
            <v-list-item-title>Nova Conversa</v-list-item-title>
          </v-list-item>
          <v-list-item @click="$emit('open-new-chat-modal', 'group')" prepend-icon="mdi-account-group-outline">
            <v-list-item-title>Novo Grupo</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </header>

    <div class="px-3 py-2">
      <v-text-field
        v-model="search"
        placeholder="Buscar..."
        variant="solo-filled"
        flat
        dense
        hide-details
        prepend-inner-icon="mdi-magnify"
        class="search-bar"
      ></v-text-field>
    </div>

    <v-list nav class="bg-transparent channel-list pa-0">
      <template v-for="channel in filteredChannels" :key="channel.id">
        <v-list-item
          @click="$emit('select-channel', channel.id)"
          :active="channel.id === activeChannelId"
          class="channel-item"
          :class="{ 'pinned': channel.is_pinned }"
        >
          <template v-slot:prepend>
            <v-avatar :image="channel.icon_image_url" size="48" class="mr-3"></v-avatar>
          </template>

          <div class="item-content-wrapper">
            <div class="item-header">
              <v-list-item-title class="font-weight-bold item-title">
                <v-icon v-if="channel.is_muted" size="x-small" class="mr-1">mdi-bell-off-outline</v-icon>
                {{ channel.name || 'Canal sem nome' }}
              </v-list-item-title>
              <span class="text-caption text-grey-lighten-1">{{ formatTimestamp(channel.last_message_at) }}</span>
            </div>
            <div class="item-subheader">
              <v-list-item-subtitle class="last-message-preview" :class="{ 'font-weight-bold text-white': channel.unread_count > 0 }">
                {{ channel.last_message_content || 'Nenhuma mensagem.' }}
              </v-list-item-subtitle>
              <div class="append-actions">
                 <v-icon v-if="channel.is_pinned" size="small" color="grey-lighten-1" class="mr-2">mdi-pin</v-icon>
                 <v-badge
                  v-if="channel.unread_count > 0"
                  color="error"
                  :content="channel.unread_count"
                  inline
                  class="mr-2"
                ></v-badge>
                <v-menu location="start">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" class="channel-menu-btn" @click.stop></v-btn>
                  </template>
                  <v-list density="compact" class="menu-list-styling">
                    <v-list-item @click.stop="handleChannelAction('pin', channel)" :prepend-icon="channel.is_pinned ? 'mdi-pin-off-outline' : 'mdi-pin-outline'"><v-list-item-title>{{ channel.is_pinned ? 'Desafixar' : 'Fixar' }}</v-list-item-title></v-list-item>
                    <v-list-item @click.stop="handleChannelAction('mute', channel)" :prepend-icon="channel.is_muted ? 'mdi-bell-outline' : 'mdi-bell-off-outline'"><v-list-item-title>{{ channel.is_muted ? 'Reativar som' : 'Silenciar' }}</v-list-item-title></v-list-item>
                    <v-list-item @click.stop="handleChannelAction('delete', channel)" prepend-icon="mdi-delete-outline" base-color="error"><v-list-item-title>Excluir</v-list-item-title></v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </div>
          </div>
        </v-list-item>
        <v-divider class="mx-4"></v-divider>
      </template>
    </v-list>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

const props = defineProps<{
  channels: any[];
  activeChannelId: number | null;
  isMobile: boolean;
  isChatActive: boolean;
}>();
const emit = defineEmits(['select-channel', 'open-new-chat-modal', 'channel-action']);

const search = ref('');

const filteredChannels = computed(() => {
    if (!search.value) return props.channels;
    return props.channels.filter(c => c.name?.toLowerCase().includes(search.value.toLowerCase()));
});

const handleChannelAction = (action: 'pin' | 'mute' | 'delete', channel: any) => {
    emit('channel-action', { action, channel });
}

const formatTimestamp = (timestamp: string | null): string => {
  if (!timestamp) return '';
  const date = parseISO(timestamp);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Ontem';
  return format(date, 'dd/MM/yy');
}
</script>

<style lang="scss" scoped>
.chat-sidebar {
  width: 320px;
  background-color: rgba(30, 30, 30, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: transform 0.3s ease-in-out;
}
.sidebar-header {
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.search-bar :deep(.v-field) {
    border-radius: 20px !important;
}
.channel-list {
  overflow-y: auto;
  flex-grow: 1;
}
.channel-item {
  padding: 12px 16px !important;
  min-height: 72px;

  &.pinned {
    background-color: rgba(255, 255, 255, 0.03);
  }

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &.v-list-item--active {
    background-color: rgba(var(--v-theme-primary), 0.2) !important;
  }

  .item-content-wrapper { width: 100%; overflow: hidden; }
  .item-header, .item-subheader { display: flex; justify-content: space-between; align-items: center; width: 100%; }
  .item-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .last-message-preview { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-grow: 1; }
  .append-actions { display: flex; align-items: center; flex-shrink: 0; }
  .channel-menu-btn { opacity: 0; }
  &:hover .channel-menu-btn, &.v-list-item--active .channel-menu-btn { opacity: 1; }
}

.menu-list-styling {
  background-color: rgba(45, 45, 50, 0.9) !important;
  backdrop-filter: blur(10px);
}

// Mobile specific styles
@media (max-width: 960px) {
  .chat-sidebar {
    position: absolute;
    width: 100%;
    z-index: 10;
    transform: translateX(-100%);
    &.is-mobile-visible {
      transform: translateX(0);
    }
  }
}
</style>
