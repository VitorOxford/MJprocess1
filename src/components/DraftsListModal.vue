<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="800px" scrollable>
    <v-card class="glassmorphism-card-dialog">
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-file-document-multiple-outline</v-icon>
        <span class="headline">Rascunhos Salvos</span>
      </v-card-title>
      <v-card-text>
        <div v-if="!draftsWithStatus || draftsWithStatus.length === 0" class="text-center text-grey py-8">
            <v-icon size="48" class="mb-2">mdi-file-hidden-outline</v-icon>
            <p>Nenhum rascunho encontrado.</p>
        </div>
        <v-list v-else lines="two">
          <v-list-item
            v-for="draft in draftsWithStatus"
            :key="draft.id"
            @click="$emit('load', draft.originalDraft)"
            class="mb-2"
            border
            rounded
            style="cursor: pointer;"
          >
            <v-list-item-title class="font-weight-bold">
              #{{ String(draft.data.order_number).padStart(4, '0') }} - {{ draft.name }}
            </v-list-item-title>
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

// --- Type Definitions (CORRIGIDO) ---
interface Draft {
  id: string; // É um UUID (string)
  name: string;
  created_at: string; // Nome da coluna no banco de dados
  draft_data: {
    orderItems: any[];
  };
  reserved_order_number: number | null;
}

interface GestaoClickProduct {
    id: string;
    nome: string;
    estoque: number | string;
}

const props = defineProps<{
  show: boolean;
  drafts: Draft[];
  products: GestaoClickProduct[];
}>();

const emit = defineEmits(['close', 'load', 'delete']);

// CORRIGIDO: para usar draft.draft_data.orderItems
const checkStockForDraft = (draft: Draft): boolean => {
    if (!props.products || props.products.length === 0) return false;
    // Verifica a propriedade correta
    if (!draft.draft_data || !draft.draft_data.orderItems || draft.draft_data.orderItems.length === 0) return true;

    const stockMap = new Map<string, number>();
    props.products.forEach(p => stockMap.set(p.nome, parseFloat(p.estoque as string) || 0));

    const requiredStock = new Map<string, number>();
    // Itera sobre a propriedade correta
    draft.draft_data.orderItems.forEach(item => {
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

// CORRIGIDO: Mapeia os dados do rascunho para a estrutura que o template espera
const draftsWithStatus = computed(() => {
    if (!props.drafts) return [];

    return props.drafts.map(draft => {
        // Recriamos um objeto 'data' para compatibilidade com o template
        const compatibleData = {
            order_number: draft.reserved_order_number,
            orderItems: draft.draft_data?.orderItems || []
        };

        return {
            id: draft.id,
            name: draft.name,
            createdAt: draft.created_at, // Propriedade correta do DB
            data: compatibleData, // O template agora pode acessar 'draft.data.order_number'
            isLaunchable: checkStockForDraft(draft),
            originalDraft: draft // Passa o objeto original para o evento de 'load'
        };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
});
</script>

<style scoped>
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(40, 40, 45, 0.85) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
</style>
