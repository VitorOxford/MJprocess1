<template>
  <div>
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="kpi-card text-center" variant="tonal">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Clientes Ativos</div>
            <div class="text-h4 font-weight-bold">{{ customerMetrics.active }}</div>
             <div class="text-caption">Compraram nos últimos 90 dias</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card class="kpi-card text-center" variant="tonal">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Novos Clientes</div>
            <div class="text-h4 font-weight-bold">{{ overview.kpis.new_customers }}</div>
            <div class="text-caption">No período selecionado</div>
          </v-card-text>
        </v-card>
      </v-col>
       <v-col cols="12" md="4">
        <v-card class="kpi-card text-center" variant="tonal">
          <v-card-text>
            <div class="text-caption text-medium-emphasis">Clientes Inativos</div>
            <div class="text-h4 font-weight-bold">{{ customerMetrics.inactive }}</div>
            <div class="text-caption">Sem compras há mais de 90 dias</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
       <v-col cols="12">
        <CrmPodiumRanking title="Ranking de Clientes (Metragem)" :items="overview.top_customers_by_meters" unit="m"/>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <v-card class="content-card mt-4" variant="flat">
          <v-card-title class="font-weight-bold">Análise Detalhada de Clientes</v-card-title>
            <v-text-field
                v-model="customerSearch"
                label="Buscar cliente..."
                variant="outlined"
                density="compact"
                hide-details
                class="pa-4"
                prepend-inner-icon="mdi-magnify"
            ></v-text-field>
          <v-data-table
            :headers="customerHeaders"
            :items="customerMetrics.details"
            :search="customerSearch"
            class="bg-transparent"
            no-data-text="Nenhum cliente encontrado para o período."
            :loading="loading"
          >
            <template #item.total_meters="{ value }">{{ formatMeters(value) }}</template>
            <template #item.last_purchase_date="{ value }">{{ formatDate(value) }}</template>
             <template #item.purchase_frequency="{ value }">{{ value > 0 ? `${value} dias` : 'Compra Única' }}</template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent } from 'vue';
import { useCrmStore } from '@/stores/crm';
import { storeToRefs } from 'pinia';
import { parseISO, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CrmPodiumRanking = defineAsyncComponent(() => import('./CrmPodiumRanking.vue'));
const crmStore = useCrmStore();
const { rawOrders, loading, overview } = storeToRefs(crmStore);

const customerSearch = ref('');
const INACTIVE_THRESHOLD_DAYS = 90;

const customerMetrics = computed(() => {
    if (!overview.value.kpis) return { active: 0, inactive: 0, details: [] };
    const customerMap = new Map();
    const today = new Date();

    rawOrders.value.forEach(order => {
        const customerName = order.customer_name;
        const orderDate = parseISO(order.created_at);

        const orderMeters = order.order_items.reduce((sum, item) => sum + (item.quantity_meters || 0), 0);

        if (!customerMap.has(customerName)) {
            customerMap.set(customerName, {
                name: customerName,
                purchase_dates: [],
                total_meters: 0,
            });
        }

        const stats = customerMap.get(customerName);
        stats.purchase_dates.push(orderDate);
        stats.total_meters += orderMeters;
    });

    let active = 0;
    let inactive = 0;

    const details = Array.from(customerMap.values()).map(customer => {
        customer.purchase_dates.sort((a, b) => b.getTime() - a.getTime());
        const last_purchase_date = customer.purchase_dates[0];

        let purchase_frequency = 0;
        if(customer.purchase_dates.length > 1) {
            const totalDiff = differenceInDays(customer.purchase_dates[0], customer.purchase_dates[customer.purchase_dates.length - 1]);
            purchase_frequency = Math.round(totalDiff / (customer.purchase_dates.length - 1));
        }

        const daysSinceLastPurchase = differenceInDays(today, last_purchase_date);
        if (daysSinceLastPurchase <= INACTIVE_THRESHOLD_DAYS) {
            active++;
        } else {
            inactive++;
        }

        return {
            ...customer,
            last_purchase_date,
            purchase_frequency,
        };
    }).sort((a,b) => b.total_meters - a.total_meters);

    return { active, inactive, details };
});


const customerHeaders = [
  { title: 'Cliente', key: 'name' },
  { title: 'Última Compra', key: 'last_purchase_date' },
  { title: 'Frequência Média', key: 'purchase_frequency' },
  { title: 'Total Comprado (Metros)', key: 'total_meters', align: 'end' },
];

const formatMeters = (value) => `${(value || 0).toLocaleString('pt-BR')}m`;
const formatDate = (value) => format(value, 'dd/MM/yyyy', { locale: ptBR });
</script>

<style scoped>
.content-card, .kpi-card {
  background: rgba(30, 30, 45, 0.75);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  height: 100%;
}
.kpi-card {
  background: rgba(255, 255, 255, 0.05);
}
:deep(.v-data-table) { background-color: transparent !important; }
</style>
