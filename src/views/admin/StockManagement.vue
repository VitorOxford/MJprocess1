<template>
  <v-container class="py-6">
    <v-toolbar color="transparent" class="mb-6">
      <v-icon size="32" class="mr-3">mdi-warehouse</v-icon>
      <v-toolbar-title class="font-weight-bold text-h5">Gestão de Estoque</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field
        v-model="search"
        append-inner-icon="mdi-magnify"
        label="Buscar Tecido"
        single-line
        hide-details
        density="compact"
        variant="solo-filled"
        flat
        class="mr-4"
        style="max-width: 300px;"
      ></v-text-field>
      <v-btn color="primary" @click="openDialog()" elevation="2" size="large">
        <v-icon start>mdi-plus</v-icon>
        Adicionar Tecido
      </v-btn>
    </v-toolbar>

    <v-row v-if="!loading">
      <v-col
        v-for="item in filteredStockItems"
        :key="item.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <div class="stock-card-container">
          <div
            class="stock-card"
            :style="{ '--fill-percentage': `${getStockLevelInfo(item).percentage}%`, '--fill-color': getStockLevelInfo(item).color }"
          >
            <div class="card-content">
              <div class="card-actions">
                <v-btn icon variant="text" size="small" @click="openDialog(item)">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn icon variant="text" size="small" color="error" @click="deleteItem(item)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </div>

              <h3 class="fabric-title">{{ item.fabric_type }}</h3>

              <div class="stock-quantity">
                {{ item.available_meters.toLocaleString('pt-BR') }}
                <span class="stock-unit">{{ item.unit_of_measure }}</span>
              </div>

              <div class="info-tags">
                <v-chip size="small" label prepend-icon="mdi-cash">
                  {{ formatCurrency(item.base_price) }}
                </v-chip>
                <v-chip v-if="item.rendimento" size="small" label prepend-icon="mdi-arrow-expand-all">
                  {{ item.rendimento }} m/kg
                </v-chip>
                <v-chip size="small" label prepend-icon="mdi-alert-circle-outline">
                  Min: {{ item.low_stock_threshold || 0 }} {{ item.unit_of_measure }}
                </v-chip>
              </div>

            </div>
          </div>
        </div>
      </v-col>

      <v-col v-if="filteredStockItems.length === 0" class="text-center text-grey mt-10">
        <v-icon size="60">mdi-magnify-close</v-icon>
        <p class="mt-4">Nenhum tecido encontrado com o termo "{{ search }}".</p>
      </v-col>

    </v-row>
     <v-row v-else>
      <v-col class="text-center py-16">
        <v-progress-circular indeterminate size="64" color="primary"></v-progress-circular>
        <p class="mt-4">Carregando estoque...</p>
      </v-col>
    </v-row>


    <v-dialog v-model="dialog" max-width="800px" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <span class="text-h5">{{ formTitle }}</span>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-form ref="form">
            <v-row>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model="editedItem.fabric_type"
                  label="Tipo do Tecido (Nome)"
                  :rules="[rules.required]"
                  variant="outlined"
                  prepend-inner-icon="mdi-tshirt-crew-outline"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6">
                 <v-text-field
                  v-model="editedItem.gestao_click_id"
                  label="ID do Produto no GestãoClick"
                  variant="outlined"
                  hint="Opcional, para sincronização"
                  prepend-inner-icon="mdi-link-variant"
                ></v-text-field>
              </v-col>
               <v-col cols="12" sm="6">
                <v-select
                  v-model="editedItem.unit_of_measure"
                  :items="['m', 'kg']"
                  label="Unidade de Medida"
                  :rules="[rules.required]"
                  variant="outlined"
                  prepend-inner-icon="mdi-ruler"
                ></v-select>
              </v-col>
              <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedItem.available_meters"
                  label="Quantidade em Estoque"
                  type="number"
                  :suffix="editedItem.unit_of_measure"
                  :rules="[rules.required]"
                  variant="outlined"
                  prepend-inner-icon="mdi-database-outline"
                ></v-text-field>
              </v-col>
               <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedItem.base_price"
                  label="Preço Base (Custo)"
                  type="number"
                  prefix="R$"
                  variant="outlined"
                  prepend-inner-icon="mdi-cash"
                ></v-text-field>
              </v-col>
              <v-col cols="12" sm="6" v-if="editedItem.unit_of_measure === 'kg'">
                <v-text-field
                  v-model.number="editedItem.rendimento"
                  label="Rendimento (metros por kg)"
                  type="number"
                  suffix="m/kg"
                  variant="outlined"
                  hint="Quantos metros o tecido rende por quilo"
                   prepend-inner-icon="mdi-arrow-expand-all"
                ></v-text-field>
              </v-col>
               <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedItem.meters_per_roll"
                  label="Metros por Rolo (Referência)"
                  type="number"
                  suffix="m"
                  variant="outlined"
                   prepend-inner-icon="mdi-tape-measure"
                ></v-text-field>
              </v-col>
               <v-col cols="12" sm="6">
                <v-text-field
                  v-model.number="editedItem.low_stock_threshold"
                  label="Alerta de Estoque Baixo"
                  type="number"
                  :suffix="editedItem.unit_of_measure"
                  variant="outlined"
                  hint="Nível para alerta vermelho"
                  prepend-inner-icon="mdi-alert-circle-outline"
                ></v-text-field>
              </v-col>
               <v-col cols="12">
                 <v-switch
                  v-model="editedItem.verification"
                  color="primary"
                  label="Exibir item no estoque"
                  messages="Se desmarcado, este item ficará oculto na tela principal, mas não será excluído."
                  inset
                ></v-switch>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn @click="close" size="large" variant="text">Cancelar</v-btn>
          <v-btn color="primary" @click="save" size="large" variant="flat" :loading="isSaving">Salvar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { useAppStore } from '@/stores/app';
import type { VForm } from 'vuetify/components';

interface StockItem {
  id?: string;
  fabric_type: string;
  available_meters: number;
  updated_at?: string;
  low_stock_threshold: number | null;
  base_price: number | null;
  rendimento: number | null;
  meters_per_roll: number | null;
  gestao_click_id: string | null;
  unit_of_measure: 'm' | 'kg';
  verification: boolean; // Usado para "Exibir/Ocultar"
  last_alerted_at?: string | null;
}

const appStore = useAppStore();
const stockItems = ref<StockItem[]>([]);
const loading = ref(true);
const isSaving = ref(false);
const search = ref('');
const dialog = ref(false);
const form = ref<VForm | null>(null);

const createDefaultItem = (): StockItem => ({
  fabric_type: '',
  available_meters: 0,
  low_stock_threshold: 10,
  base_price: null,
  rendimento: null,
  meters_per_roll: null,
  gestao_click_id: null,
  unit_of_measure: 'm',
  verification: true, // Itens novos são visíveis por padrão
});

const editedItem = ref<StockItem>(createDefaultItem());
const editedIndex = ref(-1);

const rules = {
  required: (v: any) => !!v || 'Campo obrigatório.',
};

const formTitle = computed(() => (editedIndex.value === -1 ? 'Adicionar Novo Tecido' : 'Editar Tecido'));

const filteredStockItems = computed(() => {
  let items = stockItems.value.filter(item => item.verification); // Filtra para mostrar apenas itens "visíveis"
  if (!search.value) {
    return items;
  }
  return items.filter(item =>
    item.fabric_type.toLowerCase().includes(search.value.toLowerCase())
  );
});

const fetchStock = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase.from('stock').select('*').order('fabric_type');
    if (error) throw error;
    stockItems.value = data;
  } catch (error: any) {
    appStore.showSnackbar(`Erro ao carregar estoque: ${error.message}`, 'error');
  } finally {
    loading.value = false;
  }
};

const openDialog = (item?: StockItem) => {
  if (item) {
    editedIndex.value = stockItems.value.findIndex(i => i.id === item.id);
    editedItem.value = { ...item };
  } else {
    editedIndex.value = -1;
    editedItem.value = createDefaultItem();
  }
  dialog.value = true;
};

const close = () => {
  dialog.value = false;
};

const save = async () => {
  if (!form.value) return;
  const { valid } = await form.value.validate();
  if (!valid) return;

  isSaving.value = true;

  const payload: Omit<StockItem, 'id' | 'updated_at' | 'last_alerted_at'> & { id?: string } = {
    ...editedItem.value,
    updated_at: new Date().toISOString(),
  };

  if (payload.unit_of_measure !== 'kg') {
      payload.rendimento = null;
  }

  try {
    const { data, error } = await supabase.from('stock').upsert(payload).select().single();
    if (error) throw error;

    await fetchStock(); // Recarrega todos os dados para garantir consistência
    appStore.showSnackbar('Item de estoque salvo com sucesso!', 'success');
    close();
  } catch (error: any) {
    appStore.showSnackbar(`Erro ao salvar item: ${error.message}`, 'error');
  } finally {
    isSaving.value = false;
  }
};

const deleteItem = async (item: StockItem) => {
  if (confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o tecido "${item.fabric_type}"? Para apenas ocultar, edite o item e desmarque a opção "Exibir item no estoque".`)) {
    try {
      const { error } = await supabase.from('stock').delete().match({ id: item.id });
      if (error) throw error;
      stockItems.value = stockItems.value.filter(i => i.id !== item.id);
      appStore.showSnackbar('Tecido excluído com sucesso.', 'success');
    } catch (error: any) {
      appStore.showSnackbar(`Erro ao excluir: ${error.message}`, 'error');
    }
  }
};

const getStockLevelInfo = (item: StockItem) => {
  const stock = item.available_meters;
  const min = item.low_stock_threshold || 0;

  // Define um "máximo" para o visual. Se não houver mínimo, o máximo é o dobro do estoque atual.
  // Se houver, o máximo é o triplo do mínimo, para dar uma boa margem visual.
  const max = min > 0 ? min * 3 : stock * 2;
  if (max === 0) return { percentage: 0, color: '#616161' }; // Cor cinza para estoque zerado

  const percentage = Math.min((stock / max) * 100, 100);

  // Lógica de cores
  const warningThreshold = min * 1.1; // 10% acima do mínimo
  let color = '#388e3c'; // Verde (padrão)
  if (stock <= min) {
    color = '#d32f2f'; // Vermelho
  } else if (stock <= warningThreshold) {
    color = '#f57c00'; // Laranja
  }

  return { percentage, color };
};

const formatCurrency = (value: number | undefined | null) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

onMounted(() => {
  fetchStock();
});
</script>

<style scoped lang="scss">
// Animação de entrada dos cards
@keyframes-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.stock-card-container {
  padding: 4px;
  animation: keyframes-fade-in 0.5s ease-out forwards;
}

// O card principal com o efeito de líquido
.stock-card {
  --fill-percentage: 50%;
  --fill-color: #388e3c;
  --wave-height: 8px;
  --wave-speed: 1.5s;

  position: relative;
  overflow: hidden;
  border-radius: 16px;
  background-color: rgba(30, 30, 30, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  color: white;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.5);
  }

  // Efeito da onda líquida
  &::before, &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 200%;
    height: var(--fill-percentage);
    background-color: var(--fill-color);
    opacity: 0.8;
    transition: height 1s ease-out, background-color 1s ease;
    animation: wave var(--wave-speed) linear infinite;
    z-index: 0;
  }

  // Segunda onda para um efeito mais realista
  &::after {
    opacity: 0.5;
    animation-direction: reverse;
    animation-duration: calc(var(--wave-speed) * 1.2);
  }

  .card-content {
    position: relative;
    z-index: 1;
    padding: 16px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
}

// Animação da onda
@keyframes wave {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

.card-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: rgba(0,0,0,0.3);
  border-radius: 12px;
  padding: 2px;
}

.fabric-title {
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: auto; // Empurra o título para cima
  padding-top: 16px;
}

.stock-quantity {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1;
  text-shadow: 1px 1px 5px rgba(0,0,0,0.5);
  margin-top: 8px;
}

.stock-unit {
  font-size: 1rem;
  font-weight: 400;
  margin-left: 4px;
  color: rgba(255, 255, 255, 0.7);
}

.info-tags {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
