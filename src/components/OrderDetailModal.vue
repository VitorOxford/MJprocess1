<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="900px" persistent>
    <v-card class="glassmorphism-card-dialog">
      <div class="modal-header text-center pa-4">
        <div>
          <h2 class="text-h5 font-weight-bold">Detalhes do Pedido</h2>
          <p v-if="order" class="text-body-2 text-medium-emphasis">
            Acompanhamento do Pedido #{{ String(order.order_number).padStart(4, '0') }}
          </p>
        </div>
        <div class="header-actions">
            <v-btn icon="mdi-close" variant="tonal" color="white" @click="$emit('close')"></v-btn>
        </div>
      </div>

      <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
      </div>
      <v-alert v-else-if="error" type="error" prominent class="ma-4">{{ error }}</v-alert>

      <v-card-text v-else-if="order" class="pa-md-6 pa-4">
        <v-card class="order-info-card mb-6" variant="outlined">
          <v-row no-gutters>
            <v-col cols="12" sm="5" class="pa-3">
              <div class="text-caption text-grey">CLIENTE</div>
              <div class="text-h6 font-weight-bold">{{ order.customer_name }}</div>
            </v-col>
            <v-divider vertical class="d-none d-sm-block"></v-divider>
            <v-col cols="12" sm="4" class="pa-3">
              <div class="text-caption text-grey">VENDEDOR</div>
              <div class="text-h6 font-weight-medium">{{ order.profiles?.full_name || 'N/A' }}</div>
            </v-col>
             <v-divider vertical class="d-none d-sm-block"></v-divider>
            <v-col cols="12" sm="3" class="pa-3 text-sm-right">
                <div class="text-caption text-grey">STATUS GERAL</div>
                <v-chip size="small" :color="statusColorMap[order.status]" variant="flat" label class="mt-1 font-weight-bold">{{ statusDisplayMap[order.status] || order.status }}</v-chip>
            </v-col>
          </v-row>
        </v-card>

        <h3 class="text-h6 font-weight-bold mb-4">
            {{ focusedItem ? 'Item em Destaque' : 'Itens do Lançamento' }}
        </h3>

        <v-card v-if="focusedItem" class="item-card focused-item mb-4" variant="flat">
          <div class="d-flex">
            <v-img :src="focusedItem.stamp_image_url" class="item-thumbnail large-thumbnail" aspect-ratio="1" cover></v-img>
            <div class="item-content">
              <div class="item-info">
                <h4 class="text-h6 font-weight-bold">{{ focusedItem.stamp_ref }}</h4>
                <p class="text-body-2 text-medium-emphasis">{{ focusedItem.fabric_type }} - <strong>{{ formatMeters(focusedItem.quantity_meters) }}m</strong></p>
              </div>
              <div class="item-actions">
                <v-chip :color="getItemDisplay(focusedItem).color" :prepend-icon="getItemDisplay(focusedItem).icon" label class="status-chip font-weight-bold">
                  {{ getItemDisplay(focusedItem).text }}
                </v-chip>
                <v-btn v-if="focusedItem.is_op_generated" icon="mdi-file-pdf-box" color="info" variant="text" size="small" @click="emit('generatePdf', focusedItem)">
                  <v-tooltip activator="parent" location="top">Gerar OP</v-tooltip>
                </v-btn>
              </div>
            </div>
          </div>
        </v-card>

        <div v-if="otherItems.length > 0">
           <v-divider v-if="focusedItem" class="my-4"></v-divider>
           <h4 v-if="focusedItem" class="text-subtitle-1 font-weight-bold mb-3">Outros Itens</h4>
            <v-card v-for="item in otherItems" :key="item.id" class="item-card mb-3" variant="flat">
                 <div class="d-flex align-center pa-3">
                    <v-img :src="item.stamp_image_url" class="item-thumbnail" aspect-ratio="1" cover></v-img>
                    <div class="item-info mx-4">
                        <div class="font-weight-bold">{{ item.stamp_ref }}</div>
                        <div class="text-caption">{{ item.fabric_type }} - {{ formatMeters(item.quantity_meters) }}m</div>
                    </div>
                     <v-spacer></v-spacer>
                    <div class="item-actions">
                         <v-chip :color="getItemDisplay(item).color" :prepend-icon="getItemDisplay(item).icon" size="small" label class="status-chip font-weight-bold">
                           {{ getItemDisplay(item).text }}
                         </v-chip>
                         <v-btn v-if="item.is_op_generated" icon="mdi-file-pdf-box" color="info" variant="text" size="small" @click="emit('generatePdf', item)">
                            <v-tooltip activator="parent" location="top">Gerar OP</v-tooltip>
                        </v-btn>
                    </div>
                 </div>
            </v-card>
        </div>

         <div v-if="!order.is_launch && order.details" class="mt-4">
             <h4 class="text-subtitle-1 font-weight-bold mb-2">Observações da Estampa</h4>
             <p class="text-body-2 text-medium-emphasis pa-3 bg-black-transparent rounded">
                {{ order.details.stamp_details || 'Nenhuma observação.' }}
             </p>
        </div>
      </v-card-text>

      <v-card-actions class="dialog-footer pa-4">
        <v-spacer></v-spacer>
        <v-btn size="large" text @click="$emit('close')">Fechar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { supabase } from '@/api/supabase';

const props = defineProps({
  show: Boolean,
  orderId: String,
  itemId: String,
});
const emit = defineEmits(['close', 'generatePdf']);

const order = ref<any | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const focusedItem = computed(() => {
    if (!props.itemId || !order.value || !order.value.order_items) return null;
    return order.value.order_items.find((item: any) => item.id === props.itemId);
});

const otherItems = computed(() => {
    if (!order.value || !order.value.order_items) return [];
    if (!focusedItem.value) return order.value.order_items;
    return order.value.order_items.filter((item: any) => item.id !== focusedItem.value.id);
});

const statusDisplayMap: Record<string, string> = {
    design_pending: 'No Design', in_design: 'Em Design', customer_approval: 'Aprovação Vendedor',
    approved_by_designer: 'Aprovado (Designer)', approved_by_seller: 'Aprovado (Vendedor)',
    production_queue: 'Fila de Produção', in_printing: 'Em Impressão',
    in_cutting: 'Em Corte', completed: 'Finalizado', pending_stock: 'Aguardando Estoque'
};
const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey', customer_approval: 'orange',
    approved_by_designer: 'teal', approved_by_seller: 'green',
    production_queue: 'grey', in_printing: 'blue', in_cutting: 'purple',
    completed: 'success', pending_stock: 'warning'
};
const tagColorMap: Record<string, string> = {
    'Desenvolvimento': 'primary', 'Alteração': 'warning', 'Finalização': 'success', 'Aprovado': 'green'
};

const isItemReleasedForProd = (status: string) => {
    const releasedStatuses = ['approved_by_designer', 'approved_by_seller', 'production_queue', 'in_printing', 'in_cutting', 'completed'];
    return releasedStatuses.includes(status);
};

const getItemDisplay = (item: any) => {
    if (item.has_insufficient_stock) {
        return { text: 'Aguardando Estoque', color: 'warning', icon: 'mdi-package-variant-remove' };
    }
    if (order.value?.status === 'design_pending') {
        const tagInfo = tagColorMap[item.design_tag];
        return {
            text: item.design_tag,
            color: tagInfo || 'default',
            icon: 'mdi-palette'
        }
    }
    const statusInfo = statusDisplayMap[item.status] || item.status;
    const colorInfo = statusColorMap[item.status] || 'default';
    const iconMap = {
        'production_queue': 'mdi-timer-sand',
        'in_printing': 'mdi-printer',
        'in_cutting': 'mdi-content-cut',
        'completed': 'mdi-check-circle'
    };
    return {
        text: statusInfo,
        color: colorInfo,
        icon: iconMap[item.status] || 'mdi-progress-question'
    }
}

const fetchOrder = async (id: string) => {
  if (!id) return;
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('*, profiles:created_by (full_name), stores (name), order_items(*, has_insufficient_stock)')
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

const formatMeters = (value: number | undefined | null) => {
    if (value === null || value === undefined) return '0';
    return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

watch(() => props.orderId, (newId) => {
  if (newId && props.show) {
    fetchOrder(newId);
  } else {
    order.value = null;
  }
}, { immediate: true });
</script>

<style scoped lang="scss">
.glassmorphism-card-dialog {
  backdrop-filter: blur(25px) saturate(150%);
  -webkit-backdrop-filter: blur(25px) saturate(150%);
  background-color: rgba(30, 30, 35, 0.85) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
  position: relative;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  .header-actions {
    position: absolute;
    top: 50%;
    right: 16px;
    transform: translateY(-50%);
  }
}

.order-info-card {
  background-color: rgba(0,0,0,0.2);
  border-radius: 12px;
  border-color: rgba(255,255,255,0.1) !important;
}

.dialog-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.item-card {
  background-color: rgba(255,255,255,0.05);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: rgba(255,255,255,0.08);
  }
}

.focused-item {
    background-color: rgba(var(--v-theme-primary-rgb), 0.1);
    border-color: rgba(var(--v-theme-primary-rgb), 0.3);
}

.item-thumbnail {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  flex-shrink: 0;
}

.large-thumbnail {
    width: 80px;
    height: 80px;
}

.item-content {
  display: flex;
  align-items: center;
  flex-grow: 1;
  gap: 16px;
}

.item-info {
  flex-grow: 1;
}

.item-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  min-width: 180px;
}

.status-chip {
  min-width: 150px;
  justify-content: center;
}

.bg-black-transparent {
    background-color: rgba(0,0,0,0.2);
}
</style>
