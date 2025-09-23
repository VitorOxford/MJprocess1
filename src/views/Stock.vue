<template>
  <v-container fluid class="pa-md-6 pa-4">
    <v-toolbar color="transparent" class="mb-6">
      <v-toolbar-title class="font-weight-bold text-h5">
        <v-icon start size="32">mdi-warehouse</v-icon>
        Estoque de Tecidos
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field
        v-model="search"
        variant="solo-filled"
        flat
        density="compact"
        label="Buscar tecido..."
        prepend-inner-icon="mdi-magnify"
        hide-details
        style="max-width: 300px;"
      ></v-text-field>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-4 text-grey-lighten-1">Carregando estoque...</p>
    </div>

    <v-alert v-else-if="filteredStockItems.length === 0" type="info" variant="tonal" class="mx-auto" max-width="500">
      Nenhum item encontrado no estoque com o termo "{{ search }}".
    </v-alert>

    <v-row v-else>
      <v-col
        v-for="item in filteredStockItems"
        :key="item.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card class="stock-item-card" variant="flat">
          <v-card-text>
            <div class="d-flex align-center">
              <div>
                <h3 class="text-h6 font-weight-bold">{{ item.fabric_type }}</h3>
                <v-chip
                  :color="getStockStatus(item).color"
                  :prepend-icon="getStockStatus(item).icon"
                  size="small"
                  label
                  variant="flat"
                  :class="['stock-status-chip', getStockStatus(item).pulseClass]"
                  class="mt-2"
                >
                  {{ getStockStatus(item).text }}
                </v-chip>
              </div>
              <v-spacer></v-spacer>
              <div class="text-right">
                <div v-if="item.meters_per_roll" class="d-flex align-center justify-end mb-1 text-grey-lighten-1">
                  <v-icon size="small" class="mr-1">mdi-tape-measure</v-icon>
                  <span class="text-caption font-weight-bold">{{ item.meters_per_roll }}{{ item.unit_of_measure === 'kg' ? 'kg' : 'm' }} / Rolo</span>
                </div>
                <p class="text-h4 font-weight-bold" :class="`text-${getStockStatus(item).color}`">
                  {{ item.available_meters.toLocaleString('pt-BR') }}{{ item.unit_of_measure === 'kg' ? 'kg' : 'm' }}
                </p>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';

type StockItem = {
  id: string;
  fabric_type: string;
  available_meters: number;
  meters_per_roll: number | null;
  unit_of_measure: 'metro' | 'kg';
  low_stock_threshold: number | null;
};

const loading = ref(true);
const search = ref('');
const stockItems = ref<StockItem[]>([]);

const filteredStockItems = computed(() => {
  if (!search.value) {
    return stockItems.value.sort((a, b) => a.fabric_type.localeCompare(b.fabric_type));
  }
  return stockItems.value.filter(item =>
    item.fabric_type.toLowerCase().includes(search.value.toLowerCase())
  ).sort((a, b) => a.fabric_type.localeCompare(b.fabric_type));
});

const getStockStatus = (item: StockItem): { text: string; color: string; icon: string; pulseClass: string } => {
  if (item.available_meters <= 0) {
    return {
      text: 'Sem estoque',
      color: 'error',
      icon: 'mdi-close-octagon-outline',
      pulseClass: 'pulse-error'
    };
  }
  if (item.low_stock_threshold && item.available_meters < item.low_stock_threshold) {
    return {
      text: 'Abaixo do mínimo',
      color: 'warning',
      icon: 'mdi-alert-outline',
      pulseClass: 'pulse-warning'
    };
  }
  return {
    text: 'Estoque OK',
    color: 'success',
    icon: 'mdi-check-circle-outline',
    pulseClass: ''
  };
};

const fetchStock = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase.from('stock').select('*');
    if (error) throw error;
    stockItems.value = data || [];
  } catch (err: any) {
    console.error(`Erro ao buscar estoque: ${err.message}`);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchStock);
</script>

<style scoped lang="scss">
@keyframes pulse-warning-animation {
  0% {
    box-shadow: 0 0 0 0 rgba(251, 140, 0, 0.7);
  }
  70% {
    box-shadow: 0 0 10px 10px rgba(251, 140, 0, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(251, 140, 0, 0);
  }
}

@keyframes pulse-error-animation {
  0% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.7);
  }
  70% {
    box-shadow: 0 0 10px 10px rgba(244, 67, 54, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
  }
}

.stock-item-card {
  border-radius: 12px;
  background-color: rgba(30, 30, 35, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease-in-out;
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    border-color: rgba(var(--v-theme-primary), 0.5);
  }
}

.stock-status-chip {
  font-weight: bold;
  
  &.pulse-warning {
    animation: pulse-warning-animation 2s infinite;
  }

  &.pulse-error {
    animation: pulse-error-animation 2s infinite;
  }
}
</style>
