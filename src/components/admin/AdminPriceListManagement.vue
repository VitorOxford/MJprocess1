<template>
  <v-container>
    <v-toolbar color="transparent">
      <v-toolbar-title class="font-weight-bold">Gerenciar Tabela de Preços</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field
        v-model="search"
        variant="solo-filled"
        flat
        density="compact"
        label="Buscar produto..."
        prepend-inner-icon="mdi-magnify"
        hide-details
        style="max-width: 300px;"
        class="mr-4"
        clearable
      ></v-text-field>
      <v-btn color="primary" @click="openDialog()">
        <v-icon start>mdi-plus</v-icon>
        Novo Produto
      </v-btn>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </div>
    <div v-else-if="filteredProducts.length === 0" class="text-center text-grey py-16">
      <v-icon size="48" class="mb-2">mdi-database-off-outline</v-icon>
      <p>Nenhum produto encontrado com o termo "{{ search }}".</p>
    </div>

    <v-row v-else>
      <v-col v-for="item in filteredProducts" :key="item.id" cols="12" sm="6" md="4">
        <v-card class="price-card" :class="`unit--${item.unit}`" variant="flat">
          <div class="card-actions-menu">
            <v-menu location="start">
              <template v-slot:activator="{ props }">
                <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text" size="small"></v-btn>
              </template>
              <v-list density="compact" class="menu-list-styling">
                <v-list-item @click="openDialog(item)" prepend-icon="mdi-pencil-outline">
                  <v-list-item-title>Editar</v-list-item-title>
                </v-list-item>
                <v-list-item @click="deleteItem(item)" prepend-icon="mdi-delete-outline" base-color="error">
                  <v-list-item-title>Excluir</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
          <v-card-text class="d-flex flex-column">
            <div class="mb-3">
              <h3 class="text-h6 font-weight-bold">{{ item.name }}</h3>
              <p class="text-caption text-medium-emphasis">{{ item.composition }}</p>
            </div>
            <div class="info-grid mb-4">
              <div class="info-item"><span class="info-label">Gramatura</span><span class="info-value">{{ item.grammage || 'N/A' }}</span></div>
              <div class="info-item"><span class="info-label">Largura</span><span class="info-value">{{ item.width_length || 'N/A' }}</span></div>
              <div class="info-item"><span class="info-label">Rolo</span><span class="info-value">{{ item.rolo || 'N/A' }}</span></div>
              <div v-if="item.unit === 'kg'" class="info-item"><span class="info-label">Rendimento</span><span class="info-value">{{ item.rendimento || 'N/A' }}</span></div>
              <div class="info-item"><span class="info-label">Unidade</span><v-chip :color="item.unit === 'kg' ? 'purple-lighten-2' : 'teal-lighten-1'" size="x-small" variant="flat" label class="mt-1">{{ item.unit }}</v-chip></div>
            </div>
            <v-spacer></v-spacer>
            <div class="price-region mt-2">
              <h4 class="region-title">SUDESTE</h4>
              <div class="price-values">
                <div class="price-type"><span>À Vista</span> {{ formatCurrency(item.price_se_cash) }}</div>
                <div class="price-type"><span>A Prazo</span> {{ formatCurrency(item.price_se_term) }}</div>
              </div>
            </div>
            <div class="price-region mt-2">
              <h4 class="region-title">NORDESTE</h4>
              <div class="price-values">
                <div class="price-type"><span>À Vista</span> {{ formatCurrency(item.price_ne_cash) }}</div>
                <div class="price-type"><span>A Prazo</span> {{ formatCurrency(item.price_ne_term) }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="700px" persistent>
      <v-card class="glassmorphism-card">
        <v-card-title class="dialog-header"><span class="text-h5">{{ formTitle }}</span></v-card-title>
        <v-card-text class="py-4">
          <v-text-field v-model="editedItem.name" label="Nome do Produto" variant="outlined"></v-text-field>
           <v-row>
            <v-col cols="12" sm="8">
              <v-text-field v-model="editedItem.composition" label="Composição" variant="outlined"></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
              <v-text-field v-model="editedItem.grammage" label="Gramatura" variant="outlined" hint="Ex: 180g/m²"></v-text-field>
            </v-col>
          </v-row>
          <v-row>
             <v-col cols="12" sm="4">
                <v-text-field v-model="editedItem.width_length" label="Largura e Comprimento" variant="outlined" hint="Ex: 1,60m"></v-text-field>
            </v-col>
             <v-col cols="12" sm="4">
                <v-text-field v-model="editedItem.rolo" label="Rolo" variant="outlined" hint="Ex: Aprox. 50m"></v-text-field>
            </v-col>
            <v-col cols="12" sm="4">
                <v-select v-model="editedItem.unit" :items="['metro', 'kg']" label="Unidade" variant="outlined"></v-select>
            </v-col>
            <v-col cols="12" sm="4" v-if="editedItem.unit === 'kg'">
                <v-text-field
                    v-model="editedItem.rendimento"
                    label="Rendimento (m/kg)"
                    variant="outlined"
                    hint="Ex: 3.5"
                ></v-text-field>
            </v-col>
          </v-row>
          <v-divider class="my-4"></v-divider>
          <p class="text-subtitle-1 font-weight-bold mb-2">Preços</p>
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field v-model.number="editedItem.price_se_cash" label="Preço Sudeste (À Vista)" type="number" variant="outlined" prefix="R$"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model.number="editedItem.price_se_term" label="Preço Sudeste (Prazo)" type="number" variant="outlined" prefix="R$"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model.number="editedItem.price_ne_cash" label="Preço Nordeste (À Vista)" type="number" variant="outlined" prefix="R$"></v-text-field>
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model.number="editedItem.price_ne_term" label="Preço Nordeste (Prazo)" type="number" variant="outlined" prefix="R$"></v-text-field>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="dialog-footer">
          <v-spacer></v-spacer>
          <v-btn text @click="closeDialog">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" @click="saveItem" :loading="isSaving">Salvar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';

type Product = {
  id: string; name: string; composition: string; grammage: string;
  unit: 'metro' | 'kg'; rendimento?: string | null; width_length?: string | null; rolo?: string | null;
  price_se_cash: number; price_se_term: number; price_ne_cash: number; price_ne_term: number;
};

const loading = ref(true);
const search = ref('');
const products = ref<Product[]>([]);
const dialog = ref(false);
const isSaving = ref(false);
const editedIndex = ref(-1);

const defaultItem: Partial<Product> = {
    name: '', composition: '', grammage: '', width_length: '', rolo: '', unit: 'metro', rendimento: null,
    price_se_cash: 0, price_se_term: 0, price_ne_cash: 0, price_ne_term: 0,
};

const editedItem = ref<Partial<Product>>({ ...defaultItem });

const formTitle = computed(() => editedIndex.value === -1 ? 'Novo Produto' : 'Editar Produto');
const filteredProducts = computed(() => {
    if (!search.value) return products.value;
    const query = search.value.toLowerCase();
    return products.value.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.composition?.toLowerCase().includes(query)
    );
});

const fetchProducts = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase.from('price_list').select('*').order('name');
    if (error) throw error;
    products.value = data || [];
  } catch (err) { /* ... */ }
  finally { loading.value = false; }
};

const openDialog = (item: Product | null = null) => {
    editedIndex.value = item ? products.value.findIndex(p => p.id === item.id) : -1;
    editedItem.value = item ? { ...item } : { ...defaultItem };
    dialog.value = true;
};
const closeDialog = () => { dialog.value = false; };
const saveItem = async () => {
    isSaving.value = true;
    try {
        const payload = { ...editedItem.value };
        if (payload.unit !== 'kg') payload.rendimento = null;
        if (editedIndex.value > -1) {
            const { id, ...updateData } = payload;
            const { error } = await supabase.from('price_list').update(updateData).eq('id', id as string);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('price_list').insert(payload as any);
            if (error) throw error;
        }
        await fetchProducts();
        closeDialog();
    } catch (err: any) { alert(`Erro: ${err.message}`);
    } finally { isSaving.value = false; }
};
const deleteItem = async (item: Product) => {
    if (confirm(`Tem certeza que deseja remover "${item.name}"?`)) {
        try {
            const { error } = await supabase.from('price_list').delete().eq('id', item.id);
            if (error) throw error;
            await fetchProducts();
        } catch (err: any) { alert(`Erro: ${err.message}`); }
    }
};

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

onMounted(fetchProducts);
</script>

<style scoped lang="scss">
.price-card {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 5px solid;
  border-radius: 12px;
  background-color: rgba(30, 30, 35, 0.8);
  transition: all 0.2s ease-in-out;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.25);
    border-color: rgba(var(--v-theme-primary), 0.6);
  }

  &.unit--kg { border-left-color: #7E57C2; }
  &.unit--metro { border-left-color: #4DB6AC; }
}

.card-actions-menu {
    position: absolute;
    top: 8px;
    right: 8px;
}
.menu-list-styling {
  background-color: rgba(45, 45, 50, 0.9) !important;
  backdrop-filter: blur(10px);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}
.info-item { display: flex; flex-direction: column; }
.info-label { font-size: 0.75rem; color: #a0a0a0; text-transform: uppercase; margin-bottom: 2px; }
.info-value { font-size: 0.9rem; font-weight: 500; color: white; }
.price-region { background-color: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 8px; }
.region-title { font-size: 0.7rem; font-weight: bold; color: #bdbdbd; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
.price-values { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.price-type { font-size: 1rem; font-weight: bold; color: white; span { font-size: 0.7rem; font-weight: 500; color: #a0a0a0; display: block; }}

.glassmorphism-card {
  backdrop-filter: blur(15px);
  background-color: rgba(35, 35, 40, 0.85);
  border-radius: 12px;
}
.dialog-header { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.dialog-footer { border-top: 1px solid rgba(255, 255, 255, 0.1); }
</style>
