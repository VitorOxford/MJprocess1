<template>
  <div v-if="loading || !overview.kpis" class="loading-container">
    <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
  </div>
  <div v-else>
    <v-row>
      <v-col v-for="(value, key) in overview.kpis" :key="key" cols="12" sm="6" md="3">
        <v-card class="kpi-card" variant="flat">
          <v-card-text>
            <div class="d-flex align-center">
              <v-avatar :color="kpiMeta[key].color + '-lighten-4'" size="56" class="mr-4">
                <v-icon size="28" :color="kpiMeta[key].color">{{ kpiMeta[key].icon }}</v-icon>
              </v-avatar>
              <div>
                <div class="text-caption text-medium-emphasis">{{ formatKpiTitle(key) }}</div>
                <div class="text-h5 font-weight-bold">{{ formatKpiValue(key, value) }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <CrmPodiumRanking title="Ranking de Vendedores (Metragem)" :items="overview.top_sellers_by_meters" unit="m"/>
      </v-col>
      <v-col cols="12" md="6">
        <CrmPodiumRanking title="Ranking de Clientes (Metragem)" :items="overview.top_customers_by_meters" unit="m"/>
      </v-col>
    </v-row>
    <v-row class="mt-4">
      <v-col cols="12" lg="8">
        <v-card class="content-card" variant="flat">
          <v-card-title class="font-weight-bold">Tendência de Faturamento</v-card-title>
          <v-card-text style="height: 300px;">
            <Line :data="salesTrendChartData" :options="chartOptions" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" lg="4">
        <v-card class="content-card" variant="flat">
          <v-card-title class="font-weight-bold">Bases Mais Pedidas</v-card-title>
          <v-card-text style="height: 300px;">
            <Doughnut :data="topFabricsChartData" :options="doughnutOptions" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row class="mt-4">
      <v-col cols="12">
        <SalesMapBrazil />
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCrmStore } from '@/stores/crm';
import { storeToRefs } from 'pinia';
import { Line, Doughnut } from 'vue-chartjs';
import SalesMapBrazil from '@/components/dashboards/SalesMapBrazil.vue';
import CrmPodiumRanking from './CrmPodiumRanking.vue';
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler } from 'chart.js';

// CORREÇÃO: Registra o plugin 'Filler' junto com os outros
ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler);

const crmStore = useCrmStore();
const { overview, loading } = storeToRefs(crmStore);

const kpiMeta = {
  total_revenue: { icon: 'mdi-currency-usd', color: 'success' },
  total_orders: { icon: 'mdi-package-variant-closed', color: 'info' },
  new_customers: { icon: 'mdi-account-plus', color: 'primary' },
  avg_ticket: { icon: 'mdi-ticket-percent', color: 'warning' },
};

const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#A0A0A0', font: { size: 10 } } }, x: { grid: { display: false }, ticks: { color: '#A0A0A0', font: { size: 10 } } } } };
const doughnutOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#E0E0E0' } } } };

const salesTrendChartData = computed(() => ({
  labels: overview.value.sales_trend?.map(d => new Date(d.day + 'T03:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })) || [],
  datasets: [{ label: 'Faturamento', borderColor: '#36a2eb', backgroundColor: 'rgba(54, 162, 235, 0.2)', fill: true, tension: 0.4, data: overview.value.sales_trend?.map(d => d.total_revenue) || [] }]
}));

const topFabricsChartData = computed(() => ({
  labels: overview.value.top_fabrics?.map(f => f.fabric) || [],
  datasets: [{ backgroundColor: ['#4bc0c0', '#ff6384', '#ffce56', '#9966ff', '#36a2eb', '#ff9f40'], data: overview.value.top_fabrics?.map(f => f.total_meters) || [] }]
}));

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const formatKpiTitle = (key) => ({ total_revenue: 'Faturamento', total_orders: 'Pedidos', new_customers: 'Novos Clientes', avg_ticket: 'Ticket Médio' })[key] || key;
const formatKpiValue = (key, value) => (key === 'total_revenue' || key === 'avg_ticket') ? formatCurrency(value) : (value?.toLocaleString('pt-BR') || '0');
</script>

<style scoped>
.loading-container { display: flex; justify-content: center; align-items: center; min-height: 400px; }
.kpi-card, .content-card {
  background: rgba(30, 30, 45, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
}
.kpi-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
</style>
