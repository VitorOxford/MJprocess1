<template>
  <div class="chat-layout">
    <ChatSidebar
      :channels="channels"
      :active-channel-id="activeChannelId"
      @select-channel="setActiveChannel"
      @open-new-chat-modal="openNewChatModal"
      @channel-action="handleChannelAction"
      class="d-none d-md-flex"
    />

    <main class="chat-main d-none d-md-flex">
      <div v-if="loadingChannel" class="loading-container">
        <v-progress-circular indeterminate color="primary" />
      </div>
      <div v-else-if="activeChannel" class="messages-container">
        <ChatHeader
          :channel="activeChannel"
          :online-users="allUsersWithStatus"
          v-model:searchQuery="searchQuery"
          @toggle-repository="showRepository = !showRepository"
        />
        <div ref="messagesList" class="messages-list">
            <template v-for="(group, index) in filteredGroupedMessages" :key="index">
                <div class="date-divider"><span>{{ group.date }}</span></div>
                <ChatMessage
                v-for="(message, msgIndex) in group.messages"
                :key="message.id"
                :message="message"
                :is-consecutive="isConsecutiveMessage(message, msgIndex, group.messages)"
                :search-query="searchQuery"
                @show-menu="onShowMenu"
                />
            </template>
        </div>
        <div class="message-input-wrapper">
          <div class="reply-preview-area" v-if="replyingToMessage">
              <div class="reply-content">
                  <v-icon size="small">mdi-reply</v-icon>
                  <strong class="ml-2">Respondendo a {{ replyingToMessage.profile.full_name }}</strong>
                  <p class="text-caption text-truncate">{{ replyingToMessage.content }}</p>
              </div>
              <v-btn icon="mdi-close" variant="text" size="small" @click="cancelReply"></v-btn>
          </div>
           <div class="edit-preview-area" v-if="editingMessage">
              <div class="edit-content">
                  <v-icon size="small">mdi-pencil</v-icon>
                  <strong class="ml-2">Editando mensagem</strong>
                  <p class="text-caption text-truncate">{{ editingMessage.content }}</p>
              </div>
              <v-btn icon="mdi-close" variant="text" size="small" @click="cancelEdit"></v-btn>
          </div>
          <div class="message-input-area">
            <v-btn icon="mdi-paperclip" variant="text" @click="triggerFileInput" v-tooltip="'Anexar arquivo'"></v-btn>
            <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none" />
            <v-text-field
              v-if="!isRecording"
              v-model="newMessage"
              @keydown.enter.prevent="handleSend"
              variant="solo"
              flat
              placeholder="Digite uma mensagem"
              hide-details
              class="message-input"
              autofocus
            ></v-text-field>
            <div v-else class="recording-indicator">
                <div class="recording-dot"></div>
                <span>Gravando... {{ recordingTime }}</span>
            </div>
            <v-btn v-if="!newMessage.trim() && !isRecording" icon="mdi-microphone" color="primary" elevation="2" @click="startRecording" class="send-button"></v-btn>
            <v-btn v-else-if="isRecording" icon="mdi-stop-circle-outline" color="error" elevation="2" @click="stopRecording" class="send-button"></v-btn>
            <v-btn v-else icon="mdi-send" color="primary" elevation="2" @click="handleSend" class="send-button"></v-btn>
          </div>
        </div>
      </div>
      <div v-else class="no-channel-selected">
        <v-icon size="64" class="mb-4">mdi-forum-outline</v-icon>
        <h2>Selecione uma conversa</h2>
        <p class="text-medium-emphasis">Escolha um canal para começar a conversar.</p>
      </div>
    </main>

    <ChatPresence :users="allUsersWithStatus" @start-dm="startDirectMessage" class="d-none d-lg-flex" />

    <div v-if="isMobile" class="mobile-layout">
        <v-window v-model="mobileTab" class="fill-height">
            <v-window-item value="chats" class="fill-height">
                <ChatSidebar
                    :channels="channels"
                    :active-channel-id="activeChannelId"
                    @select-channel="setActiveChannel"
                    @open-new-chat-modal="openNewChatModal"
                    @channel-action="handleChannelAction"
                    :is-mobile="isMobile"
                />
            </v-window-item>
             <v-window-item value="main" class="fill-height">
                 <main class="chat-main d-flex">
                    <div v-if="activeChannel" class="messages-container">
                        <ChatHeader
                            :channel="activeChannel" :online-users="allUsersWithStatus"
                            v-model:searchQuery="searchQuery"
                            @toggle-repository="showRepository = !showRepository"
                        />
                        <div ref="messagesListMobile" class="messages-list">
                            <template v-for="(group, index) in filteredGroupedMessages" :key="index">
                                <div class="date-divider"><span>{{ group.date }}</span></div>
                                <ChatMessage
                                v-for="(message, msgIndex) in group.messages"
                                :key="message.id" :message="message"
                                :is-consecutive="isConsecutiveMessage(message, msgIndex, group.messages)"
                                :search-query="searchQuery" @show-menu="onShowMenu"
                                />
                            </template>
                        </div>
                        <div class="message-input-wrapper">
                             <div class="reply-preview-area" v-if="replyingToMessage">
                                <div class="reply-content">
                                    <v-icon size="small">mdi-reply</v-icon>
                                    <strong class="ml-2">Respondendo a {{ replyingToMessage.profile.full_name }}</strong>
                                    <p class="text-caption text-truncate">{{ replyingToMessage.content }}</p>
                                </div>
                                <v-btn icon="mdi-close" variant="text" size="small" @click="cancelReply"></v-btn>
                            </div>
                            <div class="edit-preview-area" v-if="editingMessage">
                                <div class="edit-content">
                                    <v-icon size="small">mdi-pencil</v-icon>
                                    <strong class="ml-2">Editando mensagem</strong>
                                    <p class="text-caption text-truncate">{{ editingMessage.content }}</p>
                                </div>
                                <v-btn icon="mdi-close" variant="text" size="small" @click="cancelEdit"></v-btn>
                            </div>
                            <div class="message-input-area">
                                <v-btn icon="mdi-paperclip" variant="text" @click="triggerFileInput" v-tooltip="'Anexar arquivo'"></v-btn>
                                <input type="file" ref="fileInput" @change="handleFileUpload" style="display: none" />
                                <v-text-field
                                v-if="!isRecording"
                                v-model="newMessage"
                                @keydown.enter.prevent="handleSend"
                                variant="solo" flat placeholder="Digite uma mensagem"
                                hide-details class="message-input" autofocus
                                ></v-text-field>
                                <div v-else class="recording-indicator">
                                    <div class="recording-dot"></div>
                                    <span>Gravando... {{ recordingTime }}</span>
                                </div>
                                <v-btn v-if="!newMessage.trim() && !isRecording" icon="mdi-microphone" color="primary" elevation="2" @click="startRecording" class="send-button"></v-btn>
                                <v-btn v-else-if="isRecording" icon="mdi-stop-circle-outline" color="error" elevation="2" @click="stopRecording" class="send-button"></v-btn>
                                <v-btn v-else icon="mdi-send" color="primary" elevation="2" @click="handleSend" class="send-button"></v-btn>
                            </div>
                        </div>
                    </div>
                     <div v-else class="no-channel-selected">
                        <v-icon size="64" class="mb-4">mdi-forum-outline</v-icon>
                        <h2>Nenhuma conversa selecionada</h2>
                    </div>
                 </main>
            </v-window-item>
             <v-window-item value="users" class="fill-height">
                <ChatPresence :users="allUsersWithStatus" @start-dm="startDirectMessage" />
            </v-window-item>
        </v-window>
        <v-bottom-navigation v-model="mobileTab" grow color="primary">
            <v-btn value="chats">
                <v-icon>mdi-chat-outline</v-icon>
                <span>Conversas</span>
            </v-btn>
             <v-btn value="main" :disabled="!activeChannel">
                <v-icon>mdi-message-text-outline</v-icon>
                <span>Chat</span>
            </v-btn>
             <v-btn value="users">
                <v-icon>mdi-account-group-outline</v-icon>
                <span>Contatos</span>
            </v-btn>
        </v-bottom-navigation>
    </div>


    <MediaRepository v-model:show="showRepository" :channel="activeChannel" :online-users="allUsersWithStatus" />
    <MessageMenu
      :show="menu.show"
      :x="menu.x"
      :y="menu.y"
      :is-my-message="menu.isMyMessage"
      @update:show="menu.show = $event"
      @action="handleMenuAction"
    />
    <NewConversationModal v-model="newConversationModal" :mode="newConversationMode" @conversation-started="handleConversationStart" @group-created="handleGroupCreated" />
    <ForwardMessageModal v-model="showForwardModal" :message="forwardingMessage" :channels="channels" @forward="executeForward" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed, reactive } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { useChatStore } from '@/stores/chat';
import { useDisplay } from 'vuetify';
import ChatSidebar from './ChatSidebar.vue';
import ChatMessage from './ChatMessage.vue';
import ChatHeader from './ChatHeader.vue';
import ChatPresence from './ChatPresence.vue';
import MediaRepository from './MediaRepository.vue';
import MessageMenu from './MessageMenu.vue';
import NewConversationModal from './NewConversationModal.vue';
import ForwardMessageModal from './ForwardMessageModal.vue';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const userStore = useUserStore();
const chatStore = useChatStore();
const { mobile: isMobile } = useDisplay();

const channels = ref<any[]>([]);
const activeChannelId = ref<number | null>(null);
const messages = ref<any[]>([]);
const newMessage = ref('');
const messagesList = ref<HTMLElement | null>(null);
const messagesListMobile = ref<HTMLElement | null>(null);
const loadingChannel = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const showRepository = ref(false);
const isChatActiveOnMobile = ref(false);
const searchQuery = ref('');

const newConversationModal = ref(false);
const newConversationMode = ref<'dm' | 'group'>('dm');

const allUsersWithStatus = ref<any[]>([]);
let presenceChannel: RealtimeChannel | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let inactivityTimer: number;

const menu = reactive({ show: false, x: 0, y: 0, message: null as any | null, isMyMessage: false });

// Estados para funcionalidades de mensagem
const editingMessage = ref<any | null>(null);
const replyingToMessage = ref<any | null>(null);
const forwardingMessage = ref<any | null>(null);
const showForwardModal = ref(false);

// Estados para gravação de áudio
const isRecording = ref(false);
const mediaRecorder = ref<MediaRecorder | null>(null);
const audioChunks = ref<Blob[]>([]);
const recordingTime = ref('00:00');
let recordingInterval: number;

const mobileTab = ref('chats');

const activeChannel = computed(() => channels.value.find(c => c.id === activeChannelId.value));

const filteredGroupedMessages = computed(() => {
    let items = messages.value;
    if (searchQuery.value) {
        items = messages.value.filter(msg =>
            msg.content && msg.content.toLowerCase().includes(searchQuery.value.toLowerCase())
        );
    }

    if (!items.length) return [];
    const groups: { date: string; messages: any[] }[] = [];
    let lastDate = '';

    items.forEach(msg => {
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

const isConsecutiveMessage = (message: any, index: number, group: any[]) => {
    if (index === 0) return false;
    const prevMessage = group[index - 1];
    const timeDiff = differenceInMinutes(new Date(message.created_at), new Date(prevMessage.created_at));
    return prevMessage.profile_id === message.profile_id && timeDiff < 5;
};


const fetchAllUsersWithStatus = async () => {
  if (!userStore.profile?.id) return;
  const { data, error } = await supabase.rpc('get_all_users_with_status', { p_exclude_user_id: userStore.profile.id });
  if (error) console.error("Erro ao buscar lista de usuários:", error);
  else allUsersWithStatus.value = data;
};

const fetchChannels = async () => {
  const { data, error } = await supabase.rpc('get_my_channels_with_unread_and_preview');
  if (error) console.error('Erro ao buscar canais:', error);
  else {
    channels.value = data;
    const totalUnread = data.reduce((sum: number, ch: any) => sum + (ch.unread_count || 0), 0);
    chatStore.setTotalUnreadCount(totalUnread);
  }
};

const fetchMessages = async (channelId: number) => {
  messages.value = [];
  loadingChannel.value = true;
  try {
    // *** CORREÇÃO APLICADA AQUI ***
    // Removida a tentativa de join com 'reply_to_message_id' que causava o erro
    const { data, error } = await supabase
        .from('messages')
        .select('*, profile:profiles(id, full_name, avatar_url)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    messages.value = data.filter(m => !m.is_deleted);
    await supabase.rpc('update_last_read', { p_channel_id: channelId });
    await fetchChannels();
  } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
  } finally {
      loadingChannel.value = false;
  }
};

const scrollToBottom = () => nextTick(() => {
    if (messagesList.value) messagesList.value.scrollTop = messagesList.value.scrollHeight;
    if (messagesListMobile.value) messagesListMobile.value.scrollTop = messagesListMobile.value.scrollHeight;
});

const setActiveChannel = (channelId: number) => {
  if (activeChannelId.value === channelId || !channelId) return;
  activeChannelId.value = channelId;
  if(isMobile.value) mobileTab.value = 'main';
  showRepository.value = false;
  searchQuery.value = '';
  fetchMessages(channelId);
};

const startDirectMessage = async (user: any) => {
  if (!userStore.profile) return;
  const { data, error } = await supabase.rpc('find_or_create_dm_channel', { p_user1_id: userStore.profile.id, p_user2_id: user.id });
  if (error) console.error('Erro ao iniciar DM:', error);
  else {
    await fetchChannels();
    setActiveChannel(data);
  }
};

const handleSend = () => {
    if(editingMessage.value) {
        updateMessage();
    } else {
        sendMessage();
    }
}

const updateMessage = async () => {
    if (!editingMessage.value || !newMessage.value.trim()) return;
    const { error } = await supabase.from('messages').update({ content: newMessage.value }).eq('id', editingMessage.value.id);
    if (error) console.error("Erro ao editar:", error);
    cancelEdit();
}

const sendMessage = async (contentOverride: any = null, messageType: string = 'text') => {
  if (typeof contentOverride === 'object' && contentOverride !== null) contentOverride = null;
  const content = contentOverride || newMessage.value.trim();
  if (!content || !activeChannelId.value || !userStore.profile) return;

  const tempId = Date.now();
  if (messageType === 'text') newMessage.value = '';

  const payload = {
      content,
      channel_id: activeChannelId.value,
      profile_id: userStore.profile.id,
      message_type: messageType,
      reply_to_message_id: replyingToMessage.value ? replyingToMessage.value.id : null
  }

  cancelReply();

  const optimisticMessage = {
      id: tempId,
      created_at: new Date().toISOString(),
      ...payload,
      profile: userStore.profile,
      is_optimistic: true
  };
  messages.value.push(optimisticMessage);

  const { error } = await supabase.from('messages').insert(payload);

  if (error) {
      console.error("Erro ao enviar mensagem:", error);
      messages.value = messages.value.filter(m => m.id !== tempId);
  }
};
const triggerFileInput = () => fileInput.value?.click();
const handleFileUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !activeChannelId.value) return;
    const sanitizedFileName = file.name.replace(/[^\w.\-]/g, '_');
    const fileName = `${Date.now()}_${sanitizedFileName}`;
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

const onShowMenu = ({ event, message }: { event: MouseEvent, message: any }) => {
    menu.show = true;
    menu.x = event.clientX;
    menu.y = event.clientY;
    menu.message = message;
    menu.isMyMessage = message.profile_id === userStore.profile?.id;
};

const handleMenuAction = async (action: string) => {
    if (!menu.message) return;
    const message = menu.message;
    menu.show = false;

    switch(action) {
        case 'delete':
            if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
                await supabase.from('messages').update({ is_deleted: true, content: 'Mensagem excluída' }).eq('id', message.id);
            }
            break;
        case 'edit':
            cancelReply();
            editingMessage.value = message;
            newMessage.value = message.content;
            break;
        case 'reply':
            cancelEdit();
            replyingToMessage.value = message;
            break;
        case 'forward':
            forwardingMessage.value = message;
            showForwardModal.value = true;
            break;
    }
};

const executeForward = async ({ channels, message }: { channels: number[], message: any}) => {
    if(!message || channels.length === 0) return;
    for (const channelId of channels) {
        await supabase.from('messages').insert({
            content: message.content,
            channel_id: channelId,
            profile_id: userStore.profile.id,
            message_type: message.message_type,
            forwarded_from_id: message.profile_id
        });
    }
    showForwardModal.value = false;
};

const handleChannelAction = async ({ action, channel }: { action: string, channel: any }) => {
    if (action === 'delete') {
        if (confirm(`Tem certeza que deseja excluir a conversa com "${channel.name}"? Esta ação não pode ser desfeita.`)) {
            const { error } = await supabase.from('channels').update({ is_deleted: true }).eq('id', channel.id);
            if (error) {
                alert(`Erro ao excluir o canal: ${error.message}`);
            } else {
                if(activeChannelId.value === channel.id) activeChannelId.value = null;
                await fetchChannels();
            }
        }
    } else {
        alert(`Função '${action}' ainda não implementada.`);
    }
};
const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.value = new MediaRecorder(stream);
        audioChunks.value = [];
        mediaRecorder.value.ondataavailable = event => {
            audioChunks.value.push(event.data);
        };
        mediaRecorder.value.onstop = async () => {
            const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' });
            const fileName = `audio_${Date.now()}.webm`;
            const filePath = `channel_${activeChannelId.value}/${fileName}`;
            const { data, error } = await supabase.storage.from('media').upload(filePath, audioBlob);
            if(error) throw error;
            const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
            await sendMessage(publicUrl, 'audio');
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.value.start();
        isRecording.value = true;
        let seconds = 0;
        recordingInterval = setInterval(() => {
            seconds++;
            const min = Math.floor(seconds / 60).toString().padStart(2, '0');
            const sec = (seconds % 60).toString().padStart(2, '0');
            recordingTime.value = `${min}:${sec}`;
        }, 1000);
    } catch (err) {
        console.error("Erro ao iniciar gravação:", err);
        alert("Não foi possível acessar o microfone.");
    }
};
const stopRecording = () => {
    mediaRecorder.value?.stop();
    isRecording.value = false;
    clearInterval(recordingInterval);
    recordingTime.value = '00:00';
};

const cancelEdit = () => { editingMessage.value = null; newMessage.value = ''; };
const cancelReply = () => { replyingToMessage.value = null; };

const setupRealtimeListeners = () => {
  if (realtimeChannel || !userStore.profile) return;
  realtimeChannel = supabase.channel('mjprocess-realtime');
  realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (payload) => {
    const { data: member } = await supabase.from('channel_members').select('channel_id').eq('channel_id', (payload.new as any)?.channel_id || (payload.old as any)?.id).eq('profile_id', userStore.profile?.id).single();
    if (member) {
        if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as any;
             if (newMessage.profile_id === userStore.profile?.id) {
                const optimisticIndex = messages.value.findIndex(m => m.is_optimistic && m.content === newMessage.content);
                if (optimisticIndex > -1) {
                    messages.value.splice(optimisticIndex, 1, { ...newMessage, profile: userStore.profile });
                }
            } else if (newMessage.channel_id === activeChannelId.value) {
                const { data: profileData } = await supabase.from('profiles').select('*').eq('id', newMessage.profile_id).single();
                if (profileData) messages.value.push({ ...newMessage, profile: profileData });
                if(newMessage.profile_id !== userStore.profile?.id) await supabase.rpc('update_last_read', { p_channel_id: newMessage.channel_id });
            } else chatStore.playNotificationSound();
        }
        if (payload.eventType === 'UPDATE') {
            const updatedMessage = payload.new as any;
            if (updatedMessage.channel_id === activeChannelId.value) {
                const msgIndex = messages.value.findIndex(m => m.id === updatedMessage.id);
                if(msgIndex > -1) {
                    if (updatedMessage.is_deleted) messages.value.splice(msgIndex, 1);
                    else Object.assign(messages.value[msgIndex], updatedMessage);
                }
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
const openNewChatModal = (mode: 'dm' | 'group') => {
  newConversationMode.value = mode;
  newConversationModal.value = true;
};
const handleConversationStart = (channelId: number) => {
  setActiveChannel(channelId);
  newConversationModal.value = false;
};
const handleGroupCreated = (newChannel: any) => {
  fetchChannels();
  setActiveChannel(newChannel.id);
  newConversationModal.value = false;
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
  height: 100%;
  position: relative;
  overflow: hidden;
}
.chat-main {
  flex-grow: 1; display: flex; flex-direction: column;
  height: 100%; position: relative; overflow: hidden;
  background-color: #0E1621;
  background-image: linear-gradient(rgba(14, 22, 33, 0.8), rgba(14, 22, 33, 0.8)), url('https://cdn.shopify.com/s/files/1/0661/4574/6991/files/eca8ae9d5686a2a255a0409d95e5c79b.jpg?v=1759171903');
  background-repeat: repeat;
  background-size: 400px;
  transition: transform 0.3s ease-in-out;
}
.messages-container { display: flex; flex-direction: column; flex-grow: 1; overflow: hidden; }
.messages-list { flex-grow: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 4px; }
.message-input-wrapper {
    padding: 8px 16px;
    flex-shrink: 0;
}
.message-input-area {
  padding: 4px 4px 4px 16px;
  background-color: #2c2c2e;
  border-radius: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.no-channel-selected,
.loading-container {
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  height: 100%; color: #757575;
}
.message-input {
    :deep(.v-field) { background: transparent !important; box-shadow: none !important; }
    :deep(textarea) { padding-top: 12px; }
}
.send-button { height: 40px !important; width: 40px !important; }
.date-divider {
  display: flex; justify-content: center; align-items: center;
  padding: 16px 0;
  span {
    background-color: rgba(44, 44, 44, 0.8); backdrop-filter: blur(2px);
    color: white; padding: 4px 12px; border-radius: 12px;
    font-size: 0.8rem; font-weight: 500;
  }
}
.reply-preview-area, .edit-preview-area {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: rgba(60, 60, 60, 0.5);
    border-left: 4px solid var(--v-theme-primary);
    border-radius: 8px 8px 0 0;
}

.recording-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #EF5350;
    font-weight: bold;
    flex-grow: 1;
    .recording-dot {
        width: 10px;
        height: 10px;
        background-color: #EF5350;
        border-radius: 50%;
        animation: pulse 1.5s infinite ease-in-out;
    }
}
@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
}

// Mobile Layout
.mobile-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}
@media (max-width: 959px) {
  .chat-layout {
    grid-template-columns: 1fr;
  }
}
</style>
