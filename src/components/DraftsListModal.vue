<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="800px" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-file-document-multiple-outline</v-icon>
        <span class="headline">Rascunhos Salvos</span>
      </v-card-title>
      <v-card-text>
        <v-list lines="two" v-if="draftsWithStatus.length > 0">
          <v-list-item
            v-for="draft in draftsWithStatus"
            :key="draft.id"
            @click="$emit('load', draft.id)"
            class="mb-2"
            border
            rounded
          >
            <v-list-item-title class="font-weight-bold">{{ draft.name }}</v-list-item-title>
            <v-list-item-subtitle>
              Salvo em: {{ format(new Date(draft.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) }}
            </v-list-item-subtitle>

            <template v-slot:append>
                <v-chip
                    :color="draft.isLaunchable ? 'success' : 'warning'"
                    label
                    size="small"
                    class="mr-4"
                >
                    <v-icon start size="small">{{ draft.isLaunchable ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline' }}</v-icon>
                    {{ draft.isLaunchable ? 'Pronto para Lançar' : 'Estoque Pendente' }}
                </v-chip>
                <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" @click.stop="$emit('delete', draft.id)"></v-btn>
            </template>
          </v-list-item>
        </v-list>
        <div v-else class="text-center text-grey pa-8">
            <v-icon size="48" class="mb-2">mdi-file-hidden-outline</v-icon>
            <p>Nenhum rascunho encontrado.</p>
        </div>
      </v-card-text>
      <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" text @click="$emit('close')">Fechar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Type Definitions ---
interface Draft {
  id: number;
  name: string;
  createdAt: string;
  data: {
    orderItems: any[];
    // ... other data
  };
}

interface GestaoClickProduct {
    id: string;
    nome: string;
    estoque: number | string;
    // ... other properties
}

const props = defineProps<{
  show: boolean;
  drafts: Draft[];
  products: GestaoClickProduct[];
}>();

const emit = defineEmits(['close', 'load', 'delete']);

const checkStockForDraft = (draft: Draft): boolean => {
    if (!props.products || props.products.length === 0) return false;
    if (!draft.data.orderItems || draft.data.orderItems.length === 0) return true;

    const stockMap = new Map<string, number>();
    props.products.forEach(p => stockMap.set(p.nome, parseFloat(p.estoque as string) || 0));

    const requiredStock = new Map<string, number>();
    draft.data.orderItems.forEach(item => {
        if (item.fabric_type) {
            const currentRequired = requiredStock.get(item.fabric_type) || 0;
            requiredStock.set(item.fabric_type, currentRequired + (item.quantity || 0));
        }
    });

    for (const [fabric, required] of requiredStock.entries()) {
        const available = stockMap.get(fabric) || 0;
        if (required > available) {
            return false;
        }
    }

    return true;
};

const draftsWithStatus = computed(() => {
    return props.drafts.map(draft => ({
        ...draft,
        isLaunchable: checkStockForDraft(draft),
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});
</script>
