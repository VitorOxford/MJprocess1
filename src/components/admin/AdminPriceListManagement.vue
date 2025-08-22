<template>
  <v-container>
    <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">Gerenciar Tabela de Preços</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="openDialog()">
            <v-icon start>mdi-plus</v-icon>
            Novo Produto
        </v-btn>
    </v-toolbar>

    <v-data-table
        :headers="headers"
        :items="products"
        :loading="loading"
        class="elevation-0 bg-transparent"
        item-value="id"
    >
        <template v-slot:item.price_se="{ item }">
          {{ formatCurrency(item.price_se_cash) }} / {{ formatCurrency(item.price_se_term) }}
        </template>
        <template v-slot:item.price_ne="{ item }">
          {{ formatCurrency(item.price_ne_cash) }} / {{ formatCurrency(item.price_ne_term) }}
        </template>
        <template v-slot:item.actions="{ item }">
            <v-btn icon="mdi-pencil-outline" variant="text" size="small" @click="openDialog(item)"></v-btn>
            <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" @click="deleteItem(item)"></v-btn>
        </template>
    </v-data-table>

    <v-dialog v-model="dialog" max-width="700px" persistent>
      <v-card class="glassmorphism-card">
        <v-card-title class="dialog-header"><span class="text-h5">{{ formTitle }}</span></v-card-title>
        <v-card-text class="py-4">
          <v-text-field v-model="editedItem.name" label="Nome do Produto" variant="outlined"></v-text-field>
          <v-text-field v-model="editedItem.composition" label="Composição" variant="outlined"></v-text-field>
          <v-text-field v-model="editedItem.grammage" label="Gramatura" variant="outlined"></v-text-field>
          <v-select v-model="editedItem.unit" :items="['metro', 'kg']" label="Unidade de Medida" variant="outlined"></v-select>

          <v-text-field
            v-if="editedItem.unit === 'kg'"
            v-model="editedItem.rendimento"
            label="Rendimento (metros por kg)"
            variant="outlined"
            hint="Ex: 3.5m"
          ></v-text-field>

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
  id: string;
  name: string;
  composition: string;
  grammage: string;
  unit: 'metro' | 'kg';
  rendimento?: string | null; // NOVO CAMPO
  price_se_cash: number;
  price_se_term: number;
  price_ne_cash: number;
  price_ne_term: number;
};

const products = ref<Product[]>([]);
const loading = ref(true);
const dialog = ref(false);
const isSaving = ref(false);
const editedIndex = ref(-1);

const defaultItem: Partial<Product> = {
    name: '',
    composition: '',
    grammage: '',
    unit: 'metro',
    rendimento: null,
    price_se_cash: 0,
    price_se_term: 0,
    price_ne_cash: 0,
    price_ne_term: 0,
};

const editedItem = ref<Partial<Product>>({ ...defaultItem });

const headers = [
  { title: 'Produto', key: 'name' },
  { title: 'Preço Sudeste (À Vista/Prazo)', key: 'price_se' },
  { title: 'Preço Nordeste (À Vista/Prazo)', key: 'price_ne' },
  { title: 'Ações', key: 'actions', sortable: false, align: 'end' },
];

const formTitle = computed(() => editedIndex.value === -1 ? 'Novo Produto' : 'Editar Produto');

const fetchProducts = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase.from('price_list').select('*').order('name');
    if (error) throw error;
    products.value = data || [];
  } catch (err) { /* ... */ }
  finally { loading.value = false; }
};

const openDialog = (item: Product | null) => {
    editedIndex.value = item ? products.value.indexOf(item) : -1;
    editedItem.value = item ? { ...item } : { ...defaultItem };
    dialog.value = true;
};

const closeDialog = () => {
    dialog.value = false;
};

const saveItem = async () => {
    isSaving.value = true;
    try {
        const payload = { ...editedItem.value };
        // Garante que o rendimento seja nulo se a unidade não for kg
        if (payload.unit !== 'kg') {
            payload.rendimento = null;
        }

        if (editedIndex.value > -1) { // Edição
            const { id, ...updateData } = payload;
            const { error } = await supabase.from('price_list').update(updateData).eq('id', id);
            if (error) throw error;
        } else { // Criação
            const { error } = await supabase.from('price_list').insert(payload);
            if (error) throw error;
        }
        await fetchProducts();
        closeDialog();
    } catch (err: any) {
        alert(`Erro: ${err.message}`);
    } finally {
        isSaving.value = false;
    }
};

const deleteItem = async (item: Product) => {
    if (confirm(`Tem certeza que deseja remover "${item.name}"?`)) {
        try {
            const { error } = await supabase.from('price_list').delete().eq('id', item.id);
            if (error) throw error;
            await fetchProducts();
        } catch (err: any) {
            alert(`Erro: ${err.message}`);
        }
    }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

onMounted(fetchProducts);

</script>

<style scoped>
.glassmorphism-card {
  backdrop-filter: blur(15px);
  background-color: rgba(35, 35, 40, 0.85);
  border-radius: 12px;
}
.dialog-header { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.dialog-footer { border-top: 1px solid rgba(255, 255, 255, 0.1); }
</style>
