<template>
  <v-container fluid>
    <v-toolbar color="transparent" class="mb-4">
      <v-toolbar-title class="font-weight-bold">
        <v-icon start>mdi-cog-sync-outline</v-icon>
        Pedidos em Produção Ativa
      </v-toolbar-title>
    </v-toolbar>

    <v-card class="mb-6 kpi-card" color="rgba(30,30,35,0.8)">
      <v-card-text>
        <div class="d-flex align-center">
          <v-icon size="large" color="primary" class="mr-4">mdi-chart-donut</v-icon>
          <div>
            <div class="text-h4 font-weight-bold">{{ totalMetersInProduction.toLocaleString('pt-BR') }}m</div>
            <div class="text-subtitle-1 text-grey-lighten-1">Total de Metros em Produção</div>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="dashboard-card" color="rgba(30,30,35,0.8)">
      <v-data-table
        :headers="headers"
        :items="inProductionOrders"
        :loading="loading"
        class="bg-transparent"
        item-value="id"
        density="comfortable"
        @click:row="(_, { item }) => openDetailModal(item.id)"
        hover
      >
        <template v-slot:item.customer_name="{ item }">
          <span class="font-weight-bold">{{ item.customer_name }}</span>
        </template>

        <template v-slot:item.quantity_meters="{ item }">
          <v-chip color="primary" variant="tonal">{{ item.quantity_meters }}m</v-chip>
        </template>

        <template v-slot:item.details.final_art_url="{ item }">
          <v-btn
            v-if="item.details.final_art_url"
            :href="item.details.final_art_url"
            target="_blank"
            size="small"
            variant="text"
            color="cyan"
            prepend-icon="mdi-image-search-outline"
            @click.stop
          >
            Ver Arte
          </v-btn>
          <span v-else class="text-caption text-grey">Sem arte</span>
        </template>
      </v-data-table>
    </v-card>

    <OrderDetailModal
      :show="showDetailModal"
      :order-id="selectedOrderId"
      @close="showDetailModal = false"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import OrderDetailModal from '@/components/OrderDetailModal.vue';

type Order = {
  id: string;
  customer_name: string;
  quantity_meters: number;
  details: {
    fabric_type: string;
    final_art_url?: string;
  };
};

const orders = ref<Order[]>([]);
const loading = ref(true);
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);

const headers = [
  { title: 'Cliente', key: 'customer_name', width: '30%' },
  { title: 'Tecido', key: 'details.fabric_type' },
  { title: 'Metragem', key: 'quantity_meters', align: 'center' },
  { title: 'Arte Final', key: 'details.final_art_url', align: 'center', sortable: false },
];

const inProductionOrders = computed(() => {
    // Esta tela agora filtra pelos status corretos, então apenas retornamos os pedidos.
    return orders.value;
});

const totalMetersInProduction = computed(() => {
    return inProductionOrders.value.reduce((total, order) => total + order.quantity_meters, 0);
});

const openDetailModal = (orderId: string) => {
    selectedOrderId.value = orderId;
    showDetailModal.value = true;
};

const fetchInProductionOrders = async () => {
  loading.value = true;
  try {
    // A query agora busca pelos status de produção ativa
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, quantity_meters, status, details')
      .in('status', ['in_printing', 'in_cutting']);

    if (error) throw error;
    orders.value = data || [];
  } catch (err) {
    console.error('Erro ao buscar pedidos em produção:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchInProductionOrders();
});
</script>

<style scoped lang="scss">
.kpi-card, .dashboard-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
.dashboard-card {
    :deep(tbody tr) {
        cursor: pointer;
    }
}
:deep(.v-data-table__wrapper) {
    background-color: transparent !important;
}
</style>
