<template>
  <v-container fluid class="pa-md-6 pa-2">
    <div class="admin-dashboard">
      <div v-if="!selectedView" class="view-selector">
        <v-toolbar color="transparent" class="px-0 mb-6">
          <v-toolbar-title class="font-weight-bold text-h4 d-flex align-center">
            <v-icon start size="36" class="mr-3">mdi-shield-crown-outline</v-icon>
            Centro de Comando
          </v-toolbar-title>
        </v-toolbar>

        <v-row>
          <v-col
            v-for="view in adminViews"
            :key="view.key"
            cols="12"
            sm="6"
            md="4"
          >
            <AdminDashboardCard
              :title="view.title"
              :subtitle="view.subtitle"
              :icon="view.icon"
              :color="view.color"
              @click="selectedView = view.key"
            />
          </v-col>
        </v-row>
      </div>

      <div v-else class="view-content">
        <v-toolbar color="transparent" class="px-0 mb-4">
          <v-btn icon="mdi-arrow-left" @click="selectedView = null" class="mr-4"></v-btn>
          <v-toolbar-title class="font-weight-bold text-h5 d-flex align-center">
            <v-icon start size="32" :color="currentView.color" class="mr-3">{{ currentView.icon }}</v-icon>
            {{ currentView.title }}
          </v-toolbar-title>
        </v-toolbar>

        <v-card class="glassmorphism-card-admin">
          <v-window v-model="selectedView">
            <v-window-item value="reports" :eager="true">
              <AdminReportsTab />
            </v-window-item>
            <v-window-item value="audit" :eager="true">
              <AdminAuditTab />
            </v-window-item>
            <v-window-item value="notifications" :eager="true">
              <AdminNotificationsTab />
            </v-window-item>
            <v-window-item value="stock">
              <StockManagement />
            </v-window-item>
            <v-window-item value="prices">
              <AdminPriceListManagement />
            </v-window-item>
            <v-window-item value="users">
              <AdminUserManagement />
            </v-window-item>
          </v-window>
        </v-card>
      </div>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import StockManagement from '@/views/admin/StockManagement.vue';
import AdminAuditTab from '@/components/admin/AdminAuditTab.vue';
import AdminReportsTab from '@/components/admin/AdminReportsTab.vue';
import AdminNotificationsTab from '@/components/admin/AdminNotificationsTab.vue';
import AdminPriceListManagement from '@/components/admin/AdminPriceListManagement.vue';
import AdminUserManagement from '@/components/admin/AdminUserManagement.vue';
import AdminDashboardCard from '@/components/admin/AdminDashboardCard.vue';

const selectedView = ref<string | null>(null);

const adminViews = [
  {
    key: 'reports',
    title: 'Relatórios',
    subtitle: 'Análise de desempenho e métricas',
    icon: 'mdi-chart-line',
    color: 'primary',
  },
  {
    key: 'audit',
    title: 'Auditoria',
    subtitle: 'Histórico de pedidos e chat',
    icon: 'mdi-history',
    color: 'info',
  },
  {
    key: 'notifications',
    title: 'Notificações',
    subtitle: 'Envie alertas para a equipe',
    icon: 'mdi-bullhorn-outline',
    color: 'warning',
  },
  {
    key: 'stock',
    title: 'Estoque',
    subtitle: 'Gerencie o estoque de tecidos',
    icon: 'mdi-warehouse',
    color: 'success',
  },
  {
    key: 'prices',
    title: 'Tabela de Preços',
    subtitle: 'Edite os preços dos produtos',
    icon: 'mdi-currency-usd',
    color: 'deep-purple-lighten-1',
  },
  {
    key: 'users',
    title: 'Usuários',
    subtitle: 'Gerencie perfis e permissões',
    icon: 'mdi-account-group-outline',
    color: 'blue-grey',
  },
];

const currentView = computed(() => {
  return adminViews.find(view => view.key === selectedView.value) || { title: '', icon: '', color: '' };
});
</script>

<style scoped lang="scss">
.admin-dashboard {
  min-height: 85vh;
}

.glassmorphism-card-admin {
  background-color: rgba(20, 20, 25, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.125);
  padding: 1rem;
}

.view-content {
  animation: fadeIn 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
