<template>
  <v-container fluid class="pa-md-6 pa-4 crm-dashboard">
    <v-toolbar color="transparent" class="px-0 mb-6">
      <v-toolbar-title class="font-weight-bold text-h4 d-flex align-center">
        <v-icon start size="36" class="mr-3" color="cyan-lighten-1">mdi-chart-donut-variant</v-icon>
        Dashboard de CRM
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn variant="tonal" @click="showFilterModal = true" class="mr-2">
        <v-icon start>mdi-filter-variant</v-icon>
        Filtros
      </v-btn>
      <v-btn variant="tonal" @click="showReportModal = true">
        <v-icon start>mdi-file-chart-outline</v-icon>
        Relatórios
      </v-btn>
    </v-toolbar>

    <v-tabs v-model="mainTab" color="primary" class="mb-6">
      <v-tab value="overview" class="tab-item">Visão Geral</v-tab>
      <v-tab value="sellers" class="tab-item">Vendedores</v-tab>
      <v-tab value="customers" class="tab-item">Clientes</v-tab>
    </v-tabs>

    <v-window v-model="mainTab">
      <v-window-item value="overview" :eager="true">
        <CrmOverview />
      </v-window-item>
      <v-window-item value="sellers">
        <CrmSellerPerformance />
      </v-window-item>
      <v-window-item value="customers">
        <CrmCustomerAnalysis />
      </v-window-item>
    </v-window>

    <v-dialog v-model="showFilterModal" max-width="500px">
      <v-card class="content-card">
        <v-card-title class="font-weight-bold">Filtros</v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <label class="filter-label">Período</label>
          <v-text-field v-model="filters.startDate" type="date" label="Data de Início" density="compact" variant="outlined" class="mb-2"></v-text-field>
          <v-text-field v-model="filters.endDate" type="date" label="Data de Fim" density="compact" variant="outlined"></v-text-field>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn @click="showFilterModal = false" variant="text">Cancelar</v-btn>
          <v-btn @click="applyFilters" color="primary" variant="flat" :loading="loading">Aplicar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showReportModal" max-width="500px">
        <v-card class="content-card">
            <v-card-title>Gerar Relatórios</v-card-title>
            <v-card-text class="text-center py-8">
                <v-icon size="48" class="mb-2">mdi-progress-wrench</v-icon>
                <p>Funcionalidade de relatórios avançados em breve.</p>
            </v-card-text>
            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn color="primary" @click="showReportModal = false">Fechar</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { onMounted, ref, defineAsyncComponent } from 'vue';
import { useCrmStore } from '@/stores/crm';
import { storeToRefs } from 'pinia';

const CrmOverview = defineAsyncComponent(() => import('@/components/admin/crm/CrmOverview.vue'));
const CrmSellerPerformance = defineAsyncComponent(() => import('@/components/admin/crm/CrmSellerPerformance.vue'));
const CrmCustomerAnalysis = defineAsyncComponent(() => import('@/components/admin/crm/CrmCustomerAnalysis.vue'));

const crmStore = useCrmStore();
const { filters, loading } = storeToRefs(crmStore);

const mainTab = ref('overview');
const showFilterModal = ref(false);
const showReportModal = ref(false);

const applyFilters = () => {
  crmStore.fetchCrmData();
  showFilterModal.value = false;
};

onMounted(() => {
    crmStore.fetchCrmData();
});
</script>

<style scoped lang="scss">
.crm-dashboard { color: #e0e0e0; }
.tab-item { font-weight: 600; }
.content-card {
  background: rgba(30, 30, 45, 0.85);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.filter-label {
  font-size: 0.8rem; font-weight: 500; color: #B0BEC5; margin-bottom: 8px;
  display: block; text-transform: uppercase; letter-spacing: 0.5px;
}
</style>
