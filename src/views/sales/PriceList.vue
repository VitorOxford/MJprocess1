<template>
  <v-container fluid class="pa-md-6 pa-4">
    <v-toolbar color="transparent" class="mb-2">
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
        clearable
      ></v-text-field>
    </v-toolbar>

    <v-row class="mb-4 px-md-0 px-2" align="center">
      <v-col cols="12" md="auto" class="flex-grow-1 py-0">
        </v-col>
      <v-col cols="12" md="auto" class="flex-grow-0 py-0 mt-2 mt-md-0">
        <div class="d-flex align-center justify-end ga-4">
          <div class="d-flex align-center">
            <v-chip color="#4DB6AC" size="small" label variant="flat" class="mr-2"></v-chip>
            <span class="text-caption font-weight-medium">/ metro</span>
          </div>
          <div class="d-flex align-center">
            <v-chip color="#7E57C2" size="small" label variant="flat" class="mr-2"></v-chip>
            <span class="text-caption font-weight-medium">/ kg</span>
          </div>
        </div>
      </v-col>
    </v-row>

    <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>
     <div v-else-if="filteredProducts.length === 0" class="text-center text-grey py-16">
        <v-icon size="48" class="mb-2">mdi-database-off-outline</v-icon>
        <p>Nenhum produto encontrado.</p>
    </div>
    <v-row v-else>
      <v-col
        v-for="item in filteredProducts"
        :key="item.id"
        cols="12"
        sm="6"
        lg="4"
      >
        <v-card
            class="mb-3 mobile-price-card"
            :class="`unit--${item.unit}`"
            variant="flat"
        >
            <v-card-title class="d-flex align-center pb-1">
                <h3 class="text-h6 font-weight-bold mr-3">{{ item.name }}</h3>
                <v-chip
                  :color="getUnitChipColor(item.unit)"
                  size="small"
                  variant="flat"
                  label
                >
                  {{ item.unit }}
                </v-chip>
            </v-card-title>
            <v-card-text class="pt-2">
                <div class="info-row">
                    <span class="info-label">Composição:</span>
                    <span class="info-value">{{ item.composition || 'N/A' }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Gramatura:</span>
                    <span class="info-value">{{ item.grammage || 'N/A' }}</span>
                </div>
                <div v-if="item.unit === 'kg' && item.rendimento" class="info-row">
                    <span class="info-label">Rendimento:</span>
                    <span class="info-value">{{ item.rendimento }}</span>
                </div>

                <v-divider class="my-3"></v-divider>
                <div v-if="canViewSE" class="price-section">
                    <h4 class="region-title">SUDESTE</h4>
                    <v-row no-gutters>
                        <v-col>
                            <div class="price-item-mobile">
                                <span class="price-label-mobile">À VISTA</span>
                                <span class="price-value-mobile cash">{{ formatCurrency(item.price_se_cash) }}</span>
                            </div>
                        </v-col>
                        <v-col>
                            <div class="price-item-mobile">
                                <span class="price-label-mobile">A PRAZO</span>
                                <span class="price-value-mobile term">{{ formatCurrency(item.price_se_term) }}</span>
                            </div>
                        </v-col>
                    </v-row>
                </div>
                 <div v-if="canViewNE" class="price-section mt-3">
                    <h4 class="region-title">NORDESTE</h4>
                     <v-row no-gutters>
                        <v-col>
                            <div class="price-item-mobile">
                                <span class="price-label-mobile">À VISTA</span>
                                <span class="price-value-mobile cash">{{ formatCurrency(item.price_ne_cash) }}</span>
                            </div>
                        </v-col>
                        <v-col>
                            <div class="price-item-mobile">
                                <span class="price-label-mobile">A PRAZO</span>
                                <span class="price-value-mobile term">{{ formatCurrency(item.price_ne_term) }}</span>
                            </div>
                        </v-col>
                    </v-row>
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
import { useUserStore } from '@/stores/user';
import { useDisplay } from 'vuetify';

type Product = {
  id: string;
  name: string;
  composition: string;
  grammage: string;
  unit: 'metro' | 'kg';
  rendimento?: string | null;
  price_se_cash: number;
  price_se_term: number;
  price_ne_cash: number;
  price_ne_term: number;
};

const userStore = useUserStore();
const { mobile: isMobile } = useDisplay();
const loading = ref(true);
const search = ref('');
const products = ref<Product[]>([]);

const canViewSE = computed(() => userStore.profile?.allowed_regions?.includes('SE') || userStore.isAdmin);
const canViewNE = computed(() => userStore.profile?.allowed_regions?.includes('NE') || userStore.isAdmin);

const filteredProducts = computed(() => {
  if (!search.value) return products.value;
  const query = search.value.toLowerCase();
  return products.value.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.composition?.toLowerCase().includes(query)
  );
});

const getUnitChipColor = (unit: 'metro' | 'kg') => {
  return unit === 'kg' ? '#7E57C2' : '#4DB6AC';
};

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
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

onMounted(fetchPrices);
</script>

<style scoped lang="scss">
.mobile-price-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 4px solid;
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
  height: 100%; /* Garante que os cards na mesma linha tenham a mesma altura */

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
  }
}

.mobile-price-card .v-card-title h3 {
    font-size: 1.15rem !important;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 0.9rem;
  color: #a0a0a0;
  .info-value {
    color: white;
    font-weight: 500;
  }
}

.price-section {
  .region-title {
    font-size: 0.7rem;
    font-weight: bold;
    color: #a0a0a0;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
    background-color: rgba(255, 255, 255, 0.05);
    padding: 4px 8px;
    border-radius: 4px;
    display: inline-block;
  }
}

.price-item-mobile {
  display: flex;
  flex-direction: column;
  padding: 8px;
  background-color: rgba(0,0,0,0.2);
  border-radius: 6px;
  text-align: center;

  .price-label-mobile {
    font-size: 0.7rem;
    color: #a0a0a0;
    font-weight: 500;
    margin-bottom: 2px;
  }

  .price-value-mobile {
    font-size: 1.2rem;
    font-weight: bold;
    &.cash {
      color: #4DB6AC; // teal-lighten-2
    }
    &.term {
      color: #7986CB; // indigo-lighten-2
    }
  }
}

.mobile-price-card.unit--kg {
  background-color: rgba(103, 58, 183, 0.1);
  border-left-color: #7E57C2;
}
.mobile-price-card.unit--metro {
  background-color: rgba(0, 150, 136, 0.1);
  border-left-color: #4DB6AC;
}
</style>
