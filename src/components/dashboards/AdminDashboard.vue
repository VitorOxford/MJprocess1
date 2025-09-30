<template>
  <v-container fluid>
    <v-card class="dashboard-container-card">
      <v-card-title class="pa-4">
        <div class="d-flex align-center flex-wrap ga-4">
          <div class="d-flex align-center">
            <v-icon color="primary" size="32" class="mr-3">mdi-shield-crown-outline</v-icon>
            <h1 class="text-h5 font-weight-bold">Dashboard Administrador</h1>
          </div>
          <v-spacer></v-spacer>
          <v-btn
            @click="showReportModal = true"
            color="white"
            variant="text"
            icon
          >
             <v-tooltip activator="parent" location="bottom">Relatórios Avançados</v-tooltip>
            <v-icon>mdi-cog-outline</v-icon>
          </v-btn>
        </div>
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text>
        <v-row>
           <v-col cols="12" sm="6" md="4" lg="2_4">
            <div class="kpi-stat-card clickable-kpi alert-card" @click="showApprovalModal = true">
              <div class="shine-effect"></div>
              <v-icon class="kpi-icon">mdi-check-decagram-outline</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ formatNumber(totalMetersPendingApproval) }}m</span>
                <span class="kpi-title">Metros Pend. Aprovação</span>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="4" lg="2_4">
            <div class="kpi-stat-card clickable-kpi" @click="openKpiDetailModal('delayed')" style="background: linear-gradient(45deg, #f57c00, #ff9800); color: white;">
              <v-icon class="kpi-icon">mdi-clock-alert-outline</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ itemsDelayedInDesign.count }} ({{ formatNumber(itemsDelayedInDesign.totalMeters) }}m)</span>
                <span class="kpi-title">Itens Atrasados (Design)</span>
              </div>
            </div>
          </v-col>
           <v-col cols="12" sm="6" md="4" lg="2_4">
            <div class="kpi-stat-card clickable-kpi" @click="handleStockRecheck" style="background: linear-gradient(45deg, #c62828, #e53935); color: white;">
              <v-progress-circular v-if="isRecheckingStock" indeterminate color="white" size="24" width="2" class="kpi-loading-spinner"></v-progress-circular>
              <v-icon v-else class="kpi-icon">mdi-package-variant-closed-remove</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ itemsPendingStock.count }} ({{ formatNumber(itemsPendingStock.totalMeters) }}m)</span>
                <span class="kpi-title">Aguardando Estoque</span>
              </div>
               <v-tooltip activator="parent" location="bottom">Clique para desbloquear pedidos com estoque suficiente</v-tooltip>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="6" lg="2_4">
            <div class="kpi-stat-card" style="background: linear-gradient(45deg, #6a1b9a, #9c27b0); color: white;">
              <v-icon class="kpi-icon">mdi-factory</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ formatNumber(totalMetersInProduction) }}m</span>
                <span class="kpi-title">Metragem em Aberto</span>
              </div>
            </div>
          </v-col>
          <v-col cols="12" sm="12" md="6" lg="2_4">
            <div class="kpi-stat-card clickable-kpi" @click="openKpiDetailModal('inDesign')" style="background: linear-gradient(45deg, #1e88e5, #42a5f5); color: white;">
              <v-icon class="kpi-icon">mdi-palette-swatch-outline</v-icon>
              <div class="kpi-content">
                <span class="kpi-value">{{ formatNumber(totalMetersInDesign) }}m</span>
                <span class="kpi-title">Metragem em Design</span>
              </div>
            </div>
          </v-col>
        </v-row>
         </v-card-text>
         <v-divider class="my-4"></v-divider>

      <v-card-text class="py-0">
        <v-row align="center" justify="center">
          <v-col cols="12" md="10" lg="8">
            <v-card class="monthly-kpi-card" variant="outlined">
              <div class="d-flex align-center pa-2 pa-sm-4">
                <v-btn icon="mdi-chevron-left" variant="text" @click="dashboardStore.previousMonthKpi"></v-btn>
                <v-spacer></v-spacer>
                <h3 class="text-h6 text-sm-h5 font-weight-bold text-center text-capitalize">{{ monthlyProduction.displayMonth }}</h3>
                <v-spacer></v-spacer>
                <v-btn icon="mdi-chevron-right" variant="text" @click="dashboardStore.nextMonthKpi"></v-btn>
              </div>
              <v-divider></v-divider>
              <v-row no-gutters>
                <v-col cols="6" class="text-center pa-4 pa-sm-6">
                  <div class="text-h5 text-sm-h4 font-weight-black">{{ monthlyProduction.totalOrders }}</div>
                  <div class="text-body-2 text-sm-subtitle-1 text-medium-emphasis">Pedidos no Mês</div>
                </v-col>
                <v-col cols="6" class="text-center pa-4 pa-sm-6 monthly-kpi-divider">
                  <div class="text-h5 text-sm-h4 font-weight-black">{{ formatNumber(monthlyProduction.totalMeters) }}m</div>
                  <div class="text-body-2 text-sm-subtitle-1 text-medium-emphasis">Metragem Total</div>
                </v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider class="mt-4"></v-divider>

      <v-tabs v-model="mainTab" color="primary" class="mx-2 mt-2">
        <v-tab value="list"><v-icon start>mdi-format-list-bulleted</v-icon>Lista de Pedidos</v-tab>
        <v-tab value="charts"><v-icon start>mdi-chart-pie</v-icon>Gráficos</v-tab>
      </v-tabs>

      <v-window v-model="mainTab">
        <v-window-item value="list">
            <div class="d-flex flex-wrap align-center ga-4 pa-4">
                <v-chip-group
                v-model="filterType"
                mandatory
                variant="outlined"
                >
                <v-chip filter value="current_month" color="primary">Este Mês</v-chip>
                <v-chip filter value="current_week" color="primary">Esta Semana</v-chip>
                <v-chip filter value="today" color="primary">Hoje</v-chip>
                <v-chip filter value="billing" color="success">Aguard. Faturamento</v-chip>
                <v-chip filter value="delivered" color="info">Entregues</v-chip>
                </v-chip-group>
                <v-spacer></v-spacer>
                <div class="text-subtitle-1 font-weight-bold">
                {{ filteredOrders.length }} Pedidos | {{ formatNumber(filteredMeters) }}m
                </div>
            </div>
            <v-data-table
                :headers="activeHeaders"
                :items="filteredOrders"
                class="bg-transparent"
                hover
                height="500"
                fixed-header
                :search="search"
                @click:row="(_, { item }) => { selectedOrder = item; showDetailModal = true; }"
            >
              <template v-slot:no-data>
                <div class="text-center pa-8">
                  <v-icon size="64" class="mb-4 text-medium-emphasis">mdi-magnify-close</v-icon>
                  <h4 class="text-h6">Nenhum pedido encontrado</h4>
                  <p class="text-medium-emphasis mt-2">
                    Tente ajustar os filtros ou verifique se os pedidos <br>
                    já foram movidos para a agenda de entregas.
                  </p>
                </div>
              </template>

              <template v-slot:item.quantity_meters="{ item }">
                {{ formatNumber(item.quantity_meters) }}m
              </template>
              <template v-slot:item.created_at="{ item }">
                {{ formatDate(item.created_at) }}
              </template>
              <template v-slot:item.delivery_confirmed_at="{ item }">
                {{ formatDate(item.delivery_confirmed_at) }}
              </template>
              <template v-slot:item.is_launch="{ item }">
                <v-chip size="small" :color="item.is_launch ? 'info' : 'default'">{{ item.is_launch ? 'Lançamento' : 'Único' }}</v-chip>
              </template>
              <template v-slot:item.status="{ item }">
                  <v-chip
                    :color="statusInfo[item.status]?.color || 'grey'"
                    size="small"
                    variant="tonal"
                  >{{ statusInfo[item.status]?.text || item.status }}</v-chip>
              </template>
            </v-data-table>
        </v-window-item>

        <v-window-item value="charts">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <ChartCard title="Vendas por Vendedor (Metros)">
                  <Doughnut :data="salesBySellerChartData" :options="doughnutOptions" />
                </ChartCard>
              </v-col>
              <v-col cols="12" md="4">
                <ChartCard title="Tecidos Mais Vendidos (Metros)">
                  <Doughnut :data="salesByFabricChartData" :options="doughnutOptions" />
                </ChartCard>
              </v-col>
              <v-col cols="12" md="4">
                <ChartCard title="Itens no Design">
                  <Doughnut :data="designStatusChartData" :options="doughnutOptions" />
                </ChartCard>
              </v-col>
            </v-row>
          </v-card-text>
        </v-window-item>
      </v-window>
    </v-card>

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrder?.id" @close="showDetailModal = false" />
    <ApprovalWarningModal :show="showApprovalModal" :pending-orders="ordersPendingApproval" @close="showApprovalModal = false" />
    <ReportSettingsModal
        :show="showReportModal"
        @close="showReportModal = false"
        :orders="allOrders"
        :sellers="sellerList"
        :clients="clientList"
        :fabrics="fabricList"
    />

    <v-dialog v-model="showKpiDetailModal" max-width="1000px" persistent>
       <v-card class="glassmorphism-card-dialog">
        <v-toolbar color="transparent">
            <v-toolbar-title class="font-weight-bold">{{ modalTitle }}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" @click="showKpiDetailModal = false"></v-btn>
        </v-toolbar>
        <v-card-text>
          <v-data-table
            :headers="modalHeaders"
            :items="modalItems"
            class="bg-transparent"
            density="compact"
          >
            <template v-slot:item.quantity_meters="{ value }">
              {{ formatNumber(value) }}m
            </template>
            <template v-slot:item.status="{ item }">
              <v-chip :color="getModalStatus(item).color" size="small" variant="tonal">
                {{ getModalStatus(item).text }}
              </v-chip>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="5000" location="top right">
      {{ snackbar.text }}
    </v-snackbar>

  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, defineAsyncComponent, reactive } from 'vue';
import { useDashboardStore } from '@/stores/dashboard';
import { storeToRefs } from 'pinia';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement, CategoryScale, LineElement, LinearScale, PointElement, BarElement } from 'chart.js';
import { supabase } from '@/api/supabase';

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LineElement, LinearScale, PointElement, BarElement);

// --- COMPONENTES ---
const OrderDetailModal = defineAsyncComponent(() => import('@/components/OrderDetailModal.vue'));
const ApprovalWarningModal = defineAsyncComponent(() => import('@/components/admin/ApprovalWarningModal.vue'));
const ReportSettingsModal = defineAsyncComponent(() => import('@/components/admin/ReportSettingsModal.vue'));
const Doughnut = defineAsyncComponent(() => import('vue-chartjs').then(c => c.Doughnut));
const ChartCard = defineAsyncComponent(() => import('@/components/admin/ChartCard.vue'));

// --- ESTADO ---
const showDetailModal = ref(false);
const selectedOrder = ref<any | null>(null);
const showApprovalModal = ref(false);
const showReportModal = ref(false);
const search = ref('');
const filterType = ref('current_month');
const mainTab = ref('list');

const isRecheckingStock = ref(false);
const snackbar = reactive({ show: false, text: '', color: '' });

const dashboardStore = useDashboardStore();
const {
  orders: allOrders,
  ordersPendingApproval,
  totalMetersPendingApproval,
  itemsDelayedInDesign,
  itemsPendingStock,
  totalMetersInProduction,
  totalMetersInDesign,
  completedOrders,
  deliveredOrders,
  salesBySeller,
  salesByFabric,
  designItemsStatus,
  monthlyProduction,
  delayedDesignItemsDetails,
  allDesignItemsDetails,
} = storeToRefs(dashboardStore);

const showKpiDetailModal = ref(false);
const modalTitle = ref('');
const modalItems = ref<any[]>([]);

// --- FUNÇÃO ATUALIZADA PARA CHAMAR A NOVA RPC ---
const handleStockRecheck = async () => {
    isRecheckingStock.value = true;
    snackbar.text = 'Verificando estoque para pedidos pendentes...';
    snackbar.color = 'info';
    snackbar.show = true;

    try {
        // Chama a nova função RPC 'unlock_orders_with_sufficient_stock'
        const { data, error } = await supabase.rpc('unlock_orders_with_sufficient_stock');
        if (error) throw error;

        if (data && data.length > 0) {
            const orderCount = data.length;
            const totalItemsUpdated = data.reduce((sum: number, result: any) => sum + (result.items_unlocked_count || 0), 0);
            snackbar.text = `${orderCount} pedido(s) (${totalItemsUpdated} itens) foram desbloqueados.`;
            snackbar.color = 'success';
        } else {
            snackbar.text = 'Nenhum pedido completo pôde ser desbloqueado. O estoque ainda está insuficiente.';
            snackbar.color = 'warning';
        }
        await dashboardStore.fetchData(); // Recarrega os dados do dashboard para refletir a mudança
    } catch (err: any) {
        snackbar.text = `Erro na verificação: ${err.message}`;
        snackbar.color = 'error';
    } finally {
        isRecheckingStock.value = false;
        snackbar.show = true;
    }
};


// --- LÓGICA DE FILTROS E DADOS ---

const statusInfo: Record<string, { text: string; color: string }> = {
  design_pending: { text: 'No Design', color: 'blue-grey' },
  customer_approval: { text: 'Aprovação', color: 'orange' },
  production_queue: { text: 'Fila Produção', color: 'grey' },
  completed: { text: 'Concluído', color: 'success' },
  delivered: { text: 'Entregue', color: 'info' },
  in_printing: { text: 'Impressão', color: 'cyan' },
  in_cutting: { text: 'Corte', color: 'purple' },
  changes_requested: { text: 'Alteração', color: 'error' },
  approved_by_seller: { text: 'Aprovado', color: 'green' },
  pending_stock: { text: 'Aguardando Estoque', color: 'warning' },
};

const filteredOrders = computed(() => {
  const now = new Date();
  switch (filterType.value) {
    case 'today':
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      return allOrders.value.filter(o => isWithinInterval(parseISO(o.created_at), { start: todayStart, end: todayEnd }));
    case 'current_week':
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      return allOrders.value.filter(o => isWithinInterval(parseISO(o.created_at), { start: weekStart, end: weekEnd }));
    case 'billing':
      return completedOrders.value;
    case 'delivered':
      return deliveredOrders.value;
    case 'current_month':
    default:
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      return allOrders.value.filter(o => isWithinInterval(parseISO(o.created_at), { start: monthStart, end: monthEnd }));
  }
});

const filteredMeters = computed(() => {
    return filteredOrders.value.reduce((sum, order) => sum + (order.quantity_meters || 0), 0);
});

const sellerList = computed(() => [...new Set(allOrders.value.map(o => o.creator?.full_name).filter(Boolean))]);
const clientList = computed(() => [...new Set(allOrders.value.map(o => o.customer_name).filter(Boolean))]);
const fabricList = computed(() => {
    const fabrics = new Set<string>();
    allOrders.value.forEach(order => {
        if (order.is_launch) {
            order.order_items.forEach(item => fabrics.add(item.fabric_type));
        } else if (order.details?.fabric_type) {
            fabrics.add(order.details.fabric_type);
        }
    });
    return Array.from(fabrics);
});


// --- CABEÇALHOS DA TABELA ---
const baseHeaders = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Vendedor', key: 'creator.full_name' },
  { title: 'Tipo', key: 'is_launch' },
  { title: 'Status', key: 'status', align: 'center' },
  { title: 'Metragem', key: 'quantity_meters', align: 'end' },
];

const activeHeaders = computed(() => {
  if (filterType.value === 'delivered') {
    return [...baseHeaders, { title: 'Data Entrega', key: 'delivery_confirmed_at' }];
  }
  return [...baseHeaders, { title: 'Data Lançamento', key: 'created_at' }];
});

const modalHeaders = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Vendedor', key: 'creator_name' },
  { title: 'Item (Ref.)', key: 'stamp_ref' },
  { title: 'Metragem', key: 'quantity_meters' },
  { title: 'Status Atual', key: 'status' },
];


// --- MÉTODOS E FUNÇÕES ---
const formatNumber = (value: number) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'dd/MM/yy', { locale: ptBR });
};

const getModalStatus = (item: any) => {
  const sInfo = statusInfo[item.status];
  if (sInfo) {
    if (item.status === 'design_pending' && item.design_tag) {
      return { text: item.design_tag, color: sInfo.color };
    }
    return sInfo;
  }
  return { text: item.status, color: 'grey' };
};

const openKpiDetailModal = (type: 'delayed' | 'inDesign') => {
  if (type === 'delayed') {
    modalTitle.value = 'Itens Atrasados no Design';
    modalItems.value = delayedDesignItemsDetails.value;
  } else if (type === 'inDesign') {
    modalTitle.value = 'Itens Atuais no Design';
    modalItems.value = allDesignItemsDetails.value;
  }
  showKpiDetailModal.value = true;
};

// --- LÓGICA DE GRÁFICOS ---
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { color: '#fff' }
    }
  }
};

const salesBySellerChartData = computed(() => ({
  labels: salesBySeller.value.map(s => s.seller === 'Danilo Martins' ? 'Fernanda Garcia' : s.seller),
  datasets: [{
    label: 'Metros Vendidos',
    backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#26A69A', '#FF7043'],
    data: salesBySeller.value.map(s => s.totalMeters)
  }]
}));

const salesByFabricChartData = computed(() => ({
  labels: salesByFabric.value.slice(0, 5).map(f => f.fabric),
  datasets: [{
    backgroundColor: ['#26C6DA', '#7E57C2', '#D4E157', '#FFCA28', '#8D6E63'],
    data: salesByFabric.value.slice(0, 5).map(f => f.totalMeters)
  }]
}));

const designStatusChartData = computed(() => {
  if (!designItemsStatus.value) return { labels: [], datasets: [] };
  return {
    labels: ['Em Dia', 'Atrasado'],
    datasets: [{
      backgroundColor: ['#66BB6A', '#EF5350'],
      data: [designItemsStatus.value.onTime, designItemsStatus.value.delayed]
    }]
  };
});

// --- CICLO DE VIDA ---
onActivated(async () => {
  await dashboardStore.fetchData();
});
onMounted(async () => {
  await dashboardStore.fetchData();
});
</script>

<style scoped lang="scss">
@keyframes shine {
  0% { transform: translateX(-100%) skewX(-20deg); }
  100% { transform: translateX(200%) skewX(-20deg); }
}
.dashboard-container-card {
  background-color: rgba(25, 25, 30, 0.75);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}
.kpi-stat-card {
  display: flex; align-items: center; padding: 16px;
  border-radius: 12px;
  transition: all 0.2s ease-in-out; position: relative; overflow: hidden;
  color: white;
  min-height: 110px;

  &.clickable-kpi { cursor: pointer; &:hover { transform: translateY(-4px); box-shadow: 0 8px 15px rgba(0,0,0,0.2); } }
  &.alert-card { background: linear-gradient(45deg, #d32f2f, #f44336); color: white; box-shadow: 0 4px 20px rgba(211, 47, 47, 0.4); }
  .shine-effect {
    position: absolute; top: 0; left: 0; width: 50%; height: 100%;
    background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.4) 50%, rgba(255, 255, 255, 0) 100%);
    animation: shine 3s infinite;
  }
  .kpi-loading-spinner {
    margin-right: 16px;
  }
}
.kpi-icon { font-size: 32px; margin-right: 16px; color: inherit; }
.kpi-content { display: flex; flex-direction: column; color: inherit; }
.kpi-value { font-size: 1.5rem; font-weight: 700; line-height: 1.2; color: inherit;}
.kpi-title { font-size: 0.85rem; color: inherit; opacity: 0.9;}

.monthly-kpi-card {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}
.monthly-kpi-divider {
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(40, 40, 45, 0.85) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

:deep(.v-data-table__wrapper tbody tr) {
  cursor: pointer;
  &:hover { background-color: rgba(var(--v-theme-primary-rgb), 0.1) !important; }
}
:deep(.v-data-table .v-data-table-header) {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

// Layout para 5 cards por linha em telas grandes (lg)
.v-row {
  .v-col-lg-2_4 {
    @media (min-width: 1280px) {
      width: 20%;
      flex: 0 0 20%;
      max-width: 20%;
    }
  }
}
</style>
