<template>
  <v-container fluid>
    <v-toolbar color="transparent">
      <v-toolbar-title class="font-weight-bold">Comprovantes de Entrada (Sinais)</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field
        v-model="search"
        variant="solo-filled"
        flat
        density="compact"
        label="Buscar por cliente ou vendedor..."
        prepend-inner-icon="mdi-magnify"
        hide-details
        clearable
      ></v-text-field>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4 text-medium-emphasis">Buscando comprovantes...</p>
    </div>

    <v-alert v-else-if="error" type="error" prominent class="ma-4">
      {{ error }}
    </v-alert>

    <v-data-table
      v-else
      :headers="headers"
      :items="proofs"
      :search="search"
      class="bg-transparent mt-4"
      item-value="order_id"
      hover
    >
      <template v-slot:item.order_number="{ item }">
        <v-chip size="small" variant="tonal">#{{ String(item.order_number).padStart(4, '0') }}</v-chip>
      </template>

      <template v-slot:item.created_at="{ item }">
        {{ formatDate(item.created_at) }}
      </template>

      <template v-slot:item.down_payment_proof_url="{ item }">
        <v-btn
          :href="item.down_payment_proof_url"
          target="_blank"
          color="info"
          variant="tonal"
          size="small"
        >
          <v-icon start>mdi-file-download-outline</v-icon>
          Ver / Baixar
        </v-btn>
      </template>

       <template v-slot:no-data>
        <div class="text-center py-8 text-grey">
            Nenhum comprovante de entrada encontrado.
        </div>
      </template>
    </v-data-table>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/api/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Proof = {
  order_id: string;
  order_number: number;
  customer_name: string;
  creator_name: string;
  created_at: string;
  down_payment_proof_url: string;
};

const loading = ref(true);
const search = ref('');
const proofs = ref<Proof[]>([]);
const error = ref<string | null>(null);

const headers = [
  { title: 'Nº Pedido', key: 'order_number', sortable: true },
  { title: 'Cliente', key: 'customer_name', sortable: true },
  { title: 'Vendedor', key: 'creator_name', sortable: true },
  { title: 'Data do Lançamento', key: 'created_at', sortable: true },
  { title: 'Comprovante', key: 'down_payment_proof_url', sortable: false, align: 'end' },
];

const fetchProofs = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, created_at, down_payment_proof_url, creator:created_by(full_name)')
      .not('down_payment_proof_url', 'is', null)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    proofs.value = data.map((order: any) => ({
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        creator_name: order.creator?.full_name || 'N/A',
        created_at: order.created_at,
        down_payment_proof_url: order.down_payment_proof_url,
    }));
  } catch (err: any) {
    console.error('Erro ao buscar comprovantes:', err);
    error.value = `Não foi possível carregar os comprovantes: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
};

onMounted(fetchProofs);
</script>

<style scoped>
/* Estilos podem ser adicionados aqui se necessário */
</style>
