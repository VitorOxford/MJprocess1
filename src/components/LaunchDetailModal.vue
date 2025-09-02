<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="900px" persistent>
    <v-card class="glassmorphism-card">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">Gerenciar Itens do Lançamento</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="$emit('close')"></v-btn>
      </v-toolbar>

      <v-card-text v-if="order">
        <h3 class="text-h6 mb-2">Cliente: {{ order.customer_name }}</h3>
        <p class="text-medium-emphasis mb-6">Vendedor: {{ order.created_by.full_name }}</p>

        <div v-for="item in order.order_items" :key="item.id" class="item-management-row">
          <v-img :src="item.stamp_image_url" class="item-thumbnail" cover>
             <template v-slot:placeholder>
                <div class="d-flex align-center justify-center fill-height">
                    <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
                </div>
            </template>
            <template v-slot:error>
              <div class="d-flex align-center justify-center fill-height" style="background-color: rgba(0,0,0,0.3);">
                <v-icon color="warning" size="32">mdi-image-off-outline</v-icon>
              </div>
            </template>
          </v-img>

          <div class="item-info">
            <div class="font-weight-bold">{{ item.stamp_ref }}</div>
            <div class="text-caption">{{ item.fabric_type }} - {{ item.quantity_meters }}m</div>
            <p v-if="item.notes" class="text-caption text-amber-lighten-2 mt-2 font-italic">
              <v-icon start size="x-small">mdi-comment-quote-outline</v-icon>
              {{ item.notes }}
            </p>
            <v-chip v-if="item.status === 'design_pending'" size="small" :color="tagColors[item.design_tag]" label class="mt-2">{{ item.design_tag }}</v-chip>
          </div>
          <v-spacer></v-spacer>

          <div class="item-actions d-flex align-center justify-end">

            <v-checkbox-btn
              v-if="isReadyForProductionFlow(item)"
              :model-value="item.is_op_generated"
              @update:model-value="() => toggleOpGenerated(item)"
              color="info"
              class="mr-2"
            >
              <template v-slot:label>
                <v-tooltip activator="parent" location="top">
                  Liberar Ordem de Produção (OP)
                </v-tooltip>
                <v-icon>mdi-file-pdf-box</v-icon>
              </template>
            </v-checkbox-btn>

            <div v-if="isItemInProduction(item.status)" class="d-flex align-center ga-2">
                <v-chip color="teal" variant="flat">
                  <v-icon start>mdi-send</v-icon>
                  Liberado
                </v-chip>
            </div>

            <div v-else-if="isItemApprovedBySeller(item.status)" class="d-flex align-center ga-2">
                <v-chip color="success" variant="flat">
                  <v-icon start>mdi-check</v-icon>
                  Aprovado
                </v-chip>
                <v-btn color="primary" variant="tonal" size="small" @click="emit('releaseItem', item)">
                    Liberar Item
                </v-btn>
            </div>

            <v-chip v-else-if="item.status === 'customer_approval'" color="orange" variant="tonal">
              <v-icon start>mdi-account-clock-outline</v-icon>
              Aguardando Vendedor
            </v-chip>

            <div v-else class="d-flex flex-column ga-2" style="min-width: 180px;">
              <v-btn
                v-if="item.design_tag === 'Aprovado' || item.design_tag === 'Finalização'"
                color="teal"
                @click="emit('releaseItem', item)"
              >
                <v-icon start>mdi-send</v-icon>
                Liberar p/ Produção
              </v-btn>
              <v-btn
                v-else
                color="primary"
                @click="emit('sendToSeller', item)"
              >
                Enviar para Aprovação
              </v-btn>
            </div>
            </div>
        </div>

        <div v-if="canBeReleased" class="text-center mt-8">
            <v-btn color="success" size="large" variant="flat" @click="emit('releaseToProduction', order)">
                <v-icon start>mdi-send-check-outline</v-icon>
                Liberar Lançamento Completo
            </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { supabase } from '@/api/supabase';

const props = defineProps({
  show: Boolean,
  order: Object as () => any | null,
});

const emit = defineEmits(['close', 'approve', 'sendToSeller', 'releaseToProduction', 'releaseItem', 'itemUpdated']);

const tagColors: Record<string, string> = {
  'Desenvolvimento': 'primary',
  'Alteração': 'warning',
  'Finalização': 'success',
  'Aprovado': 'green'
};

const isItemApprovedBySeller = (status: string) => {
    return status === 'approved_by_seller';
}

const isItemInProduction = (status: string) => {
    const productionStatuses = ['production_queue', 'in_printing', 'in_cutting', 'completed'];
    return productionStatuses.includes(status);
}

// ===== INÍCIO DA CORREÇÃO =====
const isReadyForProductionFlow = (item: any) => {
    // Se já foi aprovado pelo vendedor
    if (isItemApprovedBySeller(item.status)) return true;
    // Se já está na produção
    if (isItemInProduction(item.status)) return true;
    // Se o designer marcou como 'Aprovado' ou 'Finalização' para liberação direta
    if (item.status === 'design_pending' && (item.design_tag === 'Aprovado' || item.design_tag === 'Finalização')) return true;

    return false;
};
// ===== FIM DA CORREÇÃO =====

const toggleOpGenerated = async (item: any) => {
    const newValue = !item.is_op_generated;
    try {
        const { error } = await supabase
            .from('order_items')
            .update({ is_op_generated: newValue })
            .eq('id', item.id);
        if (error) throw error;
        item.is_op_generated = newValue;
        emit('itemUpdated');
    } catch (err) {
        console.error("Erro ao atualizar a flag is_op_generated:", err);
        alert("Ocorreu um erro ao tentar salvar a liberação da OP.");
    }
};

const canBeReleased = computed(() => {
    if (!props.order || !props.order.order_items) return false;
    return props.order.order_items.every((item: any) => isItemApprovedBySeller(item.status));
});

</script>

<style scoped lang="scss">
.glassmorphism-card {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
.item-management-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background-color: rgba(255,255,255,0.05);
  border-radius: 8px;
  margin-bottom: 12px;
}
.item-thumbnail {
  width: 70px;
  height: 70px;
  border-radius: 8px;
  flex-shrink: 0;
  border: 1px solid rgba(255,255,255,0.1);
}
.item-info {
  flex-grow: 1;
}
.item-actions {
  min-width: 220px;
  text-align: right;
  gap: 8px;
}
</style>
