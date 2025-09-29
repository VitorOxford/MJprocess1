<template>
  <v-navigation-drawer
    :model-value="show"
    @update:model-value="$emit('update:show', $event)"
    location="right"
    width="340"
    temporary
    class="media-repository-drawer"
  >
    <div v-if="channel">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">Sobre a Conversa</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" @click="$emit('update:show', false)"></v-btn>
      </v-toolbar>

      <div class="pa-4 text-center">
        <v-avatar :image="getChannelInfo.avatar" size="80" class="mb-3"></v-avatar>
        <h3 class="text-h6">{{ getChannelInfo.name }}</h3>
        <p class="text-body-2 text-medium-emphasis">{{ getChannelInfo.role }}</p>
        <div class="d-flex align-center justify-center mt-2 text-caption">
          <div :class="['status-indicator', getChannelInfo.status]"></div>
          <span class="ml-2">{{ getChannelInfo.statusText }}</span>
        </div>
      </div>

      <v-divider></v-divider>

      <v-tabs v-model="tab" grow>
        <v-tab value="media">Mídia</v-tab>
        <v-tab value="files">Arquivos</v-tab>
      </v-tabs>

      <v-window v-model="tab" class="media-window">
        <v-window-item value="media">
          <div v-if="mediaItems.length === 0" class="empty-state">Nenhuma imagem ou vídeo.</div>
          <v-row dense class="pa-2">
            <v-col v-for="item in mediaItems" :key="item.id" cols="4">
              <v-img :src="item.content" aspect-ratio="1" cover class="rounded-lg media-thumb"></v-img>
            </v-col>
          </v-row>
        </v-window-item>
        <v-window-item value="files">
           <div v-if="fileItems.length === 0" class="empty-state">Nenhum arquivo.</div>
           <v-list class="bg-transparent">
             <v-list-item v-for="item in fileItems" :key="item.id" :href="item.content" target="_blank">
               <template #prepend>
                 <v-avatar color="primary" size="40"><v-icon>mdi-file-outline</v-icon></v-avatar>
               </template>
               <v-list-item-title class="font-weight-bold">{{ getFileName(item.content) }}</v-list-item-title>
             </v-list-item>
           </v-list>
        </v-window-item>
      </v-window>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { supabase } from '@/api/supabase';

const props = defineProps<{ show: boolean; channel: any; onlineUsers: any[] }>();
const emit = defineEmits(['update:show']);

const tab = ref('media');
const mediaItems = ref<any[]>([]);
const fileItems = ref<any[]>([]);
const loading = ref(false);

const getChannelInfo = computed(() => {
    if (!props.channel) return {};
    const info = { name: 'Canal', avatar: props.channel.icon_image_url, role: 'Grupo', status: 'offline', statusText: 'Offline' };
    if (props.channel.is_private_dm && props.channel.other_participant) {
        const participant = props.channel.other_participant;
        const onlineInfo = props.onlineUsers.find(u => u.id === participant.id);
        info.name = participant.full_name;
        info.avatar = participant.avatar_url;
        info.role = participant.role;
        info.status = onlineInfo?.status || 'offline';
        info.statusText = info.status.charAt(0).toUpperCase() + info.status.slice(1);
    }
    return info;
});

const fetchMedia = async (channelId: number) => {
    loading.value = true;
    const { data, error } = await supabase
        .from('messages')
        .select('id, content, message_type')
        .eq('channel_id', channelId)
        .in('message_type', ['image', 'video', 'audio', 'file'])
        .order('created_at', { ascending: false });

    if (!error && data) {
        mediaItems.value = data.filter(i => ['image', 'video', 'audio'].includes(i.message_type));
        fileItems.value = data.filter(i => i.message_type === 'file');
    }
    loading.value = false;
};

const getFileName = (url: string) => {
    try {
        const decodedUrl = decodeURIComponent(url);
        return decodedUrl.split('/').pop()?.split('?')[0] || 'Arquivo';
    } catch {
        return 'Arquivo';
    }
}

watch(() => props.show, (newVal) => {
    if (newVal && props.channel?.id) {
        fetchMedia(props.channel.id);
    }
});
</script>

<style scoped lang="scss">
.media-repository-drawer {
    background-color: #1A1A1A !important;
    border-left: 1px solid #2E2E2E;
}
.status-indicator {
  display: inline-block;
  width: 8px; height: 8px; border-radius: 50%;
  &.online { background-color: #4CAF50; }
  &.away { background-color: #FFC107; }
  &.offline { background-color: #757575; }
}
.media-window {
    height: calc(100vh - 280px);
    overflow-y: auto;
}
.empty-state {
    text-align: center;
    padding-top: 4rem;
    color: #757575;
}
.media-thumb {
    cursor: pointer;
}
</style>
