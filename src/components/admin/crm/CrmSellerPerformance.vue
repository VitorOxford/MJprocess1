<template>
  <div>
    <CrmPodiumRanking title="Ranking de Vendedores (Metragem)" :items="topSellers" unit="m"/>

    <v-card class="content-card mt-6" variant="flat">
      <v-card-title class="font-weight-bold">Desempenho Detalhado</v-card-title>
      <v-data-table
        :headers="headers"
        :items="sellerPerformance"
        class="bg-transparent"
        :loading="loading"
        no-data-text="Nenhum dado de vendedor para o período selecionado."
      >
        <template #item.full_name="{ item }">
          <v-list-item class="pa-0 bg-transparent">
            <template #prepend>
              <v-avatar size="32" class="mr-3"><v-img :src="item.avatar_url"></v-img></v-avatar>
            </template>
            <v-list-item-title class="font-weight-bold">{{ item.full_name }}</v-list-item-title>
          </v-list-item>
        </template>

        <template #item.total_meters="{ value }">
          {{ formatMeters(value) }}
        </template>

        <template #item.avg_ticket="{ value }">
          {{ formatCurrency(value) }}
        </template>

        <template #item.actions="{ item }">
          <v-btn size="small" variant="tonal" @click="openGoalModal(item)">Definir Meta</v-btn>
        </template>
      </v-data-table>
    </v-card>

    <CrmGoalModal
      :show="showGoalModal"
      :seller-id="selectedSeller?.id"
      :seller-name="selectedSeller?.full_name"
      @close="showGoalModal = false"
      @saved="handleGoalSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent } from 'vue';
import { useCrmStore } from '@/stores/crm';
import { storeToRefs } from 'pinia';

const CrmGoalModal = defineAsyncComponent(() => import('./CrmGoalModal.vue'));
const CrmPodiumRanking = defineAsyncComponent(() => import('./CrmPodiumRanking.vue'));
const crmStore = useCrmStore();
const { rawOrders, loading, overview } = storeToRefs(crmStore);

const showGoalModal = ref(false);
const selectedSeller = ref(null);

const topSellers = computed(() => overview.value.top_sellers_by_meters || []);

const sellerPerformance = computed(() => {
    if(!overview.value.kpis) return [];

    const sellerMap = new Map();

    rawOrders.value.forEach(order => {
        if (!order.profiles) return;

        const sellerId = order.profiles.id;
        if (!sellerMap.has(sellerId)) {
            sellerMap.set(sellerId, {
                id: sellerId,
                full_name: order.profiles.full_name,
                avatar_url: order.profiles.avatar_url,
                orders_count: 0,
            });
             if (sellerMap.get(sellerId).full_name === 'Danilo Martins') {
                sellerMap.get(sellerId).full_name = 'Fernanda Garcia';
                sellerMap.get(sellerId).avatar_url = 'https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Fernanda_Garcia_Logo.png?v=1750964425';
            }
        }
        sellerMap.get(sellerId).orders_count += 1;
    });

    return Array.from(sellerMap.values()).map(seller => {
        const sellerData = overview.value.top_sellers_by_meters.find(s => s.name === seller.full_name);
        const total_meters = sellerData ? sellerData.value : 0;
        const total_revenue = (crmStore.overview.kpis.total_revenue / crmStore.overview.kpis.total_orders) * seller.orders_count; // estimativa

        return {
            ...seller,
            total_meters: total_meters,
            avg_ticket: seller.orders_count > 0 ? total_revenue / seller.orders_count : 0,
        };
    }).sort((a,b) => b.total_meters - a.total_meters);
});


const headers = [
  { title: 'Vendedor', key: 'full_name', sortable: true },
  { title: 'Metragem', key: 'total_meters', align: 'end' },
  { title: 'Pedidos', key: 'orders_count', align: 'end' },
  { title: 'Ticket Médio (Estimado)', key: 'avg_ticket', align: 'end' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'center' },
];

const openGoalModal = (seller) => {
  selectedSeller.value = seller;
  showGoalModal.value = true;
};

const handleGoalSaved = () => {
  showGoalModal.value = false;
};

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const formatMeters = (value) => `${(value || 0).toLocaleString('pt-BR')}m`;

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
