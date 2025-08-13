<template>
  <v-container fluid>
    <v-card class="dashboard-container-card">
      <v-card-title class="pa-4">
        <div class="d-flex align-center">
          <v-icon color="primary" size="32" class="mr-3">mdi-shield-crown-outline</v-icon>
          <h1 class="text-h5 font-weight-bold">Dashboard Administrador</h1>
        </div>
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-stat-card">
              <v-icon class="kpi-icon" color="blue-grey-darken-1">mdi-ruler-square-compass</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ totalMetersInPipeline.toLocaleString('pt-BR') }}m</span>
                <span class="kpi-title">Metragem Total (Todos os lançamentos)</span>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-stat-card">
              <v-icon class="kpi-icon" color="blue-darken-1">mdi-factory</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ totalMetersInProduction.toLocaleString('pt-BR') }}m</span>
                <span class="kpi-title">Metragem em Produção (Design e Produção)</span>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-stat-card">
              <v-icon class="kpi-icon" color="cyan-darken-1">mdi-set-square</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ metersInProductionMesa.toLocaleString('pt-BR') }}m</span>
                <span class="kpi-title">Produção MESA</span>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <div class="kpi-stat-card">
              <v-icon class="kpi-icon" color="amber-darken-2">mdi-chart-line-variant</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ metersInProductionCorrida.toLocaleString('pt-BR') }}m</span>
                <span class="kpi-title">Produção CORRIDA</span>
              </div>
            </div>
          </v-col>
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
            <v-data-table-virtual
              :headers="headers"
              :items="activeOrders"
              class="bg-transparent"
              hover
              height="450"
            >
              <template v-slot:item="{ item }">
                <tr class="table-row" @click="selectedOrder = item; showDetailModal = true">
                  <td>{{ item.customer_name }}</td>
                  <td>{{ item.stores?.name || 'N/A' }}</td>
                  <td>{{ formatDate(item.created_at) }}</td>
                  <td>
                    <v-chip size="small" :color="statusColorMap[item.status]" label>{{ statusDisplayMap[item.status] }}</v-chip>
                  </td>
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
                  <td>
                    <v-chip size="small" :color="statusColorMap[item.status]" label>{{ statusDisplayMap[item.status] }}</v-chip>
                  </td>
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
                  <td>
                    <v-chip size="small" :color="statusColorMap[item.status]" label>{{ statusDisplayMap[item.status] }}</v-chip>
                  </td>
                </tr>
              </template>
             </v-data-table-virtual>
          </v-window-item>
        </v-window>
      </div>
    </v-card>

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrder?.id" @close="showDetailModal = false" />
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { storeToRefs } from 'pinia';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tab = ref('all');
const showDetailModal = ref(false);
const selectedOrder = ref<any | null>(null);

const dashboardStore = useDashboardStore();
const {
  // GETTERS ATUALIZADOS
  totalMetersInPipeline,
  totalMetersInProduction,
  metersInProductionMesa,
  metersInProductionCorrida,
  orders // Pegamos a lista completa de pedidos
} = storeToRefs(dashboardStore);

const headers = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Loja', key: 'store_name' },
  { title: 'Lançamento', key: 'created_at' },
  { title: 'Status', key: 'status' },
];

const statusDisplayMap: Record<string, string> = {
    design_pending: 'Aguardando Design', in_design: 'Em Design', changes_requested: 'Em Alteração',
    finalizing: 'Finalizando', customer_approval: 'Aprovação Pendente', production_queue: 'Na Fila',
    in_printing: 'Impressão', in_cutting: 'Corte', completed: 'Finalizado'
};
const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey', in_design: 'blue', changes_requested: 'red',
    finalizing: 'purple', customer_approval: 'orange', production_queue: 'grey',
    in_printing: 'blue', in_cutting: 'orange', completed: 'green'
};

const activeOrders = computed(() => {
    return orders.value
        .filter(order => order.status !== 'completed')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
});

const designFilteredOrders = computed(() => {
    const designStatuses = ['design_pending', 'in_design', 'customer_approval', 'changes_requested', 'finalizing'];
    return activeOrders.value.filter(o => designStatuses.includes(o.status));
});

const productionFilteredOrders = computed(() => {
    const productionStatuses = ['production_queue', 'in_printing', 'in_cutting'];
    return activeOrders.value.filter(o => productionStatuses.includes(o.status));
});

const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd/MM/yy', { locale: ptBR });
}
</script>

<style scoped lang="scss">
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
  background-color: rgba(245, 245, 245, 1); /* Cinza bem claro, sólido */
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease-in-out;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 15px rgba(0,0,0,0.1);
  }
}

.kpi-icon {
  font-size: 32px;
  margin-right: 16px;
}

.kpi-content {
  display: flex;
  flex-direction: column;
}

.kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1E1E1E; /* Texto bem escuro */
  line-height: 1.2;
}

.kpi-title {
  font-size: 0.85rem;
  color: #616161; /* Texto secundário escuro */
}

:deep(.v-data-table-virtual__table .v-data-table-header) {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

.table-row {
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(var(--v-theme-primary-rgb), 0.15) !important;
  }
}
</style>
