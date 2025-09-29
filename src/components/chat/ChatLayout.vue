<template>
  <div class="chat-layout">
    <ChatSidebar :channels="channels" :active-channel-id="activeChannelId" @select-channel="setActiveChannel" />

    <main class="chat-main">
      <div v-if="loadingChannel" class="loading-container">
        <v_progress-circular indeterminate color="primary" />
      </div>

      <div v-else-if="activeChannel" class="messages-container">
        <ChatHeader :channel="activeChannel" />
        <div ref="messagesList" class="messages-list">
          <ChatMessage v-for="message in messages" :key="message.id" :message="message" />
        </div>
        <div class="message-input-area">
          <v_textarea
            v-model="newMessage"
            @keydown.enter.prevent="sendMessage"
            variant="solo"
            flat
            placeholder="Digite sua mensagem..."
            rows="2"
            auto-grow
            hide-details
          ></v_textarea>
          <v_btn icon="mdi-send" color="primary" @click="sendMessage" :disabled="!newMessage.trim()" class="ml-2"></v_btn>
        </div>
      </div>

      <div v-else class="no-channel-selected">
        <v_icon size="64" class="mb-4">mdi-forum-outline</v_icon>
        <h2>Selecione uma conversa</h2>
        <p class="text-medium-emphasis">Escolha um canal ou uma mensagem direta para começar a conversar.</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import ChatSidebar from './ChatSidebar.vue';
import ChatMessage from './ChatMessage.vue';
import ChatHeader from './ChatHeader.vue';

const userStore = useUserStore();
const channels = ref<any[]>([]);
const activeChannelId = ref<number | null>(null);
const messages = ref<any[]>([]);
const newMessage = ref('');
const messagesList = ref<HTMLElement | null>(null);
const loadingChannel = ref(false);
let messageSubscription: any = null;
let channelSubscription: any = null;

const activeChannel = computed(() => channels.value.find(c => c.id === activeChannelId.value));

const fetchChannels = async () => {
  const { data, error } = await supabase.rpc('get_my_channels');
  if (error) console.error('Erro ao buscar canais:', error);
  else channels.value = data;
};

const fetchMessages = async (channelId: number) => {
  messages.value = [];
  loadingChannel.value = true;
  const { data, error } = await supabase
    .from('messages')
    .select('*, profile:profiles(id, full_name, avatar_url)')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true });

  if (error) console.error('Erro ao buscar mensagens:', error);
  else messages.value = data;
  loadingChannel.value = false;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesList.value) {
      messagesList.value.scrollTop = messagesList.value.scrollHeight;
    }
  });
};

// --- CORREÇÃO APLICADA AQUI ---
const setActiveChannel = (channel: any) => {
  // Extrai o ID, seja de um número ou de um objeto
  const newChannelId = typeof channel === 'object' && channel !== null ? channel.id : channel;

  if (activeChannelId.value === newChannelId || !newChannelId) return;

  activeChannelId.value = newChannelId;

  if (messageSubscription) {
    supabase.removeChannel(messageSubscription);
  }

  fetchMessages(newChannelId);
  subscribeToMessages(newChannelId);
};

const sendMessage = async () => {
  if (!newMessage.value.trim() || !activeChannelId.value || !userStore.profile) return;

  const content = newMessage.value;
  newMessage.value = '';

  const { error } = await supabase.from('messages').insert({
    content: content,
    channel_id: activeChannelId.value,
    profile_id: userStore.profile.id
  });
  if (error) console.error('Erro ao enviar mensagem:', error);
};

const subscribeToMessages = (channelId: number) => {
  messageSubscription = supabase
    .channel(`messages-channel-${channelId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
      async (payload) => {
        const { data: profileData, error } = await supabase.from('profiles').select('*').eq('id', payload.new.profile_id).single();
        if (!error) {
            messages.value.push({ ...payload.new, profile: profileData });
        }
      }
    )
    .subscribe();
};

const subscribeToChannels = () => {
    channelSubscription = supabase
        .channel('public:channel_members')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_members' },
        (payload) => {
            // Verifica se a alteração envolve o usuário atual
            if (payload.new?.profile_id === userStore.profile?.id || payload.old?.profile_id === userStore.profile?.id) {
                fetchChannels();
            }
        })
        .subscribe();
};

watch(messages, scrollToBottom, { deep: true });

onMounted(async () => {
  await fetchChannels();
  if (userStore.profile) {
      subscribeToChannels();
  }
});

onUnmounted(() => {
  if (messageSubscription) supabase.removeChannel(messageSubscription);
  if (channelSubscription) supabase.removeChannel(channelSubscription);
});
</script>

<style lang="scss" scoped>
.chat-layout { display: flex; height: calc(100vh - 64px); background-color: #121212; }
.chat-main { flex-grow: 1; display: flex; flex-direction: column; height: 100%; }
.messages-container { display: flex; flex-direction: column; flex-grow: 1; overflow: hidden; }
.messages-list { flex-grow: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.message-input-area { padding: 16px; background-color: #1E1E1E; border-top: 1px solid #2E2E2E; display: flex; align-items: center; }
.no-channel-selected, .loading-container { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: #757575; }
</style>
