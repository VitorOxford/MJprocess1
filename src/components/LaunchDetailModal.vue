<template>
  <div>
    <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="1200px" persistent>
      <v-card class="glassmorphism-card">
        <v-toolbar color="transparent">
          <v-toolbar-title class="font-weight-bold">Gerenciar Lançamento</v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon="mdi-close" variant="text" @click="$emit('close')"></v-btn>
        </v-toolbar>

        <div v-if="loading" class="loading-container">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </div>

        <v-card-text v-else-if="order" class="pa-4">
          <div class="header-info mb-6">
            <div>
              <div class="text-caption text-grey">Cliente</div>
              <div class="text-h6 font-weight-bold">{{ order.customer_name }}</div>
            </div>
            <div>
              <div class="text-caption text-grey">Vendedor</div>
              <div class="text-body-1">{{ order.created_by.full_name }}</div>
            </div>
          </div>

          <v-row>
            <v-col v-for="item in order.order_items" :key="item.id" cols="12" md="6">
              <div class="item-card">
                <div class="item-card-image-wrapper">
                  <v-img
                    :src="item.stamp_image_url"
                    class="item-thumbnail"
                    cover
                    @click="openImageModal(item.stamp_image_url, item.stamp_ref)"
                  >
                    <template #placeholder>
                      <div class="d-flex align-center justify-center fill-height bg-grey-darken-3">
                        <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
                      </div>
                    </template>
                  </v-img>
                </div>
                <div class="item-card-content">
                  <v-text-field
                    v-model="item.stamp_ref"
                    variant="plain"
                    density="compact"
                    hide-details
                    class="font-weight-bold text-h6 editable-field pa-0"
                    :readonly="!canEditReference"
                    @blur="updateItemReference(item)"
                    :title="canEditReference ? 'Editar referência' : 'Referência'"
                  />
                  <div class="text-body-2 text-medium-emphasis mt-1">
                    {{ item.fabric_type }} - {{ Number(item.quantity_meters).toLocaleString('pt-BR') }}m
                  </div>

                  <p v-if="item.notes" class="text-caption text-amber-lighten-2 mt-3 font-italic">
                    <v-icon start size="x-small">mdi-comment-quote-outline</v-icon>
                    {{ item.notes }}
                  </p>

                  <v-spacer></v-spacer>

                  <div class="actions-wrapper">
                    <v-chip
                      v-if="item.status === 'design_pending'"
                      size="small"
                      :color="tagColors[item.design_tag]"
                      label
                      class="status-chip"
                    >{{ item.design_tag }}</v-chip>

                    <v-chip v-else-if="isItemApprovedBySeller(item.status)" color="success" variant="flat" size="small" class="status-chip">
                      <v-icon start>mdi-check-all</v-icon>
                      Aprovado
                    </v-chip>

                     <v-chip v-else-if="isItemInProduction(item.status)" color="teal" variant="flat" size="small" class="status-chip">
                      <v-icon start>mdi-send</v-icon>
                      Liberado
                    </v-chip>

                    <v-chip v-else-if="item.status === 'customer_approval'" color="orange" variant="tonal" size="small" class="status-chip">
                      Aguardando Vendedor
                    </v-chip>

                    <div class="d-flex align-center ga-2">
                       <v-tooltip location="top" text="Liberar Ordem de Produção (OP)">
                          <template #activator="{ props }">
                            <v-checkbox-btn
                              v-if="isReadyForProductionFlow(item)"
                              v-bind="props"
                              :model-value="item.is_op_generated"
                              @update:model-value="() => toggleOpGenerated(item)"
                              color="info"
                            />
                          </template>
                        </v-tooltip>

                       <v-btn
                          v-if="!isItemApprovedBySeller(item.status) && !isItemInProduction(item.status) && item.status !== 'customer_approval'"
                          :color="item.design_tag === 'Aprovado' || item.design_tag === 'Finalização' ? 'teal' : 'primary'"
                          @click="item.design_tag === 'Aprovado' || item.design_tag === 'Finalização' ? emit('releaseItem', item) : emit('sendToSeller', item)"
                          size="small"
                          variant="tonal"
                        >
                          {{ item.design_tag === 'Aprovado' || item.design_tag === 'Finalização' ? 'Liberar' : 'Enviar p/ Aprovação' }}
                        </v-btn>

                        <v-btn v-if="isItemApprovedBySeller(item.status)" color="primary" variant="tonal" size="small" @click="emit('releaseItem', item)">
                          Liberar Item
                        </v-btn>
                    </div>
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>

    <ImageModal
      :show="showImageModal"
      :image-url="selectedImageUrl"
      :file-name="selectedImageName"
      @close="showImageModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import ImageModal from './ImageModal.vue';

const props = defineProps({
  show: Boolean,
  orderId: String,
});

const emit = defineEmits(['close', 'sendToSeller', 'releaseItem', 'itemUpdated']);

const userStore = useUserStore();
const order = ref<any | null>(null);
const loading = ref(false);

const showImageModal = ref(false);
const selectedImageUrl = ref<string | undefined>('');
const selectedImageName = ref<string | undefined>('');

const tagColors: Record<string, string> = {
  'Desenvolvimento': 'primary',
  'Alteração': 'warning',
  'Finalização': 'success',
  'Aprovado': 'green'
};

const canEditReference = computed(() => {
  const role = userStore.profile?.role;
  return role === 'admin' || role === 'designer';
});

const fetchOrderDetails = async (id: string) => {
  if (!id) return;
  loading.value = true;
  order.value = null;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, created_by:profiles!created_by(full_name), order_items(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    order.value = data;
  } catch (err) {
    console.error("Erro ao buscar detalhes do pedido:", err);
  } finally {
    loading.value = false;
  }
};

watch(() => props.orderId, (newId) => {
  if (newId && props.show) {
    fetchOrderDetails(newId);
  }
});

const openImageModal = (url: string, name: string) => {
  selectedImageUrl.value = url;
  selectedImageName.value = name;
  showImageModal.value = true;
};

const updateItemReference = async (item: any) => {
  if (!canEditReference.value) return;
  try {
    const { error } = await supabase.rpc('update_item_stamp_ref', {
      p_item_id: item.id,
      p_new_ref: item.stamp_ref
    });
    if (error) throw error;
    emit('itemUpdated');
  } catch (err) {
    console.error("Erro ao atualizar a referência via RPC:", err);
    alert("Ocorreu um erro ao tentar salvar a referência.");
    emit('itemUpdated');
  }
};

const isItemApprovedBySeller = (status: string) => status === 'approved_by_seller';
const isItemInProduction = (status: string) => ['production_queue', 'in_printing', 'in_cutting', 'completed'].includes(status);
const isReadyForProductionFlow = (item: any) => isItemApprovedBySeller(item.status) || isItemInProduction(item.status) || (item.status === 'design_pending' && ['Aprovado', 'Finalização'].includes(item.design_tag));

const toggleOpGenerated = async (item: any) => {
    const newValue = !item.is_op_generated;
    try {
        const { error } = await supabase.from('order_items').update({ is_op_generated: newValue }).eq('id', item.id);
        if (error) throw error;
        item.is_op_generated = newValue;
        emit('itemUpdated');
    } catch (err) {
        console.error("Erro ao atualizar a flag is_op_generated:", err);
        alert("Ocorreu um erro ao tentar salvar a liberação da OP.");
    }
};

const canBeReleased = computed(() => {
    if (!order.value || !order.value.order_items) return false;
    return order.value.order_items.every((item: any) => isItemApprovedBySeller(item.status));
});
</script>

<style scoped lang="scss">
.glassmorphism-card {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 35, 0.85) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.loading-container {
  min-height: 400px;
  width: 100%;
}

.header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 1rem;
}

.item-card {
  display: flex;
  gap: 1.5rem;
  background-color: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 1rem;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
  }
}

.item-card-image-wrapper {
  width: 160px;
  height: 160px;
  flex-shrink: 0;
}

.item-thumbnail {
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.item-card-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.actions-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
}

.status-chip {
  height: 28px !important;
}

.editable-field {
  :deep(.v-input__control) {
    padding: 0;
    height: 32px;
  }
  :deep(input) {
    font-size: 1.25rem !important; // text-h6
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
    &:not([readonly]):focus {
      background-color: rgba(255,255,255, 0.1);
      box-shadow: 0 0 0 2px rgba(var(--v-theme-primary-rgb), 0.5);
    }
  }
}
</style>
