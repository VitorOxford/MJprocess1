<template>
  <v-app>
    <div class="background-container">
      <div class="logo-container">
        <v-img src="@/assets/logo.png" max-height="120" contain class="logo-with-glow"></v-img>
      </div>
      <div class="particles-overlay"></div>
    </div>

    <audio ref="notificationSound" src="https://cdn.shopify.com/s/files/1/0661/4574/6991/files/ding-101492.mp3?v=1755543134" preload="auto"></audio>
    <audio ref="messageSound" src="https://cdn.shopify.com/s/files/1/0661/4574/6991/files/ding-101492.mp3?v=1755543134" preload="auto"></audio>

    <v-app-bar v-if="isMobile" app color="rgba(20, 20, 25, 0.7)" density="compact" class="glassmorphism-app-bar">
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title class="app-bar-title">
         <router-link :to="{ name: 'Home' }">
            <v-img src="@/assets/logo.png" max-height="80" contain></v-img>
         </router-link>
      </v-toolbar-title>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      app
      :permanent="!isMobile"
      :temporary="isMobile"
      class="glassmorphism-sidebar"
    >
      <div class="d-flex justify-center align-center pa-4 mt-2 mb-6" style="flex-shrink: 0;">
        <v-img src="@/assets/logo.png" max-height="80" contain class="animated-logo"></v-img>
      </div>

      <v-list dense nav class="pa-2 main-nav-list">
        <v-list-item
          v-for="item in navItems"
          :key="item.value"
          :prepend-icon="item.icon"
          :to="item.to"
          rounded="lg"
          class="nav-item"
          :class="{
            'highlight-red': item.value === 'approvals',
            'highlight-green': item.value === 'delivery'
          }"
          @mouseenter="(event) => toggleHoverEffect(event, true, item.value)"
          @mouseleave="(event) => toggleHoverEffect(event, false, item.value)"
        >
          <template v-slot:title>
            <span v-if="item.value === 'approvals' && ordersPendingApproval > 0" class="animated-title">
              <span class="default-text">Aprovar Pedidos</span>
              <span class="animated-text">
                {{ ordersPendingApproval }} Aprovaç{{ ordersPendingApproval > 1 ? 'ões' : 'ão' }} Penden{{ ordersPendingApproval > 1 ? 'tes' : 'te' }}!
              </span>
            </span>
            <span v-else>
              {{ item.title }}
            </span>
          </template>
        </v-list-item>
      </v-list>

      <div class="pa-2 quick-actions" style="flex-shrink: 0;">
        <div class="d-flex justify-space-around align-center">
          <v-btn v-if="isAdmin" :to="{ name: 'Admin' }" icon variant="text" title="Painel Admin">
            <v-icon>mdi-security</v-icon>
          </v-btn>
          <v-btn :to="{ name: 'Chat' }" icon variant="text" title="Chat">
            <v-icon>mdi-forum-outline</v-icon>
          </v-btn>
          <v-menu
            v-model="notificationMenu"
            :close-on-content-click="false"
            location="top end"
            offset="10"
            @update:model-value="isBellRinging = false"
          >
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" icon variant="text" title="Notificações">
                <v-badge :content="unreadNotifications" color="error" :model-value="unreadNotifications > 0" dot>
                  <v-icon :class="{ 'bell-ringing': isBellRinging }">mdi-bell-outline</v-icon>
                </v-badge>
              </v-btn>
            </template>
            <v-card class="glassmorphism-card notifications-panel" min-width="350">
              <v-card-title class="pa-3 dialog-header">
                <v-icon start>mdi-bell-ring</v-icon>
                Notificações
                <v-spacer></v-spacer>
                <v-btn v-if="hasReadNotifications" size="small" variant="tonal" @click="clearReadNotifications">Limpar</v-btn>
              </v-card-title>
              <div class="notification-list-scroll">
                <div v-if="notifications.length === 0" class="text-center text-grey pa-8">
                  <v-icon size="48" class="mb-2">mdi-check-all</v-icon>
                  <p>Você não tem novas notificações.</p>
                </div>
                <template v-else>
                  <v-list class="bg-transparent py-0">
                    <v-list-subheader class="font-weight-bold">Recentes</v-list-subheader>
                    <v-list-item
                      v-for="notification in recentNotifications"
                      :key="notification.id"
                      @click="handleNotificationClick(notification)"
                      :class="{ 'notification-read': notification.is_read }"
                      class="notification-item"
                      :active="!notification.is_read"
                    >
                      <v-list-item-title class="text-wrap">{{ notification.content }}</v-list-item-title>
                      <v-list-item-subtitle>{{ formatDistance(notification.created_at) }} atrás</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                  <v-divider></v-divider>
                  <v-list class="bg-transparent py-0" v-if="olderNotifications.length > 0">
                    <v-list-subheader class="font-weight-bold">Anteriores</v-list-subheader>
                    <v-list-item
                      v-for="notification in olderNotifications"
                      :key="notification.id"
                      @click="handleNotificationClick(notification)"
                      :class="{ 'notification-read': notification.is_read }"
                      class="notification-item"
                    >
                      <v-list-item-title class="text-wrap">{{ notification.content }}</v-list-item-title>
                      <v-list-item-subtitle>{{ formatDistance(notification.created_at) }} atrás</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </template>
              </div>
            </v-card>
          </v-menu>
        </div>
      </div>

      <div class="user-footer pa-3" style="flex-shrink: 0;">
        <v-divider class="mb-3"></v-divider>
        <v-list-item lines="two" class="pa-1" v-if="profile">
          <template v-slot:prepend>
            <v-avatar :image="profile.avatar_url || ''" size="40"></v-avatar>
          </template>
          <v-list-item-title class="font-weight-bold text-body-1">{{ profile.full_name || 'Usuário' }}</v-list-item-title>
          <v-list-item-subtitle class="text-caption">{{ userStore.user?.email || '...' }}</v-list-item-subtitle>
        </v-list-item>
        <v-btn
          @click="handleLogout"
          block
          color="rgba(239, 83, 80, 0.8)"
          variant="flat"
          class="mt-3 logout-btn"
        >
          Sair
        </v-btn>
      </div>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>

    <v-snackbar
        v-model="showToast"
        :timeout="6000"
        color="rgba(30,30,35,0.9)"
        location="bottom right"
        class="toast-notification"
    >
        <div class="d-flex align-center">
            <v-icon color="primary" class="mr-3">mdi-bell-ring</v-icon>
            <div>
                <strong>Nova Notificação</strong>
                <div>{{ toastMessage }}</div>
            </div>
        </div>
        <template v-slot:actions>
            <v-btn variant="text" @click="showToast = false">Fechar</v-btn>
        </template>
    </v-snackbar>

    <PendingApprovalAlertModal
      :show="showPendingApprovalAlert"
      :title="pendingAlertContent.title"
      :message="pendingAlertContent.message"
      @close="showPendingApprovalAlert = false"
    />
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, defineAsyncComponent } from 'vue';
import { useDisplay } from 'vuetify';
import { supabase } from '@/api/supabase';
import { useRouter } from 'vue-router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useUserStore } from '@/stores/user';
import { useDashboardStore, type Order } from '@/stores/dashboard';
import { storeToRefs } from 'pinia';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PendingApprovalAlertModal = defineAsyncComponent(() => import('@/components/admin/PendingApprovalAlertModal.vue'));

const router = useRouter();
const userStore = useUserStore();
const dashboardStore = useDashboardStore();
const { profile, isAdmin } = storeToRefs(userStore);

const { mobile } = useDisplay();
const isMobile = computed(() => mobile.value);
const drawer = ref(!isMobile.value);

type Notification = {
  id: string; content: string; recipient_id: string | null; redirect_url: string | null; is_read: boolean; created_at: string;
};

const notificationSound = ref<HTMLAudioElement | null>(null);
const notifications = ref<Notification[]>([]);
const notificationMenu = ref(false);
const notificationListener = ref<RealtimeChannel | null>(null);
const approvalListener = ref<RealtimeChannel | null>(null);
const isBellRinging = ref(false);
const showToast = ref(false);
const toastMessage = ref('');
const ordersPendingApproval = ref(0);
const showPendingApprovalAlert = ref(false);
const pendingAlertContent = ref({ title: '', message: '' });

const unreadNotifications = computed(() => notifications.value.filter(n => !n.is_read).length);
const hasReadNotifications = computed(() => notifications.value.some(n => n.is_read));

const recentNotifications = computed(() => notifications.value.filter(n => !n.is_read || isToday(new Date(n.created_at))).slice(0, 5));
const olderNotifications = computed(() => notifications.value.filter(n => n.is_read && !isToday(new Date(n.created_at))).slice(0, 10));

const allNavItems = [
  { icon: 'mdi-view-dashboard-outline', title: 'Dashboard', value: 'home', to: { name: 'Home' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
  { icon: 'mdi-check-decagram-outline', title: 'Aprovar Pedidos', value: 'approvals', to: { name: 'Approvals' }, roles: ['vendedor', 'designer', 'admin'] },
  { icon: 'mdi-plus-box-outline', title: 'Novo Pedido', value: 'new-order', to: { name: 'NewOrder' }, roles: ['vendedor', 'admin'] },
  { icon: 'mdi-calendar-check-outline', title: 'Agenda de Produção', value: 'orders-calendar', to: { name: 'Orders' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
  { icon: 'mdi-factory', title: 'Pedidos', value: 'production-kanban', to: { name: 'ProductionKanban' }, roles: ['producao', 'admin'] },
  { icon: 'mdi-cog-sync-outline', title: 'Em Produção', value: 'in-production', to: { name: 'InProduction' }, roles: ['producao', 'admin'] },
  { icon: 'mdi-palette-swatch-outline', title: 'Design', value: 'design-kanban', to: { name: 'DesignKanban' }, roles: ['designer', 'admin'] },
  { icon: 'mdi-truck-delivery-outline', title: 'Agenda de Entrega', value: 'delivery', to: { name: 'Delivery' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
  { icon: 'mdi-warehouse', title: 'Estoque', value: 'stock', to: { name: 'Stock' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
  { icon: 'mdi-school-outline', title: 'Treinamento', value: 'didatico', to: { name: 'Didatico' }, roles: ['vendedor', 'admin'] },
  { icon: 'mdi-checkbox-marked-circle-outline', title: 'Tarefas', value: 'tasks', to: { name: 'Tasks' }, roles: ['vendedor', 'designer', 'producao', 'admin'] },
];

const navItems = computed(() => {
    if (!profile.value) return [];
    return allNavItems.filter(item => item.roles.includes(profile.value.role));
});

const handleLogout = async () => {
  if (notificationListener.value) {
    supabase.removeChannel(notificationListener.value);
  }
  if (approvalListener.value) {
    supabase.removeChannel(approvalListener.value);
  }
  await userStore.signOut();
  router.push({ name: 'Login' });
};

const toggleHoverEffect = (event: MouseEvent, shouldAdd: boolean, value: string) => {
  const target = event.currentTarget as HTMLElement;
  if (value === 'approvals' || value === 'delivery') {
    target.classList.toggle('hover-effect', shouldAdd);
  }
};

const fetchNotifications = async () => {
    if (!userStore.user) return;
    try {
        const { data, error } = await supabase.from('notifications').select('*').or(`recipient_id.eq.${userStore.user.id},recipient_id.is.null`).order('created_at', { ascending: false }).limit(30);
        if (error) throw error;
        notifications.value = data || [];
    } catch (error) { console.error("Erro ao buscar notificações:", error); }
}

const fetchPendingApprovals = async () => {
  if (!userStore.user) return;
  try {
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'customer_approval')
      .eq('created_by', userStore.user.id);
    if (error) throw error;
    ordersPendingApproval.value = count || 0;
  } catch (e) {
    console.error('Erro ao buscar aprovações pendentes:', e);
    ordersPendingApproval.value = 0;
  }
};

const setupApprovalListener = () => {
    if (!userStore.user) return;
    approvalListener.value = supabase.channel('public:orders:approvals-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            const { new: newOrder, old: oldOrder, eventType } = payload as any;
            const userId = userStore.user?.id;
            if (eventType === 'INSERT' && newOrder.status === 'customer_approval' && newOrder.created_by === userId) {
                fetchPendingApprovals();
            } else if (eventType === 'UPDATE') {
                const oldStatusIsPending = oldOrder?.status === 'customer_approval' && oldOrder?.created_by === userId;
                const newStatusIsPending = newOrder?.status === 'customer_approval' && newOrder?.created_by === userId;
                if (oldStatusIsPending || newStatusIsPending) {
                    fetchPendingApprovals();
                }
            } else if (eventType === 'DELETE' && oldOrder?.status === 'customer_approval' && oldOrder?.created_by === userId) {
                fetchPendingApprovals();
            }
        })
        .subscribe();
}

const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
        try {
            await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
            const index = notifications.value.findIndex(n => n.id === notification.id);
            if (index !== -1) notifications.value[index].is_read = true;
        } catch(error) { console.error("Erro ao marcar notificação como lida:", error); }
    }
    if (notification.redirect_url) { router.push(notification.redirect_url); }
};

const clearReadNotifications = () => {
    notifications.value = notifications.value.filter(n => !n.is_read);
};

const handleNewNotification = (payload: any) => {
    const newNotification = payload.new as Notification;

    // **CORREÇÃO APLICADA AQUI**
    // Lógica para interpretar a notificação de alerta
    if (newNotification.content.startsWith('[ALERT_PENDING_APPROVAL]')) {
      const parts = newNotification.content.replace('[ALERT_PENDING_APPROVAL]', '').split('::');
      pendingAlertContent.value = {
        title: parts[0] || 'ALERTA',
        message: parts[1] || 'Você tem uma aprovação pendente.',
      };
      showPendingApprovalAlert.value = true;
      notificationSound.value?.play().catch(e => console.error("Erro ao tocar som:", e));
    } else {
      // Comportamento para notificações normais
      notifications.value.unshift(newNotification);
      notificationSound.value?.play().catch(e => console.error("Erro ao tocar som:", e));
      toastMessage.value = newNotification.content;
      showToast.value = true;
      isBellRinging.value = true;
      setTimeout(() => { isBellRinging.value = false; }, 2000);
    }
};

const setupNotificationListener = () => {
    if (!userStore.user) return;
    notificationListener.value = supabase.channel('public:notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
            const newNotification = payload.new as Notification;
            if (newNotification.recipient_id === userStore.user?.id || newNotification.recipient_id === null) {
                handleNewNotification(payload);
            }
        })
        .subscribe();
};

const formatDistance = (dateString: string) => {
    if (!dateString) return '';
    return formatDistanceToNow(new Date(dateString), { addSuffix: false, locale: ptBR });
};

onMounted(async () => {
  if (userStore.isLoggedIn) {
    await fetchNotifications();
    await fetchPendingApprovals();
    setupNotificationListener();
    setupApprovalListener();
  }
});

onUnmounted(() => {
  if (notificationListener.value) {
      supabase.removeChannel(notificationListener.value);
  }
  if (approvalListener.value) {
    supabase.removeChannel(approvalListener.value);
  }
});
</script>

<style lang="scss">
/* --- ESTILOS GERAIS --- */
.background-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  background-color: #121212;
  background-image: radial-gradient(circle at center, rgba(0,0,0,0.8), #121212);
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo-container {
  position: relative;
  width: 200px;
  height: 200px;
}

.logo-with-glow {
  filter: drop-shadow(0 0 10px rgba(255, 208, 0, 0.233)) drop-shadow(0 0 20px rgba(255, 204, 0, 0.637));
}

.particles-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.particles-overlay::before,
.particles-overlay::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  animation-duration: 20s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  pointer-events: none;
  opacity: 0;
}

.particles-overlay::before {
  width: 200vw;
  height: 200vh;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.2) 1px, transparent 1%);
  background-size: 25px 25px;
  animation-name: particles-white;
}

.particles-overlay::after {
  width: 200vw;
  height: 200vh;
  background-image: radial-gradient(circle, rgba(255, 215, 0, 0.3) 1px, transparent 1%);
  background-size: 25px 25px;
  animation-name: particles-gold;
  animation-delay: 10s;
}

@keyframes particles-white {
  0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.5); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translate(-50%, -50%) rotate(360deg) scale(1.5); opacity: 0; }
}

@keyframes particles-gold {
  0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.5); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translate(-50%, -50%) rotate(360deg) scale(1.5); opacity: 0; }
}

.v-application, .v-application__wrap {
  color: #E0E0E0 !important;
  background: transparent !important;
}
.v-main {
  height: 100vh;
  overflow-y: auto;
  padding-right: 4px;
}
.glassmorphism-sidebar {
  background-color: rgba(20, 20, 25, 0.7) !important;
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
}

/* **CORREÇÃO DEFINITIVA PARA ROLAGEM** */
.v-navigation-drawer > .v-navigation-drawer__content {
  display: flex;
  flex-direction: column;
}
.main-nav-list {
  flex-grow: 1; /* Permite que a lista cresça e empurre o rodapé */
  overflow-y: auto; /* Adiciona a rolagem quando necessário */
}
/* FIM DA CORREÇÃO */

@media (max-width: 600px) {
  .v-navigation-drawer.glassmorphism-sidebar {
    display: flex !important;
    flex-direction: column !important;
    height: 100vh !important;
    min-height: 0 !important;
    overflow: hidden !important;
  }
  .main-nav-list {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    height: 100% !important;
    overflow-y: auto !important;
    max-height: unset !important;
  }
}

.nav-item {
  position: relative;
  overflow: hidden;
  transition: background-color 0.2s ease;
  border-radius: 8px;

  &.v-list-item--active, &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
}

.highlight-red {
  background-color: rgba(239, 83, 80, 0.733) !important;
  box-shadow: 0 0 8px rgba(239, 83, 80, 0.966);
}

.highlight-green {
  background-color: rgba(76, 175, 79, 0.658) !important;
  box-shadow: 0 0 8px rgb(76, 175, 79);
}

.nav-item.hover-effect {
  background-image: linear-gradient(45deg, transparent 10%, var(--hover-color) 50%, transparent 90%);
  background-size: 300% 100%;
  animation: gradient-animation 1.5s infinite linear;
}

.highlight-red.hover-effect {
  --hover-color: rgba(239, 83, 80, 0.993);
}

.highlight-green.hover-effect {
  --hover-color: rgba(76, 175, 79, 0.973);
}

@keyframes gradient-animation {
  0% { background-position: 200% 0; }
  100% { background-position: -100% 0; }
}

.quick-actions, .user-footer { flex-shrink: 0; }
.glassmorphism-app-bar {
  background-color: rgba(20, 20, 25, 0.6) !important;
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}
.notifications-panel { max-height: 500px; display: flex; flex-direction: column; }
.notification-list-scroll { flex-grow: 1; overflow-y: auto; }
.notification-item.notification-read {
    opacity: 0.6;
    .v-list-item-title, .v-list-item-subtitle { color: rgba(255, 255, 255, 0.5); }
}
.notification-item:hover { background-color: rgba(255,255,255,0.05); }
.toast-notification .v-snackbar__content { color: #FFFFFF !important; font-weight: 500; }
.bell-ringing { animation: ring 1.5s ease-in-out infinite; }
@keyframes ring {
  0% { transform: rotate(0); } 10% { transform: rotate(25deg); } 20% { transform: rotate(-25deg); }
  30% { transform: rotate(20deg); } 40% { transform: rotate(-20deg); } 50% { transform: rotate(15deg); }
  60% { transform: rotate(-15deg); } 70% { transform: rotate(5deg); } 80% { transform: rotate(-5deg); }
  90%, 100% { transform: rotate(0); }
}
.animated-title {
  display: block; height: 24px; position: relative; overflow: hidden;
  .default-text, .animated-text { position: absolute; top: 0; left: 0; width: 100%; text-align: left; }
  .default-text { animation: text-toggle 6s infinite; }
  .animated-text { animation: text-toggle-rev 6s infinite; }
}
@keyframes text-toggle {
  0%, 20% { opacity: 1; transform: translateY(0); } 25%, 45% { opacity: 0; transform: translateY(-100%); }
  50%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes text-toggle-rev {
  0%, 20% { opacity: 0; transform: translateY(100%); } 25%, 45% { opacity: 1; transform: translateY(0); }
  50%, 100% { opacity: 0; transform: translateY(100%); }
}
</style>
