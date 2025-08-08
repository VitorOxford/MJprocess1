<template>
  <v-container fluid class="pa-md-6 pa-4">
    <v-toolbar color="transparent" class="mb-4">
      <v-toolbar-title class="font-weight-bold">
        <v-icon start>mdi-warehouse</v-icon>
        Consulta de Estoque de Tecidos
      </v-toolbar-title>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <v-row v-else>
      <v-col cols="12" md="6">
        <v-card class="stock-card">
          <v-toolbar color="rgba(0,0,0,0.2)" density="compact">
            <v-toolbar-title class="font-weight-bold text-cyan-accent-3">
              <v-icon start>mdi-set-square</v-icon>
              Máquina MESA (Limite: {{ machineLimits.mesa.toLocaleString('pt-BR') }}m/dia)
            </v-toolbar-title>
          </v-toolbar>
          <v-list class="bg-transparent" lines="two">
            <v-list-item v-for="item in mesaFabrics" :key="item.id">
              <v-list-item-title class="font-weight-bold">{{ item.fabric_type }}</v-list-item-title>
              <v-list-item-subtitle>Disponível</v-list-item-subtitle>
              <template v-slot:append>
                <v-chip color="cyan" variant="flat">{{ item.available_meters.toLocaleString('pt-BR') }}m</v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="stock-card">
          <v-toolbar color="rgba(0,0,0,0.2)" density="compact">
            <v-toolbar-title class="font-weight-bold text-amber-accent-3">
              <v-icon start>mdi-chart-line-variant</v-icon>
              Máquina CORRIDA (Limite: {{ machineLimits.corrida.toLocaleString('pt-BR') }}m/dia)
            </v-toolbar-title>
          </v-toolbar>
          <v-list class="bg-transparent" lines="two">
             <v-list-item v-for="item in corridaFabrics" :key="item.id">
              <v-list-item-title class="font-weight-bold">{{ item.fabric_type }}</v-list-item-title>
              <v-list-item-subtitle>Disponível</v-list-item-subtitle>
              <template v-slot:append>
                <v-chip color="amber" variant="flat">{{ item.available_meters.toLocaleString('pt-BR') }}m</v-chip>
              </template>
            </v-list-item>
          </v-list>
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
};

const loading = ref(true);
const stockItems = ref<StockItem[]>([]);

const fabricMachineMap: Record<string, 'MESA' | 'CORRIDA'> = {
  'Creponado': 'MESA', 'Tule': 'MESA', 'Fluity': 'MESA', 'Canelado': 'MESA', 'Suplex': 'MESA', 'Chiffon': 'MESA', 'Liganet': 'MESA',
  'Crepinho': 'CORRIDA', 'Twill Fly': 'CORRIDA', 'Toque de seda': 'CORRIDA', 'Corta-Vento': 'CORRIDA', 'Tactel': 'CORRIDA', 'Alfaiataria': 'CORRIDA'
};

const machineLimits = {
  mesa: 4000,
  corrida: 10000
};

const mesaFabrics = computed(() =>
  stockItems.value.filter(item => fabricMachineMap[item.fabric_type] === 'MESA')
);

const corridaFabrics = computed(() =>
  stockItems.value.filter(item => fabricMachineMap[item.fabric_type] === 'CORRIDA')
);

const fetchStock = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase.from('stock').select('*').order('fabric_type');
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
.stock-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  background-color: rgba(25, 25, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  min-height: 400px;
}
</style>
