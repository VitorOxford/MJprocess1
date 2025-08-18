<template>
  <v-container class="py-8">
    <v-card class="glassmorphism-card-order mx-auto" max-width="900">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">
          <v-icon start>mdi-plus-box-outline</v-icon>
          Lançar Novo Pedido de Produção
        </v-toolbar-title>
      </v-toolbar>

      <v-stepper v-model="step" :items="stepperItems" alt-labels class="stepper-transparent">
        <template v-slot:item.1>
          <v-card flat color="transparent">
            <v-card-text>
              <h3 class="text-h6 font-weight-bold mb-6 text-center">Informações do Cliente e Entrada</h3>
              <v-text-field
                v-model="order.customer_name"
                label="Nome do Cliente"
                variant="outlined"
                prepend-inner-icon="mdi-account-outline"
                :rules="[rules.required]"
                class="mb-4"
              ></v-text-field>

              <v-select
                v-model="order.has_down_payment"
                :items="[{title: 'Sim', value: true}, {title: 'Não', value: false}]"
                label="Houve Entrada?"
                variant="outlined"
                prepend-inner-icon="mdi-cash-multiple"
                class="mb-4"
              ></v-select>

              <v-file-input
                v-if="order.has_down_payment"
                v-model="order.down_payment_proof_file"
                label="Comprovante de Entrada"
                variant="outlined"
                prepend-icon="mdi-upload"
                :rules="[rules.requiredFile]"
                accept="image/*,.pdf"
              ></v-file-input>

            </v-card-text>
          </v-card>
        </template>

        <template v-slot:item.2>
          <v-card flat color="transparent">
            <v-card-text>
               <h3 class="text-h6 font-weight-bold mb-6 text-center">Detalhes da Estampa</h3>
               <v-textarea
                v-model="order.stamp_details"
                label="Observações e detalhes para o time de design"
                placeholder="Ex: Estampa de onça com fundo azul, logo da empresa no canto, etc."
                variant="outlined"
                rows="5"
                prepend-inner-icon="mdi-palette-swatch-outline"
                :rules="[rules.required]"
              ></v-textarea>
            </v-card-text>
          </v-card>
        </template>

        <template v-slot:item.3>
           <v-card flat color="transparent">
            <v-card-text>
              <h3 class="text-h6 font-weight-bold mb-6 text-center">Material e Quantidade</h3>
                <v-autocomplete
                    v-model="order.fabric_type"
                    :items="stockItems"
                    item-title="fabric_type"
                    item-value="fabric_type"
                    label="Base (Tecido)"
                    variant="outlined"
                    prepend-inner-icon="mdi-layers-triple-outline"
                    :loading="loadingStock"
                    class="mb-4"
                    :rules="[rules.required]"
                >
                    <template v-slot:item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="`Disponível: ${item.raw.available_meters}m`"></v-list-item>
                    </template>
              </v-autocomplete>

              <v-text-field
                v-model.number="order.quantity_meters"
                label="Metragem (metros)"
                type="number"
                variant="outlined"
                prepend-inner-icon="mdi-ruler-square"
                :rules="[rules.required, rules.positive]"
                :disabled="!order.fabric_type"
              ></v-text-field>

              <div v-if="selectedStockItem" class="mt-n2 mb-4 px-2">
                    <div class="d-flex justify-space-between text-caption text-grey">
                        <span v-if="order.quantity_meters > selectedStockItem.available_meters" class="text-error">
                            Atenção: Estoque ficará negativo!
                        </span>
                        <span v-else>Uso do estoque disponível:</span>
                        <span>{{ selectedStockItem.available_meters }}m</span>
                    </div>
                   <v-progress-linear
                        :model-value="(order.quantity_meters / selectedStockItem.available_meters) * 100"
                        :color="stockUsageColor"
                        height="6"
                        rounded
                   ></v-progress-linear>
                </div>
            </v-card-text>
          </v-card>
        </template>

        <template v-slot:actions>
            <div class="d-flex w-100 pa-4">
                <v-btn v-if="step > 1" @click="step--" variant="tonal">Voltar</v-btn>
                <v-spacer></v-spacer>
                <v-btn v-if="step < 3" @click="step++" :disabled="!isStepValid">Continuar</v-btn>
                <v-btn v-else @click="submitOrder" :loading="isSubmitting" :disabled="!isFormValid" color="primary" variant="flat">
                    <v-icon left>mdi-rocket-launch</v-icon>
                    Enviar para o Design
                </v-btn>
            </div>
        </template>
      </v-stepper>

       <v-alert v-if="feedback.message" :type="feedback.type" class="ma-4" closable @click:close="feedback.message = ''">
            {{ feedback.message }}
        </v-alert>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive, watch } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

type StockItem = {
  id: string;
  fabric_type: string;
  available_meters: number;
};

type Order = {
  customer_name: string;
  stamp_details: string;
  fabric_type: string | null;
  quantity_meters: number | null;
  has_down_payment: boolean;
  down_payment_proof_file: File[] | File | null;
};

type Feedback = {
    message: string;
    type: 'success' | 'error';
}

const userStore = useUserStore();
const step = ref(1);
const stockItems = ref<StockItem[]>([]);
const loadingStock = ref(true);
const isSubmitting = ref(false);

const order = reactive<Order>({
  customer_name: '',
  stamp_details: '',
  fabric_type: null,
  quantity_meters: null,
  has_down_payment: false,
  down_payment_proof_file: null,
});

const feedback = reactive<Feedback>({ message: '', type: 'success' });

const stepperItems = [
    { title: 'Cliente & Entrada', icon: 'mdi-account-cash' },
    { title: 'Estampa', icon: 'mdi-palette-swatch-outline' },
    { title: 'Material', icon: 'mdi-layers-triple-outline' },
];

const rules = {
  required: (v: any) => !!v || 'Campo obrigatório.',
  requiredFile: (v: File | File[] | null) => {
    if (!v) return 'Arquivo é obrigatório.';
    if (Array.isArray(v) && v.length === 0) return 'Arquivo é obrigatório.';
    return true;
  },
  positive: (v: number) => (v !== null && v > 0) || 'O valor deve ser maior que zero.',
};

const selectedStockItem = computed(() => {
  if (!order.fabric_type) return null;
  return stockItems.value.find(item => item.fabric_type === order.fabric_type) || null;
});

const isStepValid = computed(() => {
    switch (step.value) {
        case 1: {
            let fileIsValid = true;
            if (order.has_down_payment) {
                const file = order.down_payment_proof_file;
                if (!file) {
                    fileIsValid = false;
                } else if (Array.isArray(file) && file.length === 0) {
                    fileIsValid = false;
                }
            }
            return !!order.customer_name?.trim() && fileIsValid;
        }
        case 2: return !!order.stamp_details?.trim();
        case 3:
            const quantity = order.quantity_meters;
            return !!order.fabric_type && !!(quantity && quantity > 0);
        default: return true;
    }
});

const isFormValid = computed(() => {
    return isStepValid.value;
});

const stockUsageColor = computed(() => {
    if (!selectedStockItem.value || !order.quantity_meters) return 'primary';
    const available = selectedStockItem.value.available_meters;
    if (order.quantity_meters > available) return 'error';
    if (order.quantity_meters > available * 0.8) return 'warning';
    return 'primary';
});

const fetchStock = async () => {
  loadingStock.value = true;
  try {
    const { data, error } = await supabase.from('stock').select('*').order('fabric_type', { ascending: true });
    if (error) throw error;
    stockItems.value = data || [];
  } catch (error) {
    console.error('Erro ao buscar estoque:', error);
    showFeedback('Não foi possível carregar os materiais do estoque.', 'error');
  } finally {
    loadingStock.value = false;
  }
};

const showFeedback = (message: string, type: 'success' | 'error') => {
    feedback.message = message;
    feedback.type = type;
}

const submitOrder = async () => {
  if (!isFormValid.value || !userStore.profile) return;
  isSubmitting.value = true;
  let proofUrl: string | null = null;

  try {
    if (order.has_down_payment && order.down_payment_proof_file) {
      const fileToUpload = Array.isArray(order.down_payment_proof_file)
        ? order.down_payment_proof_file[0]
        : order.down_payment_proof_file;

      if (fileToUpload) {
        const fileName = `${Date.now()}-${fileToUpload.name.replace(/\s/g, '_')}`;
        const { data, error: uploadError } = await supabase.storage
          .from('proofs')
          .upload(fileName, fileToUpload);

        if (uploadError) throw uploadError;
        proofUrl = data.path;
      }
    }

    const { error: rpcError } = await supabase.rpc('create_order_and_update_stock', {
      p_customer_name: order.customer_name,
      p_quantity_meters: order.quantity_meters,
      p_details: {
        stamp_details: order.stamp_details,
        fabric_type: order.fabric_type,
      },
      p_store_id: userStore.profile.store_id,
      p_created_by: userStore.profile.id,
      p_value: 0,
      p_has_down_payment: order.has_down_payment,
      p_down_payment_proof_url: proofUrl,
    });
    if (rpcError) throw rpcError;

    // --- CORREÇÃO: Lógica de notificação movida para cá ---
    const { data: designers, error: designerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'designer');

    if (designerError) throw designerError;

    if (designers && designers.length > 0) {
      const notifications = designers.map(d => ({
        recipient_id: d.id,
        sender_id: userStore.profile?.id,
        content: `Novo pedido para design: ${order.customer_name}`,
        redirect_url: '/design'
      }));
      await supabase.from('notifications').insert(notifications);
    }
    // --- FIM DA CORREÇÃO ---

    showFeedback('Pedido enviado para o design com sucesso!', 'success');
    resetForm();
    await fetchStock();

  } catch (error: any) {
    console.error('Erro na transação do pedido:', error);
    showFeedback(`Erro: ${error.message}`, 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const resetForm = () => {
    Object.assign(order, {
        customer_name: '',
        stamp_details: '',
        fabric_type: null,
        quantity_meters: null,
        has_down_payment: false,
        down_payment_proof_file: null,
    });
    step.value = 1;
}

watch(() => order.fabric_type, () => {
    order.quantity_meters = null;
});

onMounted(() => {
  fetchStock();
});
</script>

<style scoped lang="scss">
.glassmorphism-card-order {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  background-color: rgba(25, 25, 30, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.stepper-transparent {
    background-color: transparent !important;
    box-shadow: none !important;

    :deep(.v-stepper-item__title) { color: rgba(255, 255, 255, 0.8) !important; }
    :deep(.v-stepper-item--selected .v-stepper-item__title) { color: white !important; }
    :deep(.v-sheet) { background-color: transparent !important; box-shadow: none !important; }
}
</style>
