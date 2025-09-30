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
            <v-col cols="12" sm="4" class="pa-3">
              <div class="text-caption text-grey">CLIENTE</div>
              <div class="text-h6 font-weight-bold">{{ order.customer_name }}</div>
            </v-col>
            <v-divider vertical class="d-none d-sm-block"></v-divider>
            <v-col cols="12" sm="3" class="pa-3">
              <div class="text-caption text-grey">VENDEDOR</div>
              <div class="text-h6 font-weight-medium">{{ order.profiles?.full_name || 'N/A' }}</div>
            </v-col>
            <v-divider vertical class="d-none d-sm-block"></v-divider>
            <v-col cols="6" sm="2" class="pa-3">
                <div class="text-caption text-grey">DATA</div>
                <div class="text-h6 font-weight-bold">{{ formatDate(order.created_at) }}</div>
            </v-col>
            <v-divider vertical class="d-none d-sm-block"></v-divider>
            <v-col cols="6" sm="3" class="pa-3 text-sm-right">
                <div class="text-caption text-grey">METRAGEM TOTAL</div>
                <div class="text-h6 font-weight-bold">{{ formatMeters(totalMeters) }}m</div>
            </v-col>
          </v-row>
        </v-card>

        <h3 class="text-h6 font-weight-bold mb-4">
            {{ focusedItem ? 'Item em Destaque' : (order.is_launch ? 'Itens do Lançamento' : 'Item do Pedido') }}
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
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    // Se não houver item focado (clique no card pai), mostra todos os itens
    if (!focusedItem.value) return order.value.order_items;
    // Se houver um item focado, mostra os outros
    return order.value.order_items.filter((item: any) => item.id !== focusedItem.value.id);
});

const totalMeters = computed(() => {
    if (!order.value) return 0;
    if (order.value.is_launch && order.value.order_items) {
        return order.value.order_items.reduce((sum: number, item: any) => sum + (item.quantity_meters || 0), 0);
    }
    return order.value.quantity_meters || 0;
});


const getItemDisplay = (item: any) => {
    if (item.has_insufficient_stock) {
        return { text: 'Aguardando Estoque', color: 'warning', icon: 'mdi-package-variant-remove' };
    }
    if (item.status === 'design_pending' && item.design_tag) {
        const tagColorMap: Record<string, string> = {
            'Desenvolvimento': 'primary',
            'Alteração': 'orange',
            'Finalização': 'info',
            'Aprovado': 'teal',
        };
        return {
            text: `Design: ${item.design_tag}`,
            color: tagColorMap[item.design_tag] || 'grey',
            icon: 'mdi-palette-outline',
        };
    }
    const statusDisplayMap: Record<string, { text: string; color: string; icon: string }> = {
        'customer_approval': { text: 'Aprovação Vendedor', color: 'amber', icon: 'mdi-account-clock-outline' },
        'changes_requested': { text: 'Solicitado Alteração', color: 'error', icon: 'mdi-alert-circle-outline' },
        'approved_by_seller': { text: 'Aprovado', color: 'success', icon: 'mdi-check-decagram' },
        'production_queue': { text: 'Fila de Produção', color: 'blue-grey', icon: 'mdi-timer-sand' },
        'in_printing': { text: 'Em Impressão', color: 'blue', icon: 'mdi-printer' },
        'in_cutting': { text: 'Em Corte', color: 'purple', icon: 'mdi-content-cut' },
        'completed': { text: 'Finalizado', color: 'teal', icon: 'mdi-check-circle' },
    };
    const displayInfo = statusDisplayMap[item.status];
    if (displayInfo) {
        return displayInfo;
    }
    return { text: item.status, color: 'default', icon: 'mdi-progress-question' };
};


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

const formatMeters = (value: number | undefined | null): string => {
    if (value === null || value === undefined) return '0';
    return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
        return format(parseISO(dateString), 'dd/MM/yy', { locale: ptBR });
    } catch {
        return 'Data inválida';
    }
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
