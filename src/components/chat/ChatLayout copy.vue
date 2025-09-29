<template>
  <div class="chat-layout">
    <ChatSidebar :channels="channels" :active-channel-id="activeChannelId" @select-channel="setActiveChannel" />

    <main class="chat-main">
      <div v-if="loadingChannel" class="loading-container">
        <v-progress-circular indeterminate color="primary" />
      </div>

      <div v-else-if="activeChannel" class="messages-container">
        <ChatHeader :channel="activeChannel" :online-users="allUsersWithStatus" @toggle-repository="showRepository = !showRepository"/>
        <div ref="messagesList" class="messages-list">
          <template v-for="(group, index) in groupedMessages" :key="index">
            <div class="date-divider"><span>{{ group.date }}</span></div>
            <ChatMessage
              v-for="message in group.messages"
              :key="message.id"
              :message="message"
              @show-menu="onShowMenu"
            />
          </template>
        </div>
        <div class="message-input-area">
          <v-btn icon="mdi-paperclip" variant="text" @click="triggerFileInput"></v-btn>
          <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none" />

          <v-textarea
            v-model="newMessage"
            @keydown.enter.prevent="sendMessage()"
            variant="solo"
            flat
            placeholder="Digite uma mensagem"
            rows="1"
            auto-grow
            hide-details
            class="message-input"
          ></v-textarea>
          <v-btn icon="mdi-send" color="primary" elevation="2" @click="sendMessage()" :disabled="!newMessage.trim()" class="ml-2 send-button"></v-btn>
        </div>
      </div>

      <div v-else class="no-channel-selected">
        <v-icon size="64" class="mb-4">mdi-forum-outline</v-icon>
        <h2>Selecione uma conversa</h2>
        <p class="text-medium-emphasis">Escolha um canal ou uma mensagem direta para começar a conversar.</p>
      </div>
    </main>

    <ChatPresence :users="allUsersWithStatus" @start-dm="startDirectMessage" />
    <MediaRepository v-model:show="showRepository" :channel="activeChannel" :online-users="allUsersWithStatus" />
    <MessageMenu
      :show="menu.show"
      :x="menu.x"
      :y="menu.y"
      :is-my-message="menu.isMyMessage"
      @update:show="menu.show = $event"
      @action="handleMenuAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed, reactive } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { useChatStore } from '@/stores/chat';
import ChatSidebar from './ChatSidebar.vue';
import ChatMessage from './ChatMessage.vue';
import ChatHeader from './ChatHeader.vue';
import ChatPresence from './ChatPresence.vue';
import MediaRepository from './MediaRepository.vue';
import MessageMenu from './MessageMenu.vue';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const userStore = useUserStore();
const chatStore = useChatStore();
const channels = ref<any[]>([]);
const activeChannelId = ref<number | null>(null);
const messages = ref<any[]>([]);
const newMessage = ref('');
const messagesList = ref<HTMLElement | null>(null);
const loadingChannel = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const showRepository = ref(false);

const allUsersWithStatus = ref<any[]>([]);
let presenceChannel: RealtimeChannel | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let inactivityTimer: number;

const menu = reactive({ show: false, x: 0, y: 0, message: null as any | null, isMyMessage: false });

const activeChannel = computed(() => channels.value.find(c => c.id === activeChannelId.value));

const groupedMessages = computed(() => {
    if (!messages.value.length) return [];
    const groups: { date: string; messages: any[] }[] = [];
    let lastDate = '';

    messages.value.forEach(msg => {
        if (msg.is_deleted) return;
        const date = new Date(msg.created_at);
        let formattedDate: string;
        if (isToday(date)) formattedDate = 'Hoje';
        else if (isYesterday(date)) formattedDate = 'Ontem';
        else formattedDate = format(date, "d 'de' MMMM", { locale: ptBR });

        if (formattedDate !== lastDate) {
            groups.push({ date: formattedDate, messages: [] });
            lastDate = formattedDate;
        }
        groups[groups.length - 1].messages.push(msg);
    });
    return groups;
});

const fetchAllUsersWithStatus = async () => {
  if (!userStore.profile?.id) return;
  const { data, error } = await supabase.rpc('get_all_users_with_status', { p_exclude_user_id: userStore.profile.id });
  if (error) console.error("Erro ao buscar lista de usuários:", error);
  else allUsersWithStatus.value = data;
};

const fetchChannels = async () => {
  const { data, error } = await supabase.rpc('get_my_channels_with_unread_and_preview');
  if (error) {
    console.error('Erro ao buscar canais:', error);
  } else {
    channels.value = data;
    const totalUnread = data.reduce((sum: number, ch: any) => sum + (ch.unread_count || 0), 0);
    chatStore.setTotalUnreadCount(totalUnread);
  }
};

const fetchMessages = async (channelId: number) => {
  messages.value = [];
  loadingChannel.value = true;
  const { data, error } = await supabase.from('messages').select('*, profile:profiles(id, full_name, avatar_url)').eq('channel_id', channelId).order('created_at', { ascending: true });
  if (error) console.error('Erro ao buscar mensagens:', error);
  else messages.value = data.filter(m => !m.is_deleted);
  loadingChannel.value = false;
  await supabase.rpc('update_last_read', { p_channel_id: channelId });
  await fetchChannels();
};

const scrollToBottom = () => nextTick(() => {
    if (messagesList.value) messagesList.value.scrollTop = messagesList.value.scrollHeight;
});

const setActiveChannel = (channelId: number) => {
  if (activeChannelId.value === channelId || !channelId) return;
  activeChannelId.value = channelId;
  showRepository.value = false;
  fetchMessages(channelId);
};

const startDirectMessage = async (user: any) => {
  if (!userStore.profile) return;
  const { data, error } = await supabase.rpc('find_or_create_dm_channel', { p_user1_id: userStore.profile.id, p_user2_id: user.id });
  if (error) {
    console.error('Erro ao iniciar DM:', error);
  } else {
    await fetchChannels();
    setActiveChannel(data);
  }
};

const sendMessage = async (contentOverride: any = null, messageType: string = 'text') => {
  if (typeof contentOverride === 'object' && contentOverride !== null) {
      contentOverride = null;
  }
  const content = contentOverride || newMessage.value.trim();
  if (!content || !activeChannelId.value || !userStore.profile) return;
  if (messageType === 'text') newMessage.value = '';
  await supabase.from('messages').insert({ content, channel_id: activeChannelId.value, profile_id: userStore.profile.id, message_type: messageType });
};

const triggerFileInput = () => fileInput.value?.click();

const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !activeChannelId.value) return;
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `channel_${activeChannelId.value}/${fileName}`;
    const { data, error } = await supabase.storage.from('media').upload(filePath, file);
    if (error) { console.error("Erro no upload:", error); return; }
    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
    let messageType = 'file';
    if (file.type.startsWith('image/')) messageType = 'image';
    if (file.type.startsWith('audio/')) messageType = 'audio';
    if (file.type.startsWith('video/')) messageType = 'video';
    await sendMessage(publicUrl, messageType);
};

const setupRealtimeListeners = () => {
  if (realtimeChannel || !userStore.profile) return;
  realtimeChannel = supabase.channel('mjprocess-realtime');

  realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
    const { data: member } = await supabase.from('channel_members').select('channel_id').eq('channel_id', (payload.new as any)?.channel_id || (payload.old as any)?.id).eq('profile_id', userStore.profile?.id).single();
    if (member) {
        if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as any;
            if (newMessage.channel_id === activeChannelId.value) {
                const { data: profileData } = await supabase.from('profiles').select('*').eq('id', newMessage.profile_id).single();
                if (profileData) messages.value.push({ ...newMessage, profile: profileData });
                await supabase.rpc('update_last_read', { p_channel_id: newMessage.channel_id });
            } else if (newMessage.profile_id !== userStore.profile?.id) {
                chatStore.playNotificationSound();
            }
        }
        if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as any;
            if (updatedMessage.is_deleted) {
                messages.value = messages.value.filter(m => m.id !== updatedMessage.id);
            }
        }
        await fetchChannels();
    }
  });

  presenceChannel = supabase.channel('online-users', { config: { presence: { key: userStore.profile.id } } });
  const updatePresenceList = () => {
    const presenceState = presenceChannel?.presenceState();
    if (!presenceState) return;
    allUsersWithStatus.value = allUsersWithStatus.value.map(user => {
      const presences = presenceState[user.id];
      const newStatus = (presences && presences.length > 0) ? (presences[0] as any).status : 'offline';
      return { ...user, status: newStatus };
    }).sort((a, b) => {
      const statusOrder = { online: 1, away: 2, offline: 3 };
      return (statusOrder[a.status as keyof typeof statusOrder] || 3) - (statusOrder[b.status as keyof typeof statusOrder] || 3);
    });
  };
  presenceChannel.on('presence', { event: 'sync' }, updatePresenceList);
  presenceChannel.on('presence', { event: 'join' }, updatePresenceList);
  presenceChannel.on('presence', { event: 'leave' }, updatePresenceList);
  presenceChannel.subscribe(async (status) => { if (status === 'SUBSCRIBED') await updateStatus('online'); });

  realtimeChannel.subscribe();
};

const onShowMenu = ({ event, message }: { event: MouseEvent, message: any }) => {
    menu.show = true;
    menu.x = event.clientX;
    menu.y = event.clientY;
    menu.message = message;
    menu.isMyMessage = message.profile_id === userStore.profile?.id;
};

const handleMenuAction = async (action: string) => {
    if (!menu.message) return;
    if (action === 'delete') {
        if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
            await supabase.from('messages').update({ is_deleted: true, content: 'Mensagem excluída' }).eq('id', menu.message.id);
        }
    } else {
        alert(`Funcionalidade "${action}" em desenvolvimento.`);
    }
    menu.show = false;
};

const updateStatus = async (status: 'online' | 'away' | 'offline') => {
  if (presenceChannel && userStore.profile) {
    await presenceChannel.track({ user: userStore.profile, status });
    await supabase.from('user_presences').upsert({ user_id: userStore.profile.id, status, last_seen: new Date().toISOString() });
  }
};

const handleVisibilityChange = () => updateStatus(document.visibilityState === 'visible' ? 'online' : 'away');
const resetInactivityTimer = () => {
  clearTimeout(inactivityTimer);
  updateStatus('online');
  inactivityTimer = setTimeout(() => updateStatus('away'), 3 * 60 * 1000);
};

watch(messages, scrollToBottom, { deep: true });

onMounted(async () => {
  await fetchChannels();
  if (userStore.profile) {
      await fetchAllUsersWithStatus();
      setupRealtimeListeners();
      resetInactivityTimer();
      window.addEventListener('mousemove', resetInactivityTimer);
      window.addEventListener('keydown', resetInactivityTimer);
      document.addEventListener('visibilitychange', handleVisibilityChange);
  }
});

onUnmounted(async () => {
  if (userStore.profile) await updateStatus('offline');
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  if (presenceChannel) supabase.removeChannel(presenceChannel);
  window.removeEventListener('mousemove', resetInactivityTimer);
  window.removeEventListener('keydown', resetInactivityTimer);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  clearTimeout(inactivityTimer);
});
</script>

<style lang="scss" scoped>
.chat-layout {
  display: grid;
  grid-template-columns: 320px 1fr auto;
  height: calc(100vh - 64px);
  background-color: #1E1E1E;
  background-image: url('https://i.pinimg.com/originals/85/ec/df/85ecdf1c361109f7955d93b450b5590d.jpg');
  background-size: cover;
  background-position: center;
}
.chat-main {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
  backdrop-filter: brightness(0.5);
}
.messages-container {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
}
.messages-list {
  flex-grow: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.message-input-area {
  padding: 10px 16px;
  background-color: #1E1E1E;
  border-top: 1px solid #2E2E2E;
  display: flex;
  align-items: center;
  gap: 8px;
}
.no-channel-selected,
.loading-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #757575;
}
.message-input :deep(.v-field__field) {
  border-radius: 24px !important;
  background-color: #2C2C2C;
}
.send-button {
  height: 48px !important;
  width: 48px !important;
}
.date-divider {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 0;
  span {
    background-color: rgba(44, 44, 44, 0.8);
    backdrop-filter: blur(2px);
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 500;
  }
}
</style>
