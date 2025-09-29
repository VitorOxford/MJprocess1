<template>
  <div>
    <v-tabs v-model="auditTab" color="white" grow>
      <v-tab value="orders" class="sub-tab-item">Auditoria de Pedidos</v-tab>
      <v-tab value="chat" class="sub-tab-item">Auditoria de Chat</v-tab>
    </v-tabs>

    <v-window v-model="auditTab" class="mt-4">
      <v-window-item value="orders">
        <v-data-table
          :headers="headers"
          :items="orders"
          :search="search"
          :loading="loading"
          class="bg-transparent"
          item-value="id"
          density="compact"
          hover
        >
          <template v-slot:top>
            <v-text-field
              v-model="search"
              label="Buscar por Cliente, Status ou Nº do Pedido..."
              class="pa-4"
              variant="outlined"
              prepend-inner-icon="mdi-magnify"
              hide-details
              density="compact"
            ></v-text-field>
          </template>

          <template v-slot:item.order_number="{ item }">
            <span class="font-weight-bold">#{{ String(item.order_number).padStart(4, '0') }}</span>
          </template>

          <template v-slot:item.created_at="{ item }">
              {{ formatDate(item.created_at) }}
          </template>

          <template v-slot:item.status="{ item }">
              <v-chip size="small" :color="statusInfo[item.status]?.color || 'grey'" label variant="tonal" class="font-weight-bold">
                {{ statusInfo[item.status]?.text || item.status }}
              </v-chip>
          </template>

          <template v-slot:item.actions="{ item }">
            <v-btn small variant="tonal" @click="openHistoryModal(item.id)" prepend-icon="mdi-history">
              Ver Histórico
            </v-btn>
          </template>
        </v-data-table>
      </v-window-item>

      <v-window-item value="chat">
        <AdminChatAudit />
      </v-window-item>
    </v-window>

    <v-dialog v-model="showHistoryModal" max-width="800px" scrollable persistent>
      <v-card class="glassmorphism-card-dialog">
        <v-toolbar color="transparent" density="compact">
            <v-toolbar-title class="font-weight-bold">Histórico do Pedido</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" @click="showHistoryModal = false"></v-btn>
        </v-toolbar>
        <v-card-text>
            <div v-if="historyLoading" class="text-center pa-16">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>
            <v-timeline v-else side="end" align="start" truncate-line="both" density="compact">
                <v-timeline-item
                    v-for="log in orderHistory"
                    :key="log.id"
                    :dot-color="getLogIcon(log.log_type).color"
                    :icon="getLogIcon(log.log_type).icon"
                    fill-dot
                    size="small"
                >
                    <div class="d-flex justify-space-between">
                        <span class="font-weight-bold">{{ log.profiles?.full_name || 'Sistema' }}</span>
                        <span class="text-caption">{{ formatDate(log.created_at, true) }}</span>
                    </div>
                    <p class="text-body-2 my-1">{{ log.description }}</p>
                    <a v-if="log.metadata?.file_url" :href="log.metadata.file_url" target="_blank" class="text-caption cyan-link d-inline-flex align-center">
                      <v-icon size="small" class="mr-1">mdi-paperclip</v-icon> Ver anexo
                    </a>
                </v-timeline-item>
                 <v-timeline-item v-if="orderHistory.length === 0" dot-color="grey" icon="mdi-information-outline" fill-dot size="small">
                    <p class="text-body-2 my-1">Nenhum histórico registrado para este pedido ainda.</p>
                </v-timeline-item>
            </v-timeline>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/api/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AdminChatAudit from '@/components/admin/AdminChatAudit.vue';

// Types
type Order = { id: string; customer_name: string; status: string; created_at: string; order_number: number; };
type OrderLog = {
  id: number;
  created_at: string;
  log_type: string;
  description: string;
  metadata: { file_url?: string };
  profiles: { full_name: string };
};

// State
const auditTab = ref('orders');
const orders = ref<Order[]>([]);
const loading = ref(true);
const search = ref('');
const showHistoryModal = ref(false);
const historyLoading = ref(false);
const orderHistory = ref<OrderLog[]>([]);

const headers = [
  { title: 'Nº Pedido', key: 'order_number' },
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Status', key: 'status' },
  { title: 'Data Criação', key: 'created_at' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'end' },
];

const statusInfo: Record<string, { text: string; color: string }> = {
  design_pending: { text: 'Desenvolvimento', color: 'blue-grey' },
  changes_requested: { text: 'Alteração', color: 'orange' },
  finalizing: { text: 'Finalização', color: 'teal' },
  customer_approval: { text: 'Aguardando Aprovação', color: 'warning' },
  approved_by_seller: { text: 'Aprovado', color: 'green' },
  production_queue: { text: 'Fila de Produção', color: 'grey' },
  in_printing: { text: 'Em Impressão', color: 'info' },
  in_cutting: { text: 'Em Corte', color: 'purple' },
  completed: { text: 'Aguardando Faturamento', color: 'success' },
  billed: { text: 'Faturado', color: 'deep-purple-accent-2' },
  delivered: { text: 'Entregue', color: 'light-green' },
  pending_stock: { text: 'Aguardando Matéria-Prima', color: 'error' }
};

const fetchOrders = async () => {
  loading.value = true;
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) console.error('Erro ao buscar pedidos:', error);
  else orders.value = data as Order[];
  loading.value = false;
};

const openHistoryModal = async (orderId: string) => {
  showHistoryModal.value = true;
  historyLoading.value = true;
  const { data, error } = await supabase
    .from('order_logs')
    .select('*, profiles(full_name)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) console.error('Erro ao buscar histórico:', error);
  else orderHistory.value = data as any;
  historyLoading.value = false;
};

const formatDate = (dateString: string, withTime = false) => {
    const formatString = withTime ? "dd/MM/yy 'às' HH:mm" : "dd/MM/yyyy";
    return format(new Date(dateString), formatString, { locale: ptBR });
};

const getLogIcon = (logType: string) => {
   switch (logType) {
    case 'STATUS_CHANGE': return { icon: 'mdi-swap-horizontal-bold', color: 'primary' };
    case 'FILE_UPLOAD': return { icon: 'mdi-file-upload-outline', color: 'purple' };
    case 'COMMENT': return { icon: 'mdi-comment-text-outline', color: 'amber' };
    case 'ORDER_CREATED': return { icon: 'mdi-plus-box-outline', color: 'success' };
    case 'PRODUCTION_SCHEDULED': return { icon: 'mdi-calendar-check', color: 'info' };
    case 'BILLING': return { icon: 'mdi-cash-register', color: 'deep-purple-accent-2' };
    case 'DELIVERY': return { icon: 'mdi-truck-check-outline', color: 'light-green' };
    default: return { icon: 'mdi-cogs', color: 'grey' };
  }
};

onMounted(fetchOrders);
</script>

<style scoped lang="scss">
.sub-tab-item { font-size: 0.9rem; text-transform: none; }
.cyan-link {
    color: #00BCD4;
    text-decoration: none;
    &:hover { text-decoration: underline; }
}
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  background-color: rgba(30, 30, 35, 0.85);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.125);
}
:deep(.v-timeline-item__body) {
    width: 100%;
}
</style>
