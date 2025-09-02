<template>
  <v-container fluid>
    <v-card class="dashboard-container-card">
      <v-card-title class="pa-4">
        <div class="d-flex align-center flex-wrap">
          <div class="d-flex align-center">
            <v-icon color="primary" size="32" class="mr-3">mdi-shield-crown-outline</v-icon>
            <h1 class="text-h5 font-weight-bold">Dashboard Administrador</h1>
          </div>
          <v-spacer></v-spacer>

          <v-btn
            :color="editMode ? 'success' : 'white'"
            variant="outlined"
            class="ml-4 mt-2 mt-sm-0"
            @click="editMode = !editMode"
          >
            <v-icon start>{{ editMode ? 'mdi-check' : 'mdi-pencil-outline' }}</v-icon>
            {{ editMode ? 'Concluir' : 'Personalizar' }}
          </v-btn>

          <v-menu v-if="editMode && hiddenCards.length > 0">
            <template v-slot:activator="{ props }">
              <v-btn v-bind="props" color="white" variant="text" class="ml-2 mt-2 mt-sm-0">
                <v-icon start>mdi-eye-outline</v-icon>
                Restaurar
              </v-btn>
            </template>
            <v-list>
              <v-list-item v-for="card in hiddenCards" :key="card.id" @click="toggleCardVisibility(card.id)">
                <v-list-item-title>{{ card.title }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text>
        <v-row>
            <draggable
              v-model="kpiCards"
              item-key="id"
              class="d-flex flex-wrap w-100"
              handle=".drag-handle"
              :disabled="!editMode"
              @end="saveLayout"
            >
              <template #item="{ element: card }">
                <v-col v-if="card.visible" cols="12" sm="6" md="4">
                  <div
                    class="kpi-stat-card"
                    :class="{
                      'clickable-kpi': card.clickable && !editMode,
                      'edit-mode': editMode,
                      'alert-card': card.style === 'alert',
                      'success-card': card.style === 'success'
                    }"
                    @click="!editMode && card.action ? card.action() : null"
                  >
                    <div v-if="editMode" class="edit-overlay">
                      <v-btn
                        icon="mdi-drag-vertical"
                        size="small"
                        variant="text"
                        class="drag-handle"
                        title="Arrastar para reordenar"
                      ></v-btn>
                      <v-btn
                        icon="mdi-eye-off-outline"
                        size="x-small"
                        variant="text"
                        class="hide-btn"
                        @click.stop="toggleCardVisibility(card.id)"
                        title="Ocultar card"
                      ></v-btn>
                    </div>

                    <div v-if="card.style === 'alert'" class="shine-effect"></div>
                    <v-icon class="kpi-icon" :color="card.style ? 'white' : card.color">{{ card.icon }}</v-icon>
                    <div class="kpi-content">
                      <span class="kpi-value" :class="{ 'text-white': card.style }">{{ card.value.toLocaleString('pt-BR') }}{{ card.unit }}</span>
                      <span class="kpi-title" :class="{ 'text-white': card.style }">{{ card.title }}</span>
                    </div>
                  </div>
                </v-col>
              </template>
            </draggable>
        </v-row>
      </v-card-text>
      <v-divider></v-divider>

      <div class="pa-2">
        <v-tabs v-model="tab" color="primary" class="mb-2">
          <v-tab value="all">Todos os Pedidos</v-tab>
          <v-tab value="design">Em Design</v-tab>
          <v-tab value="production">Em Produção</v-tab>
        </v-tabs>
        <v-window v-model="tab">
          <v-window-item value="all">
            <v-data-table-virtual :headers="headers" :items="activeOrders" class="bg-transparent" hover height="450">
              <template v-slot:item="{ item }">
                <tr class="table-row" @click="selectedOrder = item; showDetailModal = true">
                  <td>{{ item.customer_name }}</td>
                  <td>{{ item.stores?.name || 'N/A' }}</td>
                  <td class="text-end">{{ item.quantity_meters }}m</td>
                  <td>{{ formatDate(item.created_at) }}</td>
                  <td><v-chip size="small" :color="statusColorMap[item.status]" label>{{ statusDisplayMap[item.status] || item.status }}</v-chip></td>
                </tr>
              </template>
            </v-data-table-virtual>
          </v-window-item>
          <v-window-item value="design">
             <v-data-table-virtual :headers="headers" :items="designFilteredOrders" class="bg-transparent" hover height="450">
               <template v-slot:item="{ item }">
                <tr class="table-row" @click="selectedOrder = item; showDetailModal = true">
                  <td>{{ item.customer_name }}</td>
                  <td>{{ item.stores?.name || 'N/A' }}</td>
                  <td>{{ formatDate(item.created_at) }}</td>
                  <td><v-chip size="small" :color="statusColorMap[item.status]" label>{{ statusDisplayMap[item.status] || item.status }}</v-chip></td>
                </tr>
              </template>
             </v-data-table-virtual>
          </v-window-item>
          <v-window-item value="production">
             <v-data-table-virtual :headers="headers" :items="productionFilteredOrders" class="bg-transparent" hover height="450">
               <template v-slot:item="{ item }">
                <tr class="table-row" @click="selectedOrder = item; showDetailModal = true">
                  <td>{{ item.customer_name }}</td>
                  <td>{{ item.stores?.name || 'N/A' }}</td>
                  <td>{{ formatDate(item.created_at) }}</td>
                  <td><v-chip size="small" :color="statusColorMap[item.status]" label>{{ statusDisplayMap[item.status] || item.status }}</v-chip></td>
                </tr>
              </template>
             </v-data-table-virtual>
          </v-window-item>
        </v-window>
      </div>
    </v-card>

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrder?.id" @close="showDetailModal = false" />
    <ApprovalWarningModal :show="showApprovalModal" :pending-orders="ordersPendingApproval" @close="showApprovalModal = false" />

    <v-dialog v-model="showDownPaymentModal" max-width="800px">
        <v-card class="glassmorphism-card-dialog">
            <v-toolbar color="transparent">
                <v-toolbar-title class="font-weight-bold">Pedidos com Entrada</v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn icon="mdi-close" @click="showDownPaymentModal = false"></v-btn>
            </v-toolbar>
            <v-card-text>
                <v-data-table
                    :headers="downPaymentHeaders"
                    :items="ordersWithDownPayment"
                    class="bg-transparent"
                >
                    <template v-slot:item.creator.full_name="{ item }">
                        {{ item.creator?.full_name || 'N/A' }}
                    </template>
                    <template v-slot:item.quantity_meters="{ item }">
                        {{ item.quantity_meters }}m
                    </template>
                    <template v-slot:item.down_payment_proof_url="{ item }">
                        <v-btn
                            v-if="item.down_payment_proof_url"
                            :href="getProofUrl(item.down_payment_proof_url)"
                            target="_blank"
                            icon="mdi-receipt-text-check-outline"
                            variant="text"
                            color="cyan"
                        ></v-btn>
                    </template>
                </v-data-table>
            </v-card-text>
        </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { storeToRefs } from 'pinia';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/api/supabase';
import draggable from 'vuedraggable';

const ApprovalWarningModal = defineAsyncComponent(() => import('@/components/admin/ApprovalWarningModal.vue'));

const tab = ref('all');
const showDetailModal = ref(false);
const selectedOrder = ref<any | null>(null);
const showApprovalModal = ref(false);
const showDownPaymentModal = ref(false);
const editMode = ref(false);
const kpiCards = ref<any[]>([]);

const dashboardStore = useDashboardStore();
const {
  totalMetersAllTime,
  totalMetersInProduction,
  metersInProductionMesa,
  metersInProductionCorrida,
  orders,
  totalMetersPendingApproval,
  ordersPendingApproval,
  totalMetersCurrentMonth,
} = storeToRefs(dashboardStore);

const defaultKpiCards = computed(() => [
  { id: 'pendingApproval', title: 'Metros Pend. Aprovação', icon: 'mdi-check-decagram-outline', value: totalMetersPendingApproval.value, unit: 'm', clickable: true, style: 'alert', action: () => showApprovalModal.value = true, visible: true },
  { id: 'downPayments', title: 'Pedidos com Entrada', icon: 'mdi-cash-check', value: ordersWithDownPayment.value.length, unit: '', clickable: true, style: 'success', action: () => showDownPaymentModal.value = true, visible: true },
  { id: 'inProduction', title: 'Metragem em Produção', icon: 'mdi-factory', value: totalMetersInProduction.value, unit: 'm', color: 'blue-darken-1', visible: true },
  { id: 'mesa', title: 'Produção MESA', icon: 'mdi-set-square', value: metersInProductionMesa.value, unit: 'm', color: 'cyan-darken-1', visible: true },
  { id: 'corrida', title: 'Produção CORRIDA', icon: 'mdi-chart-line-variant', value: metersInProductionCorrida.value, unit: 'm', color: 'amber-darken-2', visible: true },
  { id: 'monthlyMeters', title: 'Metragem do Mês', icon: 'mdi-calendar-month-outline', value: totalMetersCurrentMonth.value, unit: 'm', color: 'green-darken-1', visible: true },
  { id: 'totalMeters', title: 'Metragem Total (Geral)', icon: 'mdi-ruler-square-compass', value: totalMetersAllTime.value, unit: 'm', color: 'blue-grey-darken-1', visible: true },
]);

const hiddenCards = computed(() => kpiCards.value.filter(card => !card.visible));

const saveLayout = () => {
  const layout = kpiCards.value.map(card => ({ id: card.id, visible: card.visible }));
  localStorage.setItem('adminDashboardLayout', JSON.stringify(layout));
};

const toggleCardVisibility = (cardId: string) => {
  const card = kpiCards.value.find(c => c.id === cardId);
  if (card) {
    card.visible = !card.visible;
    saveLayout();
  }
};

onMounted(() => {
  const savedLayoutRaw = localStorage.getItem('adminDashboardLayout');
  const allDefaultCards = defaultKpiCards.value;

  if (savedLayoutRaw) {
    const savedLayout: { id: string, visible: boolean }[] = JSON.parse(savedLayoutRaw);
    const savedCardMap = new Map(savedLayout.map(item => [item.id, item]));

    const orderedCards: any[] = [];
    savedLayout.forEach(savedItem => {
      const defaultCard = allDefaultCards.find(c => c.id === savedItem.id);
      if (defaultCard) {
        orderedCards.push({ ...defaultCard, visible: savedItem.visible });
      }
    });

    allDefaultCards.forEach(defaultCard => {
      if (!savedCardMap.has(defaultCard.id)) {
        orderedCards.push(defaultCard);
      }
    });
    kpiCards.value = orderedCards;

  } else {
    kpiCards.value = allDefaultCards;
  }
});


const headers = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Loja', key: 'stores.name' },
  { title: 'Metragem', key: 'quantity_meters', align: 'end' },
  { title: 'Lançamento', key: 'created_at' },
  { title: 'Status', key: 'status' },
];

const downPaymentHeaders = [
    { title: 'Cliente', key: 'customer_name' },
    { title: 'Vendedor', key: 'creator.full_name' },
    { title: 'Metragem', key: 'quantity_meters' },
    { title: 'Comprovante', key: 'down_payment_proof_url', sortable: false, align: 'center' },
];

// *** CORREÇÃO APLICADA AQUI: Adicionando status antigos ao mapeamento ***
const statusDisplayMap: Record<string, string> = {
    design_pending: 'Aguardando Design',
    in_design: 'Em Design',
    changes_requested: 'Em Alteração',
    finalizing: 'Finalizando',
    customer_approval: 'Aprovação Pendente',
    approved_by_designer: 'Aprovado (Designer)', // STATUS ANTIGO
    approved_by_seller: 'Aprovado (Vendedor)',   // STATUS ANTIGO
    production_queue: 'Na Fila',
    in_printing: 'Impressão',
    in_cutting: 'Corte',
    completed: 'Finalizado',
    pending_stock: 'Aguardando Matéria-Prima'
};

// *** CORREÇÃO APLICADA AQUI: Adicionando cores para os status antigos ***
const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey',
    in_design: 'blue',
    changes_requested: 'red',
    finalizing: 'purple',
    customer_approval: 'orange',
    approved_by_designer: 'teal',           // COR PARA STATUS ANTIGO
    approved_by_seller: 'green-lighten-1',  // COR PARA STATUS ANTIGO
    production_queue: 'grey',
    in_printing: 'blue',
    in_cutting: 'orange',
    completed: 'green',
    pending_stock: 'error'
};

const activeOrders = computed(() => {
    return orders.value
        .filter(order => order.status !== 'completed')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
});

// *** CORREÇÃO APLICADA AQUI: Adicionando status antigos ao filtro de Design ***
const designFilteredOrders = computed(() => {
    const designStatuses = [
        'design_pending', 'in_design', 'customer_approval', 'changes_requested', 'finalizing',
        'approved_by_designer', 'approved_by_seller'
    ];
    return activeOrders.value.filter(o => designStatuses.includes(o.status));
});

const productionFilteredOrders = computed(() => {
    const productionStatuses = ['production_queue', 'in_printing', 'in_cutting', 'pending_stock'];
    return activeOrders.value.filter(o => productionStatuses.includes(o.status));
});

const ordersWithDownPayment = computed(() => {
    return orders.value.filter(o => o.has_down_payment);
});

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd/MM/yy', { locale: ptBR });
};

const getProofUrl = (path: string) => {
    const { data } = supabase.storage.from('proofs').getPublicUrl(path);
    return data.publicUrl;
}
</script>

<style scoped lang="scss">
@keyframes shine {
  0% { transform: translateX(-100%) skewX(-20deg); }
  100% { transform: translateX(200%) skewX(-20deg); }
}

.dashboard-container-card {
  background-color: rgba(25, 25, 30, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}

.kpi-stat-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background-color: rgba(245, 245, 245, 1);
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: hidden;

  &.edit-mode {
    cursor: grab;
    border: 1px dashed rgba(255, 255, 255, 0.3);
    &:active {
      cursor: grabbing;
      background-color: rgba(200, 200, 200, 1);
    }
  }

  .edit-overlay {
    position: absolute;
    top: 4px;
    left: 4px;
    right: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 10;

    .drag-handle {
      cursor: grab;
    }

    .hide-btn {
      background-color: rgba(0,0,0,0.2);
    }
  }

  &.clickable-kpi {
    cursor: pointer;
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 15px rgba(0,0,0,0.1);
    }
  }

  &.alert-card {
    background: linear-gradient(45deg, #d32f2f, #f44336);
    color: white;
    box-shadow: 0 4px 20px rgba(211, 47, 47, 0.4);
  }

  &.success-card {
    background: linear-gradient(45deg, #4CAF50, #66BB6A);
    color: white;
    box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
  }

  .kpi-title, .kpi-value {
    color: #1E1E1E;
    &.text-white { color: white; }
  }

  .shine-effect {
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 100%;
    background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0) 100%);
    animation: shine 3s infinite;
  }
}

.kpi-icon { font-size: 32px; margin-right: 16px; }
.kpi-content { display: flex; flex-direction: column; }
.kpi-value { font-size: 1.75rem; font-weight: 700; line-height: 1.2; }
.kpi-title { font-size: 0.85rem; }
.table-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
  &:hover { background-color: rgba(var(--v-theme-primary-rgb), 0.15) !important; }
}
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
:deep(.v-data-table-virtual__table .v-data-table-header) {
  background-color: rgba(255, 255, 255, 0.05) !important;
}
</style>
