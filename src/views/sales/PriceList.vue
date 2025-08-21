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

    <v-card v-if="!isMobile" class="glassmorphism-card-prices">
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

    <div v-else>
        <div v-if="loading" class="text-center py-16">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
         <div v-else-if="filteredProducts.length === 0" class="text-center text-grey py-16">
            <v-icon size="48" class="mb-2">mdi-database-off-outline</v-icon>
            <p>Nenhum produto encontrado.</p>
        </div>
        <v-card
            v-for="item in filteredProducts"
            :key="item.id"
            class="mb-3 mobile-price-card"
            variant="flat"
        >
            <v-card-title class="pb-1">
                <h3 class="text-h6 font-weight-bold">{{ item.name }}</h3>
            </v-card-title>
            <v-card-subtitle>/ {{ item.unit }}</v-card-subtitle>
            <v-card-text>
                <div class="info-row">
                    <span class="info-label">Composição:</span>
                    <span class="info-value">{{ item.composition || 'N/A' }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Gramatura:</span>
                    <span class="info-value">{{ item.grammage || 'N/A' }}</span>
                </div>
                <v-divider class="my-3"></v-divider>
                <div v-if="canViewSE" class="price-row">
                    <span class="price-label">Sudeste:</span>
                    <span class="price-value">{{ formatCurrency(item.price_se) }}</span>
                </div>
                <div v-if="canViewNE" class="price-row">
                    <span class="price-label">Nordeste:</span>
                    <span class="price-value">{{ formatCurrency(item.price_ne) }}</span>
                </div>
            </v-card-text>
        </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { useDisplay } from 'vuetify';

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
const { mobile: isMobile } = useDisplay(); // Detecta se a tela é mobile
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

// Estilos para os cards em modo mobile
.mobile-price-card {
  background-color: rgba(35, 35, 40, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 4px solid rgb(var(--v-theme-primary));
  border-radius: 8px;
}

.info-row, .price-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.info-label, .price-label {
  color: #a0a0a0;
  font-size: 0.9rem;
}

.info-value {
  font-weight: 500;
}

.price-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: rgb(var(--v-theme-primary));
}
</style>
