<template>
  <v-app>
    <div class="app-background-container" :style="{ backgroundImage: `url(${currentBackground})` }"></div>

    <audio ref="notificationSound" src="https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/sounds/notification.mp3" preload="auto"></audio>
    <audio ref="messageSound" src="https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/sounds/message.mp3" preload="auto"></audio>

    <v-app-bar v-if="isMobile" app color="rgba(20, 20, 25, 0.7)" density="compact" class="glassmorphism-app-bar">
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title class="app-bar-title">
         <router-link :to="{ name: 'Home' }">
            <v-img src="@/assets/logo.png" max-height="30" contain></v-img>
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
      <div class="drawer-flex-wrapper">
        <div class="d-flex justify-center align-center pa-4 mt-2 mb-6">
          <v-img src="@/assets/logo.png" max-height="50" contain class="animated-logo"></v-img>
        </div>

        <v-list dense nav class="pa-2 main-nav-list">
          <v-list-item
            v-for="item in navItems"
            :key="item.value"
            :prepend-icon="item.icon"
            :to="item.to"
            rounded="lg"
            class="nav-item"
            :class="{ 'has-pending-approvals-animation': item.value === 'approvals' && ordersPendingApproval > 0 }"
          >
            <template v-slot:title>
              <span v-if="item.value === 'approvals' && ordersPendingApproval > 0" class="animated-title">
                <span class="default-text">Aprovar Pedidos</span>
                <span class="animated-text">
                  {{ ordersPendingApproval }} Aprovaç{{ ordersPendingApproval > 1 ? 'ões' : 'ão' }}!
                </span>
              </span>
              <span v-else>
                {{ item.title }}
              </span>
            </template>
          </v-list-item>
        </v-list>

        <v-spacer></v-spacer>

        <div class="pa-2 quick-actions">

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

        <div class="user-footer pa-3">
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
  </v-app>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { supabase } from '@/api/supabase';
import { useRouter } from 'vue-router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useUserStore } from '@/stores/user';
import { useDashboardStore, type Order } from '@/stores/dashboard';
import { storeToRefs } from 'pinia';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const backgrounds = ref([
    'https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/1.jpg',
    'https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/2.jpg',
    'https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/3.jpg',
    'https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/4.jpg',
    'https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/5.jpg'
]);
const currentBackground = ref('');
let backgroundInterval: NodeJS.Timeout;

const startBackgroundCarousel = () => {
    clearInterval(backgroundInterval);
    if (backgrounds.value.length === 0) return;
    currentBackground.value = backgrounds.value[0];
    backgroundInterval = setInterval(() => {
        const currentIndex = backgrounds.value.indexOf(currentBackground.value);
        const nextIndex = (currentIndex + 1) % backgrounds.value.length;
        currentBackground.value = backgrounds.value[nextIndex];
    }, 15000);
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
    notifications.value.unshift(newNotification);
    notificationSound.value?.play().catch(e => console.error("Erro ao tocar som:", e));
    toastMessage.value = newNotification.content;
    showToast.value = true;
    isBellRinging.value = true;
    setTimeout(() => { isBellRinging.value = false; }, 2000);
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
  startBackgroundCarousel();
});

onUnmounted(() => {
  clearInterval(backgroundInterval);
  if (notificationListener.value) {
      supabase.removeChannel(notificationListener.value);
  }
  if (approvalListener.value) {
    supabase.removeChannel(approvalListener.value);
  }
});
</script>

<style lang="scss">
.v-application__wrap {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.v-application, .v-application__wrap {
  color: #E0E0E0 !important;
  background: transparent !important;
}

.v-main {
  overflow-y: auto;
  flex: 1 1 auto;
  padding-right: 4px;
}

.app-background-container {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: -1;
  background-size: cover;
  background-position: center;
  transition: background-image 1.5s ease-in-out;
  filter: blur(8px);
  -webkit-filter: blur(8px);
  transform: scale(1.1);
}
.glassmorphism-app-bar {
  background-color: rgba(20, 20, 25, 0.6) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}
.drawer-flex-wrapper { display: flex; flex-direction: column; height: 100%; }
.main-nav-list { flex: 1 1 auto; overflow-y: auto; }
.quick-actions, .user-footer { flex-shrink: 0; }
.glassmorphism-sidebar {
  background-color: rgba(20, 20, 25, 0.7) !important;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
}

.notifications-panel {
  max-height: 500px;
  display: flex;
  flex-direction: column;
}

.notification-list-scroll {
  flex-grow: 1;
  overflow-y: auto;
}

.notification-item.notification-read {
    opacity: 0.6;
    .v-list-item-title, .v-list-item-subtitle {
        color: rgba(255, 255, 255, 0.5);
    }
}
.notification-item:hover {
    background-color: rgba(255,255,255,0.05);
}

.toast-notification .v-snackbar__content {
  color: #FFFFFF !important;
  font-weight: 500;
}

.bell-ringing {
  animation: ring 1.5s ease-in-out infinite;
}

@keyframes ring {
  0% { transform: rotate(0); }
  10% { transform: rotate(25deg); }
  20% { transform: rotate(-25deg); }
  30% { transform: rotate(20deg); }
  40% { transform: rotate(-20deg); }
  50% { transform: rotate(15deg); }
  60% { transform: rotate(-15deg); }
  70% { transform: rotate(5deg); }
  80% { transform: rotate(-5deg); }
  90%, 100% { transform: rotate(0); }
}

.nav-item {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  z-index: 1;

  &.v-list-item--active, &:hover {
    .animated-title {
      color: white;
    }
  }

  &.has-pending-approvals-animation {
    background-color: rgba(76, 175, 80, 0.2) !important;
    border: 1px solid rgba(76, 175, 80, 0.4);
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);

    &::before, &::after {
      content: '';
      position: absolute;
      width: 10px;
      height: 10px;
      background: radial-gradient(circle, #FFD700 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: -1;
      animation: particles 3s infinite ease-out;
    }
    &::before { top: 10%; left: 10%; animation-delay: 0s; }
    &::after { bottom: 20%; right: 5%; animation-delay: 1.5s; }

    .v-list-item__content::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 50%;
      height: 100%;
      background: rgba(255, 255, 255, 0.2);
      transform: skewX(-20deg);
      animation: shine-animation 3s infinite;
      z-index: 2;
    }
  }
}

.animated-title {
  display: block;
  height: 24px;
  position: relative;
  overflow: hidden;
  .default-text, .animated-text {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    text-align: left;
  }
  .default-text { animation: text-toggle 6s infinite; }
  .animated-text { animation: text-toggle-rev 6s infinite; }
}

@keyframes text-toggle {
  0%, 20% { opacity: 1; transform: translateY(0); }
  25%, 45% { opacity: 0; transform: translateY(-100%); }
  50%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes text-toggle-rev {
  0%, 20% { opacity: 0; transform: translateY(100%); }
  25%, 45% { opacity: 1; transform: translateY(0); }
  50%, 100% { opacity: 0; transform: translateY(100%); }
}

@keyframes shine-animation {
  0% { transform: translateX(-100%) skewX(-20deg); }
  50% { transform: translateX(200%) skewX(-20deg); }
  100% { transform: translateX(-100%) skewX(-20deg); }
}

@keyframes particles {
  0% { transform: scale(0); opacity: 0; }
  5% { transform: scale(1); opacity: 1; }
  100% { transform: translateY(-50px) scale(1.5); opacity: 0; }
}
</style>
