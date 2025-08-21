<template>
  <v-container fluid class="pa-md-6 pa-4">
    <v-toolbar color="transparent" class="mb-6">
      <v-toolbar-title class="font-weight-bold text-h5">
        <v-icon start size="32">mdi-currency-usd</v-icon>
        Tabela de Preços
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field
        v-model="search"
        variant="solo-filled"
        flat
        density="compact"
        label="Buscar produto..."
        prepend-inner-icon="mdi-magnify"
        hide-details
        style="max-width: 350px;"
      ></v-text-field>
    </v-toolbar>

    <v-card class="glassmorphism-card-prices">
      <v-data-table
        :headers="headers"
        :items="filteredProducts"
        :loading="loading"
        class="bg-transparent"
        item-value="id"
        density="comfortable"
        hover
      >
        <template v-slot:item.price_se="{ item }">
          <span v-if="canViewSE">{{ formatCurrency(item.price_se) }}</span>
          <v-chip v-else size="small" variant="tonal" color="grey">N/A</v-chip>
        </template>
        <template v-slot:item.price_ne="{ item }">
          <span v-if="canViewNE">{{ formatCurrency(item.price_ne) }}</span>
          <v-chip v-else size="small" variant="tonal" color="grey">N/A</v-chip>
        </template>
        <template v-slot:item.unit="{ item }">
          / {{ item.unit }}
        </template>
        <template v-slot:loading>
          <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
        </template>
        <template v-slot:no-data>
          <div class="py-12 text-center text-grey">
            <v-icon size="48" class="mb-2">mdi-database-off-outline</v-icon>
            <p>Nenhum produto encontrado na tabela de preços.</p>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

type Product = {
  id: string;
  name: string;
  composition: string;
  grammage: string;
  unit: 'metro' | 'kg';
  price_se: number;
  price_ne: number;
};

const userStore = useUserStore();
const loading = ref(true);
const search = ref('');
const products = ref<Product[]>([]);

const canViewSE = computed(() => userStore.profile?.allowed_regions?.includes('SE') || userStore.isAdmin);
const canViewNE = computed(() => userStore.profile?.allowed_regions?.includes('NE') || userStore.isAdmin);

const headers = computed(() => [
  { title: 'Produto', key: 'name', width: '30%' },
  { title: 'Composição', key: 'composition' },
  { title: 'Gramatura', key: 'grammage' },
  ...(canViewSE.value ? [{ title: 'Preço Sudeste', key: 'price_se', align: 'end' }] : []),
  ...(canViewNE.value ? [{ title: 'Preço Nordeste', key: 'price_ne', align: 'end' }] : []),
  { title: 'Unidade', key: 'unit', sortable: false },
]);

const filteredProducts = computed(() => {
  if (!search.value) return products.value;
  const query = search.value.toLowerCase();
  return products.value.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.composition?.toLowerCase().includes(query)
  );
});

const fetchPrices = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase.from('price_list').select('*').order('name');
    if (error) throw error;
    products.value = data || [];
  } catch (err: any) {
    console.error(`Erro ao buscar tabela de preços: ${err.message}`);
  } finally {
    loading.value = false;
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

onMounted(fetchPrices);
</script>

<style scoped lang="scss">
.glassmorphism-card-prices {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  background-color: rgba(25, 25, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

:deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}
</style>
