<template>
  <div>
    <v-card class="content-card" variant="flat">
      <v-card-title class="font-weight-bold">Desempenho dos Vendedores (Mês Atual)</v-card-title>
      <v-data-table :headers="headers" :items="sellerPerformance" class="bg-transparent" :loading="loading.sellers">
        <template #item.full_name="{ item }">
          <v-list-item class="pa-0 bg-transparent">
            <template #prepend>
              <v-avatar size="32" class="mr-3"><v-img :src="item.raw.avatar_url"></v-img></v-avatar>
            </template>
            <v-list-item-title class="font-weight-bold">{{ item.raw.full_name }}</v-list-item-title>
          </v-list-item>
        </template>
        <template #item.total_sold="{ item }">
          {{ formatCurrency(item.raw.total_sold) }}
        </template>
        <template #item.goal_progress="{ item }">
          <div class="d-flex align-center">
            <v-progress-linear :model-value="item.raw.goal_progress" :color="getGoalColor(item.raw.goal_progress)" height="8" rounded></v-progress-linear>
            <span class="ml-2 font-weight-bold" style="min-width: 45px;">{{ Math.round(item.raw.goal_progress) }}%</span>
          </div>
        </template>
        <template #item.actions="{ item }">
          <v-btn size="small" variant="tonal" @click="openGoalModal(item.raw)">Definir Meta</v-btn>
        </template>
      </v-data-table>
    </v-card>

    <CrmGoalModal :show="showGoalModal" :seller-id="selectedSeller?.seller_id" :seller-name="selectedSeller?.full_name" @close="showGoalModal = false" @saved="handleGoalSaved" />
  </div>
</template>

<script setup>
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { useCrmStore } from '@/stores/crm';
import { storeToRefs } from 'pinia';
import { supabase } from '@/api/supabase';
import { formatISO, startOfMonth, endOfMonth } from 'date-fns';

const CrmGoalModal = defineAsyncComponent(() => import('./CrmGoalModal.vue'));
const crmStore = useCrmStore();
const { loading } = storeToRefs(crmStore);

const sellerPerformance = ref([]);
const showGoalModal = ref(false);
const selectedSeller = ref(null);

const headers = [
  { title: 'Vendedor', key: 'full_name', sortable: false },
  { title: 'Vendas (Mês)', key: 'total_sold', align: 'end' },
  { title: 'Pedidos', key: 'orders_count', align: 'end' },
  { title: 'Ticket Médio', key: 'avg_ticket', align: 'end' },
  { title: 'Progresso da Meta', key: 'goal_progress', align: 'end', width: '200px' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'center' },
];

const fetchSellerPerformance = async () => {
  const today = new Date();
  const startDate = formatISO(startOfMonth(today), { representation: 'date' });
  const endDate = formatISO(endOfMonth(today), { representation: 'date' });
  const { data, error } = await supabase.rpc('get_all_sellers_performance', { start_date: startDate, end_date: endDate });
  if (error) console.error(error);
  else sellerPerformance.value = data;
};

const openGoalModal = (seller) => {
  selectedSeller.value = seller;
  showGoalModal.value = true;
};

const handleGoalSaved = () => {
  showGoalModal.value = false;
  fetchSellerPerformance();
};

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const getGoalColor = (progress) => {
  if (progress >= 100) return 'success';
  if (progress > 50) return 'primary';
  return 'warning';
};

onMounted(fetchSellerPerformance);
</script>

<style scoped>
.content-card {
  background: rgba(30, 30, 45, 0.75);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
:deep(.v-data-table) { background-color: transparent !important; }
</style>
