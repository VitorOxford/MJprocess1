<template>
  <v-container fluid>
    <v-toolbar color="transparent" class="mb-4">
      <v-toolbar-title class="font-weight-bold">
        <v-icon start>mdi-palette-swatch-outline</v-icon>
        Fila do Design
      </v-toolbar-title>
    </v-toolbar>

    <div class="kanban-board-container">
      <div class="kanban-board">
        <div v-for="column in columns" :key="column.id" class="kanban-column">
          <div class="column-header">
            <v-icon :color="column.color" class="mr-2">{{ column.icon }}</v-icon>
            <h3 class="column-title">{{ column.title }}</h3>
            <v-chip size="small" variant="tonal" class="ml-2">{{ getColumnOrders(column.statuses).length }}</v-chip>
          </div>

          <draggable
            :list="getColumnOrders(column.statuses)"
            group="orders"
            item-key="id"
            class="column-content"
            :data-status="column.statuses[0]"
            @end="onDragEnd"
          >
            <template #item="{ element: order }">
               <div :data-id="order.id">
                  <v-card
                     class="order-card mb-3"
                     elevation="2"
                  >
                     <v-card-text @click="openDetailModal(order.id)">
                       <div class="d-flex justify-space-between align-center">
                          <p class="font-weight-bold text-body-1">{{ order.customer_name }}</p>
                          <v-chip size="x-small" :color="getStatusColor(order.status)" variant="flat">{{ statusDisplayMap[order.status] }}</v-chip>
                       </div>
                       <p class="text-caption text-grey-lighten-1 mt-1">
                          {{ order.details.fabric_type }} - {{ order.quantity_meters }}m
                       </p>
                       <v-divider class="my-2"></v-divider>

                       <p class="text-caption text-truncate">{{ order.details.stamp_details }}</p>

                       <p v-if="order.status === 'changes_requested'" class="text-caption text-red-lighten-2 text-truncate font-italic d-flex align-center">
                         <v-icon size="small" start>mdi-comment-alert-outline</v-icon>
                         Alteração: {{ getLatestChangeComment(order) }}
                       </p>
                       <p v-else class="text-caption text-truncate">{{ order.details.stamp_details }}</p>

                     </v-card-text>

                     <v-card-actions v-if="['finalizing', 'customer_approval'].includes(order.status)" class="pa-2">
                       <v-spacer></v-spacer>
                       <v-btn
                         size="small"
                         variant="tonal"
                         color="cyan"
                         @click.stop="openUploadModalForOrder(order)"
                       >
                         <v-icon start size="small">mdi-upload-outline</v-icon>
                         Anexar Arte
                       </v-btn>
                     </v-card-actions>
                  </v-card>
               </div>
            </template>
          </draggable>

          <div v-if="getColumnOrders(column.statuses).length === 0 && !loading" class="empty-column text-center text-grey">
              Nenhum pedido aqui.
          </div>
        </div>
      </div>
    </div>

     <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-4">Buscando pedidos...</p>
     </div>

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrderId" @close="showDetailModal = false" />
    <FileUploadModal :show="showUploadModal" :order="selectedOrder" :title="uploadModalTitle" @close="showUploadModal = false" @uploaded="handleUploadSuccess" />

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase } from '@/api/supabase';
import draggable from 'vuedraggable';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import FileUploadModal from '@/components/FileUploadModal.vue';
import { useUserStore } from '@/stores/user';
import type { RealtimeChannel } from '@supabase/supabase-js';

type DesignStatus = 'design_pending' | 'in_design' | 'changes_requested' | 'finalizing' | 'customer_approval';
type Order = {
  id: string;
  customer_name: string;
  quantity_meters: number;
  status: DesignStatus;
  created_by: string;
  details: {
    stamp_details: string;
    fabric_type: string;
    final_art_url?: string;
  };
  order_logs?: { description: string, created_at: string }[];
};

const orders = ref<Order[]>([]);
const loading = ref(true);
const userStore = useUserStore();
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const showUploadModal = ref(false);
const selectedOrder = ref<Order | null>(null);
const uploadModalTitle = ref('');
const ordersListener = ref<RealtimeChannel | null>(null);

const columns = ref([
  { id: 1, title: 'Fila de Espera', icon: 'mdi-clock-outline', color: 'blue-grey', statuses: ['design_pending'] },
  { id: 2, title: 'Em Desenvolvimento', icon: 'mdi-pencil-ruler', color: 'blue', statuses: ['in_design'] },
  { id: 3, title: 'Alteração Solicitada', icon: 'mdi-alert-circle-outline', color: 'red', statuses: ['changes_requested'] },
  { id: 4, title: 'Finalização', icon: 'mdi-star-outline', color: 'purple', statuses: ['finalizing'] },
  { id: 5, title: 'Aprovação Pendente', icon: 'mdi-send-check-outline', color: 'orange', statuses: ['customer_approval'] },
]);

const statusDisplayMap: Record<DesignStatus, string> = {
    design_pending: 'Aguardando Design', in_design: 'Em Design', changes_requested: 'Em Alteração',
    finalizing: 'Finalizando', customer_approval: 'Aprovação Pendente'
};

const getColumnOrders = (statuses: DesignStatus[]) => {
    return orders.value.filter(order => statuses.includes(order.status));
};

const getStatusColor = (status: DesignStatus) => columns.value.find(c => c.statuses.includes(status))?.color || 'grey';

const openDetailModal = (orderId: string) => {
    selectedOrderId.value = orderId;
    showDetailModal.value = true;
};

const openUploadModalForOrder = (order: Order) => {
  selectedOrder.value = order;
  uploadModalTitle.value = `Anexar Arte para "${order.customer_name}"`;
  showUploadModal.value = true;
};

const onDragEnd = async (event: any) => {
    const { item, to } = event;
    const orderId = item.dataset?.id;
    const newStatus = to.getAttribute('data-status') as DesignStatus;

    if (!orderId || !newStatus) return;

    const order = orders.value.find(o => o.id === orderId);
    if (!order || order.status === newStatus) return;

    await updateOrderStatus(order.id, newStatus, order);
};

const handleUploadSuccess = async (fileUrl: string) => {
    if (!selectedOrder.value) return;

    const success = await updateOrderStatus(selectedOrder.value.id, selectedOrder.value.status, selectedOrder.value, fileUrl);

    if (success) {
      const orderIndex = orders.value.findIndex(o => o.id === selectedOrder.value?.id);
      if(orderIndex !== -1 && orders.value[orderIndex].details) {
          orders.value[orderIndex].details.final_art_url = fileUrl;
      }
    }

    showUploadModal.value = false;
    selectedOrder.value = null;
};

const getLatestChangeComment = (order: Order): string => {
  if (order.order_logs && order.order_logs.length > 0) {
    const latestLog = order.order_logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return latestLog.description;
  }
  return 'Detalhes da alteração não encontrados.';
};

const updateOrderStatus = async (orderId: string, newStatus: DesignStatus, order: Order, fileUrl?: string): Promise<boolean> => {
  try {
    if (!userStore.profile) {
      console.error('Perfil do usuário não disponível para atualizar o status.');
      return false;
    }

    let updateData: any = { status: newStatus, designer_id: userStore.profile.id };
    if (fileUrl) {
        updateData.details = { ...order.details, final_art_url: fileUrl };
    }

    const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);
    if (error) {
        console.error("Erro ao atualizar status do pedido no DB:", error);
        throw error;
    }

    // --- ADIÇÃO DO LOG DE AUDITORIA ---
    const statusText = statusDisplayMap[newStatus] || newStatus;
    const logDescription = `Status alterado para "${statusText}" pelo designer.`;

    await supabase.from('order_logs').insert({
      order_id: orderId,
      profile_id: userStore.profile.id,
      log_type: 'STATUS_CHANGE',
      description: logDescription,
    });
    // --- FIM DA ADIÇÃO ---

    const orderIndex = orders.value.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        orders.value[orderIndex].status = newStatus;
        if (fileUrl && orders.value[orderIndex].details) {
            orders.value[orderIndex].details.final_art_url = fileUrl;
        }
    }

    if (newStatus === 'customer_approval') {
        await notifyStakeholders(order, fileUrl);
    }
    return true;
  } catch (err) {
    console.error('Erro ao atualizar status do pedido:', err);
    return false;
  }
};

const notifyStakeholders = async (order: Order, fileUrl?: string) => {
    if (!userStore.profile) return;

    try {
        const { data: usersToNotify, error: fetchUsersError } = await supabase
            .from('profiles')
            .select('id')
            .in('role', ['vendedor', 'admin']);

        if (fetchUsersError) throw fetchUsersError;
        if (!usersToNotify || usersToNotify.length === 0) return;

        let content = `A arte para o pedido de "${order.customer_name}" está pronta para aprovação.`;
        if (fileUrl) content += ` Uma nova versão do arquivo foi anexada.`;

        const notifications = usersToNotify.map(user => ({
            recipient_id: user.id,
            sender_id: userStore.profile!.id,
            content: content,
            redirect_url: `/pedidos/${order.id}/aprovar`
        }));

        const { error: notificationError } = await supabase.from('notifications').insert(notifications);
        if (notificationError) throw notificationError;

    } catch (error) {
        console.error('Erro ao notificar stakeholders:', error);
    }
};

const fetchOrdersForDesign = async () => {
  loading.value = true;
  try {
    const relevantStatuses = columns.value.flatMap(c => c.statuses);

    const { data, error } = await supabase
        .from('orders')
        .select('*, order_logs(created_at, description)')
        .in('status', relevantStatuses);

    if (error) throw error;
    orders.value = data as Order[];
  } catch (err) {
    console.error('Erro ao buscar pedidos para design:', err);
  } finally {
    loading.value = false;
  }
};

const setupOrdersListener = () => {
    ordersListener.value = supabase
        .channel('public:orders:design-kanban')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            fetchOrdersForDesign();
        })
        .subscribe();
}

onMounted(async () => {
  if (!userStore.profile) {
    await userStore.fetchSession();
  }
  fetchOrdersForDesign();
  setupOrdersListener();
});

onUnmounted(() => {
    if (ordersListener.value) {
        supabase.removeChannel(ordersListener.value);
    }
});
</script>

<style scoped lang="scss">
.kanban-board-container {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 16px;
}

.kanban-board {
  display: flex;
  gap: 16px;
  min-width: fit-content;
}
.kanban-column {
  width: 300px;
  min-width: 300px;
  background-color: rgba(25, 25, 30, 0.5);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 200px);
}
.column-header {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  flex-shrink: 0;
  .column-title { font-size: 1rem; font-weight: bold; }
}
.column-content {
  padding: 16px;
  flex-grow: 1;
  min-height: 200px;
  overflow-y: auto;
}
.order-card {
  cursor: grab;
  background-color: rgba(45, 45, 55, 0.8);
  transition: all 0.2s ease-in-out;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
  }
}
.empty-column { padding: 2rem; }

@media (max-width: 600px) {
    .kanban-column {
        width: 80vw;
        min-width: 80vw;
    }
    .order-card .v-card-text {
        padding: 12px;
    }
}
</style>
