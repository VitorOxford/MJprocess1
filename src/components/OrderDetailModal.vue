<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="800px" persistent>
    <v-card class="glassmorphism-card">
      <v-toolbar color="transparent" density="compact">
        <v-toolbar-title class="font-weight-bold">
          Detalhes do Pedido
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="$emit('close')"></v-btn>
      </v-toolbar>

      <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
      </div>

      <v-alert v-else-if="error" type="error" prominent class="ma-4">
        {{ error }}
      </v-alert>

      <v-card-text v-else-if="order" class="py-4">
        <v-row>
          <v-col cols="12" md="7">
            <v-list density="compact" bg-color="transparent">
              <v-list-item title="Cliente" :subtitle="order.customer_name"></v-list-item>
              <v-list-item title="Status Atual">
                 <template #subtitle>
                    <v-chip size="small" :color="getStatusColor(order.status)" variant="flat">{{ statusDisplayMap[order.status] || order.status }}</v-chip>
                 </template>
              </v-list-item>
              <v-list-item title="Criado por" :subtitle="order.profiles?.full_name || 'N/A'"></v-list-item>
              <v-list-item title="Loja de Origem" :subtitle="order.stores?.name || 'N/A'"></v-list-item>
              <v-list-item title="Data de Criação" :subtitle="formatDateSafe(order.created_at)"></v-list-item>
              <v-list-item v-if="order.production_date" title="Data de Produção" :subtitle="formatDateSafe(order.production_date)"></v-list-item>
            </v-list>
          </v-col>
          <v-col cols="12" md="5">
             <h4 class="text-subtitle-1 font-weight-bold mb-2">Materiais e Anexos</h4>
              <v-list density="compact" bg-color="transparent" lines="two">
                  <v-list-item title="Tecido" :subtitle="order.details.fabric_type"></v-list-item>
                  <v-list-item title="Metragem" :subtitle="`${order.quantity_meters}m`"></v-list-item>
                  <v-list-item v-if="order.details.final_art_url" title="Arte Final">
                      <template #subtitle>
                         <v-btn
                            :href="order.details.final_art_url"
                            target="_blank"
                            size="small"
                            variant="text"
                            color="cyan"
                            class="pa-0"
                            prepend-icon="mdi-open-in-new"
                         >
                            Ver / Baixar Arte
                         </v-btn>
                      </template>
                  </v-list-item>
                  <v-list-item v-if="order.has_down_payment && order.down_payment_proof_url" title="Comprovante de Entrada">
                      <template #subtitle>
                         <v-btn
                            :href="getProofUrl(order.down_payment_proof_url)"
                            target="_blank"
                            size="small"
                            variant="text"
                            color="amber"
                            class="pa-0"
                            prepend-icon="mdi-receipt-text-check"
                         >
                            Ver Comprovante
                         </v-btn>
                      </template>
                  </v-list-item>
              </v-list>
          </v-col>
        </v-row>

        <div v-if="order.status === 'changes_requested'" class="mt-4">
          <v-divider class="my-4"></v-divider>
          <v-alert
            type="warning"
            variant="tonal"
            icon="mdi-comment-alert-outline"
            class="change-request-alert"
          >
            <div class="font-weight-bold">Alteração Solicitada</div>
            <div class="text-body-2 mt-1">{{ latestChangeComment }}</div>
          </v-alert>
        </div>

        <v-divider class="my-4"></v-divider>
         <h4 class="text-subtitle-1 font-weight-bold mb-2">Observações da Estampa</h4>
         <p class="text-body-2 text-medium-emphasis pa-2">
            {{ order.details.stamp_details }}
         </p>
      </v-card-text>

      <v-card-actions class="dialog-footer">
        <v-spacer></v-spacer>
        <v-btn text @click="$emit('close')">Fechar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const props = defineProps({
  show: Boolean,
  orderId: String,
});
const emit = defineEmits(['close']);

type OrderDetails = {
  id: string;
  customer_name: string;
  status: string;
  created_at: string;
  production_date: string | null;
  quantity_meters: number;
  has_down_payment: boolean; // NOVO
  down_payment_proof_url: string | null; // NOVO
  details: {
    fabric_type: string;
    stamp_details: string;
    final_art_url?: string;
  };
  profiles: { full_name: string; } | null;
  stores: { name: string; } | null;
  order_logs?: { created_at: string; description: string; log_type: string; }[];
};

const order = ref<OrderDetails | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const statusDisplayMap: Record<string, string> = {
    design_pending: 'Aguardando Design', in_design: 'Em Design', customer_approval: 'Aguardando Aprovação',
    production_queue: 'Na Fila de Produção', in_printing: 'Em Impressão', in_cutting: 'Corte e Acabamento',
    completed: 'Pronto para Envio'
};

const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey', in_design: 'blue', customer_approval: 'orange',
    production_queue: 'grey', in_printing: 'blue', in_cutting: 'orange', completed: 'green'
};

const getStatusColor = (status: string) => statusColorMap[status] || 'grey';

const formatDateSafe = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (e) {
        console.error("Erro ao formatar data:", e);
        return dateString;
    }
}

const getProofUrl = (path: string | null) => {
    if (!path) return '#';
    const { data } = supabase.storage.from('proofs').getPublicUrl(path);
    return data.publicUrl;
}

const latestChangeComment = computed(() => {
  if (order.value?.order_logs) {
    const latestLog = order.value.order_logs
      .filter(log => log.log_type === 'COMMENT')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return latestLog[0]?.description || 'Detalhes da alteração não fornecidos.';
  }
  return 'Detalhes da alteração não fornecidos.';
});

const fetchOrder = async (id: string) => {
  if (!id) return;
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('orders')
      // Adicionado os novos campos na query
      .select(`*, profiles:created_by (full_name), stores (name), order_logs(created_at, description, log_type)`)
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    order.value = data;
  } catch (e: any) {
    error.value = `Erro ao carregar o pedido: ${e.message}`;
  } finally {
    loading.value = false;
  }
};

watch(() => props.orderId, (newId) => {
  if (newId && props.show) {
    fetchOrder(newId);
  } else {
    order.value = null;
  }
});
</script>

<style scoped lang="scss">
.glassmorphism-card {
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
.dialog-header, .dialog-footer {
  border-color: rgba(255, 255, 255, 0.1) !important;
}

.change-request-alert {
  border-left: 4px solid rgb(var(--v-theme-warning)) !important;
  background-color: rgba(255, 152, 0, 0.1) !important;
}
</style>
