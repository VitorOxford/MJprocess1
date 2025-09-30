<template>
  <v-container fluid class="pa-md-6 pa-4">
    <v-row>
      <v-col cols="12" lg="8">
        <div class="main-content-area">
          <v-toolbar color="transparent" class="mb-6 px-0">
            <v-toolbar-title class="font-weight-bold">Meu Desempenho</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn
              color="secondary"
              variant="tonal"
              prepend-icon="mdi-image-edit-outline"
              class="mr-4"
              @click="openEditor"
              :loading="loadingEditorToken"
            >
              Editor de Imagens
            </v-btn>
            <v-btn :to="{ name: 'NewOrder' }" color="primary" variant="flat" prepend-icon="mdi-plus-box-outline">
              Lançar Pedido
            </v-btn>
          </v-toolbar>
          <v-alert v-if="editorError" type="error" closable @click:close="editorError = null" class="mb-4">
            {{ editorError }}
          </v-alert>

          <div class="kpi-grid">
             <div class="kpi-card-v4 clickable-kpi" style="--kpi-color: #FFAB40;" @click="goToApprovals">
                <div class="aurora-background"></div>
                <v-icon class="kpi-icon">mdi-check-decagram-outline</v-icon>
                <div class="kpi-text">
                    <div class="kpi-value">{{ itemsPendingSellerApprovalCount }}</div>
                    <div class="kpi-title">Aprovações</div>
                </div>
            </div>
            <div class="kpi-card-v4" style="--kpi-color: #7E57C2;">
                <div class="aurora-background"></div>
                <v-icon class="kpi-icon">mdi-ruler-square</v-icon>
                <div class="kpi-text">
                    <div class="kpi-value">{{ formatMeters(monthlyMetrics.totalMeters) }}m</div>
                    <div class="kpi-title">Metragem (Mês)</div>
                </div>
            </div>
            <div class="kpi-card-v4" style="--kpi-color: #50C9C2;">
                <div class="aurora-background"></div>
                <v-icon class="kpi-icon">mdi-chart-line</v-icon>
                <div class="kpi-text">
                    <div class="kpi-value">{{ formatMeters(monthlyMetrics.averageMeters) }}m</div>
                    <div class="kpi-title">Ticket Médio (Mês)</div>
                </div>
            </div>
            <div class="kpi-card-v4" style="--kpi-color: #FF5D55;">
              <div class="aurora-background"></div>
              <v-icon class="kpi-icon">mdi-account-plus-outline</v-icon>
              <div class="kpi-text">
                <div class="kpi-title">Novos Clientes (Mês)</div>
                <div class="kpi-value">{{ monthlyMetrics.newClients }}</div>
              </div>
            </div>
            <div class="kpi-card-v4" style="--kpi-color: #42A5F5;">
                <div class="aurora-background"></div>
                <div class="kpi-progress">
                    <v-progress-circular
                        :model-value="monthlyMetrics.goalPercentage"
                        :size="50"
                        :width="5"
                        color="white"
                    >
                      <span class="kpi-progress-percent">{{ Math.round(monthlyMetrics.goalPercentage) }}%</span>
                    </v-progress-circular>
                </div>
                <div class="kpi-text">
                    <div class="kpi-title">Meta Mensal</div>
                    <div class="kpi-value">{{ formatMeters(monthlyMetrics.totalMeters) }}m</div>
                </div>
            </div>
          </div>

          <v-row class="mt-6">
            <v-col cols="12" xl="8">
              <v-card class="main-panel-card h-100" variant="flat">
                <v-card-title class="d-flex align-center">
                  <span class="font-weight-bold">Desempenho de Vendas (Últimos 30 dias)</span>
                  <v-spacer></v-spacer>
                  <v-chip color="primary" variant="tonal">
                    <v-icon start>mdi-calendar-month</v-icon>
                    {{ myThirtyDaySales.labels[0] }} - {{ myThirtyDaySales.labels[myThirtyDaySales.labels.length - 1] }}
                  </v-chip>
                </v-card-title>
                <v-card-text class="chart-container">
                  <Bar :data="salesChartData" :options="chartOptions" />
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" xl="4">
              <v-card class="main-panel-card h-100" variant="flat">
                <v-card-title class="font-weight-bold">Ranking de Vendedores (Mês)</v-card-title>
                <v-card-text class="d-flex align-center justify-center pa-4">
                  <div class="podium-container">
                    <div v-if="sellerRanking.length < 1" class="text-center text-grey">Nenhuma venda registrada.</div>
                    <div v-for="seller in sellerRanking.slice(0, 3)" :key="seller.rank" :class="`podium-item rank-${seller.rank}`">
                      <v-avatar :image="seller.avatar_url" size="70" class="podium-avatar"></v-avatar>
                      <div class="podium-name">{{ seller.seller }}</div>
                      <div class="podium-value">{{ formatMeters(seller.totalMeters) }}m</div>
                      <div class="podium-base">
                        <v-icon v-if="seller.rank === 1" color="amber-lighten-1">mdi-trophy</v-icon>
                        <span class="podium-rank">{{ seller.rank }}</span>
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-card class="main-panel-card mt-6" variant="flat">
            <v-card-title class="font-weight-bold">Meus Lançamentos Ativos</v-card-title>
            <v-data-table
              :headers="headers"
              :items="myActiveLaunchOrders"
              class="bg-transparent"
              item-value="id"
              density="compact"
              no-data-text="Nenhum lançamento ativo."
            >
              <template v-slot:item.order_number="{ item }">
                <span class="font-weight-bold">#{{ String(item.order_number).padStart(4, '0') }}</span>
              </template>
              <template v-slot:item.created_at="{ value }">
                <span>{{ formatDate(value) }}</span>
              </template>
              <template v-slot:item.status="{ value, item }">
                <v-chip size="small" :color="statusColorMap[value]" label>{{ statusDisplayMap[value] || value }}</v-chip>
                <v-btn v-if="value === 'customer_approval'" :to="{ name: 'ApproveOrder', params: { id: item.id } }" color="orange" size="small" variant="tonal" class="ml-2">
                  Aprovar
                </v-btn>
              </template>
              <template v-slot:item.quantity_meters="{ value }">
                <v-chip color="blue-grey" variant="tonal" size="small">{{ formatMeters(value) }}m</v-chip>
              </template>
            </v-data-table>
          </v-card>
        </div>
      </v-col>

      <v-col cols="12" lg="4">
        <aside class="sidebar-sticky-content">
          <SalesMapBrazil :sales-data="salesByRegion" :sellers="sellersByRegion" />
        </aside>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { useDashboardStore, type Order } from '@/stores/dashboard';
import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';
import { supabase } from '@/api/supabase';
import { startOfMonth, isWithinInterval, parseISO, format } from 'date-fns';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import SalesMapBrazil from './SalesMapBrazil.vue';

const Bar = defineAsyncComponent(() => import('vue-chartjs').then(c => c.Bar));
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const router = useRouter();
const dashboardStore = useDashboardStore();
const userStore = useUserStore();
const { myThirtyDaySales } = storeToRefs(dashboardStore);

const allSellers = ref<any[]>([]);
const salesGoal = ref(25000);
const loadingEditorToken = ref(false);
const editorError = ref<string | null>(null);

const statusDisplayMap: Record<string, string> = {
    design_pending: 'No Design', in_design: 'Em Design', changes_requested: 'Alteração Solicitada',
    finalizing: 'Finalizando Arte', customer_approval: 'Aguardando Aprovação',
    production_queue: 'Fila de Produção', in_printing: 'Em Impressão',
    in_cutting: 'Em Corte', completed: 'Finalizado', delivered: 'Entregue', billed: 'Faturado'
};
const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey', in_design: 'blue', changes_requested: 'red',
    finalizing: 'purple', customer_approval: 'orange',
    production_queue: 'grey', in_printing: 'cyan', in_cutting: 'amber',
    completed: 'success', delivered: 'info', billed: 'deep-purple-accent-2'
};
const headers = [
  { title: 'Nº Pedido', key: 'order_number', width: '120px' },
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Data', key: 'created_at' },
  { title: 'Metragem', key: 'quantity_meters', align: 'end' },
  { title: 'Status', key: 'status', align: 'end' },
];

const myOrders = computed((): Order[] => {
  if (!userStore.profile?.id) return [];
  return dashboardStore.orders.filter(o => o.created_by === userStore.profile.id);
});

const monthlyOrders = computed(() => {
  const now = new Date();
  const start = startOfMonth(now);
  return myOrders.value.filter(o => {
      if (!o.created_at) return false;
      return isWithinInterval(parseISO(o.created_at), { start, end: now });
  });
});

const itemsPendingSellerApprovalCount = computed(() => {
    return myOrders.value.filter(order => order.is_launch && order.order_items.some(item => item.status === 'customer_approval')).length;
});


const monthlyMetrics = computed(() => {
  const now = new Date();
  const orders = monthlyOrders.value;
  const totalMeters = orders.reduce((sum, order) => sum + (order.quantity_meters || 0), 0);
  const totalOrders = orders.length;
  const averageMeters = totalOrders > 0 ? totalMeters / totalOrders : 0;
  const goalPercentage = salesGoal.value > 0 ? (totalMeters / salesGoal.value) * 100 : 0;
  const clientFirstOrderDates = new Map<string, Date>();
  myOrders.value.forEach(o => {
      if (!o.created_at) return;
      const existing = clientFirstOrderDates.get(o.customer_name);
      const orderDate = parseISO(o.created_at);
      if (!existing || orderDate < existing) clientFirstOrderDates.set(o.customer_name, orderDate);
  });
  const start = startOfMonth(now);
  const newClients = [...clientFirstOrderDates.entries()].filter(([_, firstDate]) => isWithinInterval(firstDate, { start, end: now })).length;
  return { totalMeters, totalOrders, averageMeters, goalPercentage, newClients };
});

const myActiveLaunchOrders = computed(() => myOrders.value.filter(order => order.is_launch && !['completed', 'delivered'].includes(order.status)));

const sellerRanking = computed(() => {
  const salesMap = new Map<string, number>();
  const now = new Date();
  const start = startOfMonth(now);
  dashboardStore.orders.forEach(order => {
    if (!order.created_at) return;
    if (isWithinInterval(parseISO(order.created_at), { start, end: now })) {
      const sellerName = order.creator?.full_name;
      if (sellerName) salesMap.set(sellerName, (salesMap.get(sellerName) || 0) + (order.quantity_meters || 0));
    }
  });
  return [...salesMap.entries()].sort((a, b) => b[1] - a[1]).map(([seller, totalMeters], index) => {
    const sellerProfile = allSellers.value.find(s => s.full_name === seller);
    if (seller === 'Danilo Martins') {
        return {
            rank: index + 1,
            seller: 'Fernanda Garcia',
            totalMeters,
            avatar_url: 'https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Fernanda_Garcia_Logo.png?v=1750964425'
        };
    }
    return { rank: index + 1, seller, totalMeters, avatar_url: sellerProfile?.avatar_url };
  });
});

const sellerToRegionMap: Record<string, 'sudeste' | 'nordeste'> = {
    'Beatriz Garcia': 'sudeste', 'Marcos Levi': 'sudeste', 'Juci': 'sudeste',
    'Elda': 'nordeste', 'Sueli': 'nordeste', 'Fernanda Garcia': 'sudeste', 'João Vitor': 'sudeste',
};

const salesByRegion = computed(() => {
    const regionMap: { [key: string]: number } = { 'Sudoeste': 0, 'Nordeste': 0 };
    const now = new Date();
    const start = startOfMonth(now);
    dashboardStore.orders.forEach(order => {
        if (!order.created_at) return;
        if (isWithinInterval(parseISO(order.created_at), { start, end: now })) {
            let sellerName = order.creator?.full_name;
            if (sellerName === 'Danilo Martins') sellerName = 'Fernanda Garcia';
            if (sellerName && sellerToRegionMap[sellerName]) {
                const regionKey = sellerToRegionMap[sellerName] === 'sudeste' ? 'Sudoeste' : 'Nordeste';
                regionMap[regionKey] += (order.quantity_meters || 0);
            }
        }
    });
    return regionMap as { Sudoeste: number; Nordeste: number; };
});

const sellersByRegion = computed(() => {
    const regions: { nordeste: string[], sudeste: string[] } = { nordeste: [], sudeste: [] };
    for (let sellerName in sellerToRegionMap) {
        const region = sellerToRegionMap[sellerName];
        if (sellerName === 'Danilo Martins') sellerName = 'Fernanda Garcia';
        regions[region].push(sellerName);
    }
    regions.nordeste = [...new Set(regions.nordeste)].sort();
    regions.sudeste = [...new Set(regions.sudeste)].sort();
    return regions;
});

const salesChartData = computed(() => ({
  labels: myThirtyDaySales.value.labels,
  datasets: [{
    label: 'Metragem Vendida', backgroundColor: '#7159DD', borderColor: '#8A78E2',
    borderWidth: 2, borderRadius: 8, data: myThirtyDaySales.value.data,
  }],
}));

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#A0A0A0' } },
    x: { grid: { display: false }, ticks: { color: '#A0A0A0' } },
  },
};

const goToApprovals = () => {
  const approvalOrder = myActiveLaunchOrders.value.find(o => o.order_items.some(item => item.status === 'customer_approval'));
  router.push(approvalOrder ? { name: 'ApproveOrder', params: { id: approvalOrder.id } } : { name: 'Approvals' });
};

const formatMeters = (value: number) => {
    if (!value) return "0";
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return Number(value.toFixed(0)).toLocaleString('pt-BR');
};

const formatDate = (dateString: string) => {
    if(!dateString) return '-';
    return format(parseISO(dateString), 'dd/MM/yy');
};

const openEditor = async () => {
  loadingEditorToken.value = true;
  editorError.value = null;
  try {
    const { error: sessionError } = await supabase.auth.refreshSession();
    if (sessionError) {
      alert('Sua sessão expirou. Por favor, faça login novamente.');
      await userStore.signOut();
      router.push({ name: 'Login' });
      return;
    }
    const { data, error } = await supabase.functions.invoke('generate-editor-token');
    if (error) throw error;

    if (data.token) {
      const editorUrl = `https://mjmockups.onrender.com?token=${data.token}`;
      window.open(editorUrl, '_blank');
    } else {
      throw new Error('Token de acesso ao editor não foi recebido.');
    }
  } catch (error: any) {
    console.error('Erro ao abrir o editor:', error);
    editorError.value = `Erro ao acessar o editor: ${error.message}`;
  } finally {
    loadingEditorToken.value = false;
  }
};

onMounted(async () => {
  const { data } = await supabase.from('profiles').select('full_name, avatar_url');
  if (data) allSellers.value = data;
});
</script>

<style scoped lang="scss">
@keyframes card-entry-animation {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.main-content-area {
  min-width: 0;
}

.sidebar-sticky-content {
  position: sticky;
  top: 80px;
  min-height: 450px; // Garante altura mínima para o mapa
  height: calc(100vh - 112px);

  @media (max-width: 1279px) { // lg breakpoint in vuetify
    position: relative;
    top: 0;
    margin-top: 1.5rem;
    min-height: 450px; // Mantém altura mínima em telas menores
    height: auto;
  }
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.kpi-card-v4 {
  --kpi-glow-color: rgba(var(--v-theme-on-surface), 0.1);
  position: relative;
  border-radius: 16px;
  background-color: rgba(30, 31, 49, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  animation: card-entry-animation 0.5s ease-out forwards;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    border-radius: inherit;
    background: radial-gradient(
      600px circle at var(--mouse-x) var(--mouse-y),
      rgba(255, 255, 255, 0.1),
      transparent 40%
    );
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.2), 0 0 15px var(--kpi-glow-color);
    &::before { opacity: 1; }
  }

  &.clickable-kpi { cursor: pointer; }
}

.aurora-background {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  background: radial-gradient(ellipse at 10% 90%, var(--kpi-color), transparent 50%);
  filter: blur(40px);
  opacity: 0.3;
  pointer-events: none;
}

.kpi-icon {
  font-size: 2.5rem;
  color: var(--kpi-color);
  filter: drop-shadow(0 0 10px var(--kpi-color));
  z-index: 1;
}

.kpi-text { z-index: 1; }
.kpi-title {
  font-size: 0.8rem;
  color: #a0a0a0;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
  color: #fff;
}
.kpi-progress { z-index: 1; }
.kpi-progress-percent { font-size: 0.8rem; font-weight: bold; }

.main-panel-card {
  background-color: rgba(30, 31, 49, 0.7);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chart-container { padding: 1rem; min-height: 350px; flex-grow: 1; }

.podium-container {
    display: flex; align-items: flex-end; justify-content: center;
    gap: 1rem; height: 100%; width: 100%; min-height: 220px;
}
.podium-item {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; width: 33%; position: relative;
  &.rank-1 { order: 2; transform: translateY(-20px); .podium-base { height: 90px; background-color: #FFC107; } .podium-avatar { border-color: #FFC107; } }
  &.rank-2 { order: 1; .podium-base { height: 70px; background-color: #C0C0C0; } .podium-avatar { border-color: #C0C0C0; } }
  &.rank-3 { order: 3; .podium-base { height: 50px; background-color: #CD7F32; } .podium-avatar { border-color: #CD7F32; } }
}
.podium-avatar { border: 4px solid; margin-bottom: -35px; z-index: 2; background-color: #1F1D2B; }
.podium-name {
  font-weight: bold;
  margin-top: 45px;
  font-size: 0.9rem;
  line-height: 1.3;
  height: 2.6em; /* Acomoda até 2 linhas */
  width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.podium-value { font-size: 1.1rem; font-weight: 700; color: #fff; margin-top: 4px; }
.podium-base {
  width: 100%; border-radius: 8px 8px 0 0; display: flex;
  flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 4px;
  margin-top: 8px;
  .podium-rank { font-size: 2rem; font-weight: 900; color: rgba(0,0,0,0.5); }
  .v-icon { position: absolute; top: 5px; font-size: 2rem; color: rgba(0,0,0,0.5); }
}

:deep(.v-data-table) { background-color: transparent !important; }
:deep(.v-data-table__tr:hover > td) { background: rgba(255, 255, 255, 0.05) !important; }

.custom-scrollbar::-webkit-scrollbar { width: 8px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  border: 2px solid transparent;
}
</style>
