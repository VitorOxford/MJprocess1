<template>
  <v-container class="py-8">
    <v-card class="glassmorphism-card-order mx-auto" max-width="1200">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">
          <v-icon start>mdi-plus-box-outline</v-icon>
          Lançar Novo Pedido
        </v-toolbar-title>
        <v-spacer></v-spacer>

        <div class="pa-2 text-right mr-4">
          <div class="text-caption text-grey d-flex align-center">
             <v-icon start small class="blinking-icon">mdi-truck-fast-outline</v-icon>
            Previsão de Entrega
          </div>
          <div class="text-h6 font-weight-bold">{{ forecastDeliveryDate }}</div>
        </div>
        <div class="pa-2 text-right">
          <div class="text-caption text-grey">Próximo Pedido</div>
          <div v-if="loadingNextOrderNumber" class="text-center">
            <v-progress-circular indeterminate size="20" width="2"></v-progress-circular>
          </div>
          <div v-else class="text-h6 font-weight-bold">#{{ String(nextOrderNumber).padStart(4, '0') }}</div>
        </div>
      </v-toolbar>

      <v-stepper v-if="!orderCreatedSuccess" v-model="step" :items="stepperItems" alt-labels class="stepper-transparent">
        <template v-slot:item.1>
          <v-card flat color="transparent" class="pa-md-4">
            <v-card-text>
              <h3 class="text-h6 font-weight-bold mb-6 text-center">Informações do Cliente</h3>
              <v-form ref="step1Form">
                <v-autocomplete
                  v-model="orderHeader.customer_id"
                  v-model:search="clientSearch"
                  :items="clientList"
                  item-title="nome"
                  item-value="id"
                  label="Cliente"
                  variant="outlined"
                  prepend-inner-icon="mdi-account-search-outline"
                  :rules="[rules.required]"
                  class="mb-4"
                  placeholder="Digite para buscar ou cadastre um novo cliente"
                  :loading="isSearchingClients"
                  no-filter
                >
                  <template v-slot:append>
                    <v-tooltip text="Cadastrar Novo Cliente" location="top">
                      <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" icon="mdi-account-plus-outline" variant="text" @click="showClientModal = true"></v-btn>
                      </template>
                    </v-tooltip>
                  </template>
                  <template v-slot:no-data>
                    <v-list-item
                      title="Nenhum cliente encontrado."
                      subtitle="Clique no '+' para cadastrar um novo."
                    ></v-list-item>
                  </template>
                </v-autocomplete>

                <v-text-field
                  :model-value="userStore.profile?.full_name"
                  label="Vendedor"
                  variant="outlined"
                  prepend-inner-icon="mdi-account-tie-outline"
                  readonly
                  class="mb-4"
                ></v-text-field>
              </v-form>
            </v-card-text>
          </v-card>
        </template>

        <template v-slot:item.2>
           <v-card flat color="transparent">
            <v-card-text>
              <h3 class="text-h6 font-weight-bold mb-4 text-center">Itens do Pedido</h3>
              <v-row>
                <v-col cols="12" md="5">
                  <v-card class="item-list-card" variant="outlined">
                    <v-list class="bg-transparent">
                      <v-list-subheader>
                        ITENS ADICIONADOS (Total: {{ formatCurrency(totalOrderValue) }})
                      </v-list-subheader>
                      <div v-if="orderItems.length === 0" class="text-center text-grey pa-4">Nenhum item adicionado.</div>
                      <v-list-item
                        v-for="(item, index) in orderItems"
                        :key="index"
                        :active="editedItemIndex === index"
                        @click="editItem(index)"
                      >
                        <template #prepend>
                          <v-img
                            v-if="item.stamp_image_url"
                            :src="item.stamp_image_url"
                            width="40"
                            height="40"
                            cover
                            class="rounded mr-4"
                          >
                            <template v-slot:placeholder>
                              <div class="d-flex align-center justify-center fill-height">
                                <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
                              </div>
                            </template>
                          </v-img>
                          <v-icon v-else class="mr-4" size="40" color="grey-darken-1">mdi-image-multiple-outline</v-icon>
                        </template>
                        <v-list-item-title class="font-weight-bold d-flex align-center">
                          {{ item.stamp_ref || 'Novo Item' }}
                          <v-chip
                            v-if="item.design_tag"
                            :color="tagColorMap[item.design_tag]"
                            size="x-small"
                            class="ml-2"
                            label
                          >
                            {{ item.design_tag }}
                          </v-chip>
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          {{ item.fabric_type || 'Sem tecido' }} -
                          <span v-if="item.unit_of_measure === 'kg'">~{{ item.quantity_meters?.toFixed(2) || 0 }}m</span>
                          <span v-else>{{ item.quantity || 0 }}m</span>
                          ({{ item.quantity || 0 }}{{ item.unit_of_measure }}) -
                          {{ formatCurrency(item.valor_unitario) }}
                        </v-list-item-subtitle>
                        <template v-slot:append>
                          <v-btn icon="mdi-delete-outline" variant="text" size="small" color="error" @click.stop="removeItem(index)"></v-btn>
                        </template>
                      </v-list-item>
                    </v-list>
                    <v-divider></v-divider>
                    <v-card-actions>
                      <v-btn block variant="tonal" @click="prepareNewItem">
                        <v-icon start>mdi-plus</v-icon> Adicionar Novo Item
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>

                <v-col cols="12" md="7">
                  <v-card class="item-form-card" variant="flat">
                    <v-card-title>{{ isEditing ? 'Editando Item' : 'Adicionando Novo Item' }}</v-card-title>
                    <v-card-text>
                      <v-form ref="itemForm">
                        <v-row>
                          <v-col cols="12" sm="6">
                            <v-autocomplete
                              v-model="editedItem.fabric_type"
                              :items="gestaoClickProducts"
                              item-title="nome"
                              item-value="nome"
                              label="Produto (Base)"
                              variant="outlined"
                              density="compact"
                              :loading="loadingGestaoClickProducts"
                              :rules="[rules.required]"
                            >
                              <template v-slot:item="{ props, item }">
                                <v-list-item v-bind="props" :subtitle="`Estoque: ${item.raw.estoque}${(item.raw.unidade || '').toLowerCase()}`"></v-list-item>
                              </template>
                            </v-autocomplete>
                          </v-col>
                          <v-col cols="12" sm="6">
                            <v-autocomplete
                              v-if="!isUploadingNewStamp"
                              v-model="editedItem.stamp_ref_id"
                              :items="gestaoClickServices"
                              item-title="nome"
                              item-value="id"
                              label="Serviço (Estampa)"
                              variant="outlined"
                              density="compact"
                              :rules="[rules.required]"
                              :loading="loadingGestaoClickServices"
                              :custom-filter="(itemTitle, queryText, item) =>
                                item.title.toLowerCase().includes(queryText.toLowerCase()) ||
                                item.value.toString().includes(queryText)"
                            >
                               <template v-slot:item="{ props, item }">
                                <v-list-item v-bind="props" :prepend-avatar="item.raw.imagem_url" :subtitle="`ID: ${item.raw.id}`"></v-list-item>
                              </template>
                            </v-autocomplete>
                             <v-text-field
                                v-else
                                v-model="editedItem.stamp_ref"
                                label="Nome/Referência da Nova Estampa"
                                variant="outlined"
                                density="compact"
                                :rules="[rules.required]"
                              ></v-text-field>
                          </v-col>

                          <v-col cols="12" class="text-center">
                            <v-file-input
                                v-if="isUploadingNewStamp"
                                @change="handleNewStampFileChange"
                                label="Arquivo da Imagem (.png, .jpg)"
                                variant="outlined"
                                accept="image/png, image/jpeg"
                                :rules="[rules.fileRequired]"
                                density="compact"
                              ></v-file-input>
                            <v-img
                              v-if="editedItem.stamp_image_url"
                              :src="editedItem.stamp_image_url"
                              max-height="150"
                              contain
                              class="rounded border"
                            ></v-img>
                             <div v-else-if="!isUploadingNewStamp" class="d-flex align-center justify-center text-grey-lighten-1" style="height: 150px; border: 2px dashed #444; border-radius: 4px;">
                              Selecione uma estampa para visualizar
                            </div>
                             <v-btn
                                variant="text"
                                @click="toggleStampUpload"
                                class="mt-2"
                              >
                                {{ isUploadingNewStamp ? 'Cancelar e Buscar Existente' : 'Não encontrou? Cadastre uma nova estampa' }}
                              </v-btn>
                          </v-col>

                          <v-col cols="12">
                            <v-text-field
                                v-if="selectedProductUnit !== 'kg'"
                                v-model.number="editedItem.quantity"
                                label="Quantidade (m)"
                                type="number"
                                variant="outlined"
                                density="compact"
                                :rules="[rules.required, rules.positive]"
                                :disabled="!editedItem.fabric_type"
                            ></v-text-field>
                            <v-row v-else>
                                <v-col cols="6">
                                    <v-text-field
                                        v-model.number="editedItem.quantity"
                                        label="Quantidade (kg)"
                                        type="number"
                                        variant="outlined"
                                        density="compact"
                                        :rules="[rules.required, rules.positive]"
                                        :disabled="!editedItem.fabric_type"
                                    ></v-text-field>
                                </v-col>
                                <v-col cols="6">
                                     <v-text-field
                                        v-model.number="tempMeters"
                                        label="Converter de Metros (m)"
                                        type="number"
                                        variant="outlined"
                                        density="compact"
                                        :disabled="!editedItem.fabric_type || !selectedProductRendimento"
                                        hint="Preencha para calcular o KG"
                                        persistent-hint
                                    ></v-text-field>
                                </v-col>
                            </v-row>


                            <div v-if="selectedProductStock !== null" class="mt-n2 mb-4 px-2">
                              <div class="d-flex justify-space-between text-caption text-grey">
                                <span v-if="editedItem.quantity > selectedProductStock" class="text-error">
                                  Atenção: Estoque ficará negativo!
                                </span>
                                <span v-else>Uso do estoque disponível:</span>
                                <span>{{ selectedProductStock.toLocaleString('pt-BR') }}{{ selectedProductUnit }}</span>
                              </div>
                              <v-progress-linear
                                :model-value="((editedItem.quantity || 0) / selectedProductStock) * 100"
                                :color="getStockUsageColor(editedItem.quantity)"
                                height="6"
                                rounded
                              ></v-progress-linear>
                            </div>
                          </v-col>

                           <v-col cols="12">
                            <v-checkbox v-model="overridePrice" label="Alterar valor unitário"></v-checkbox>
                            <v-text-field
                              v-model.number="editedItem.valor_unitario"
                              label="Valor Unitário"
                              type="number"
                              variant="outlined"
                              density="compact"
                              :readonly="!overridePrice"
                            ></v-text-field>
                          </v-col>

                          <v-col cols="12">
                            <v-textarea
                              v-model="editedItem.notes"
                              label="Observações para este item"
                              variant="outlined"
                              rows="2"
                              density="compact"
                            ></v-textarea>
                          </v-col>
                          <v-col cols="12">
                            <label class="v-label text-caption mb-2 d-block">Destino no Design</label>
                            <div class="d-flex ga-2 flex-wrap">
                              <v-btn
                                v-for="tag in (Object.keys(tagColorMap) as Array<keyof typeof tagColorMap>)"
                                :key="tag"
                                :color="tagColorMap[tag]"
                                :variant="editedItem.design_tag === tag ? 'flat' : 'outlined'"
                                size="small"
                                @click="editedItem.design_tag = tag"
                              >
                                {{ tag }}
                              </v-btn>
                            </div>
                          </v-col>
                        </v-row>
                      </v-form>
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn color="primary" variant="flat" @click="saveOrUpdateItem" :disabled="!isItemFormValid">
                        <v-icon start>{{ isEditing ? 'mdi-content-save' : 'mdi-plus' }}</v-icon>
                        {{ isEditing ? 'Atualizar Item' : 'Adicionar à Lista' }}
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </template>

        <template v-slot:item.3>
           <v-card flat color="transparent" class="pa-md-4">
            <v-card-text>
              <h3 class="text-h6 font-weight-bold mb-6 text-center">Pagamento e Finalização</h3>
              <v-form ref="step3Form">
                 <v-textarea
                  v-model="orderHeader.observation"
                  label="Observações do Pedido"
                  variant="outlined"
                  rows="3"
                  class="mb-4"
                ></v-textarea>
                <v-radio-group v-model="paymentDetails.type" inline class="mb-4">
                  <v-radio label="À vista" value="vista"></v-radio>
                  <v-radio label="Parcelado" value="parcelado"></v-radio>
                </v-radio-group>

                <v-expand-transition>
                  <div v-if="paymentDetails.type === 'parcelado'">
                    <v-row>
                      <v-col cols="12" sm="6">
                        <v-autocomplete
                          v-model="paymentDetails.installment_payment_method_id"
                          :items="paymentMethods"
                          item-title="nome"
                          item-value="id"
                          label="Forma de Pagamento"
                          variant="outlined"
                        ></v-autocomplete>
                      </v-col>
                      <v-col cols="12" sm="6">
                        <v-text-field
                          v-model.number="paymentDetails.installments_count"
                          label="Qtd. parcelas"
                          type="number"
                          variant="outlined"
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" sm="6">
                        <v-select
                          v-model.number="paymentDetails.installments_interval"
                          :items="[3, 30, 60, 90]"
                          label="Intervalo entre parcelas (dias)"
                          variant="outlined"
                        ></v-select>
                      </v-col>
                      <v-col cols="12" sm="6">
                        <v-text-field
                          v-model="paymentDetails.first_due_date"
                          label="Data 1ª parcela"
                          type="date"
                          variant="outlined"
                        ></v-text-field>
                      </v-col>
                    </v-row>
                    <v-btn color="secondary" block @click="generateInstallments" class="mb-4">
                      <v-icon start>mdi-cogs</v-icon>
                      Gerar Parcelas
                    </v-btn>
                  </div>
                </v-expand-transition>

                <v-table class="bg-transparent mb-6">
                  <thead>
                    <tr>
                      <th class="text-left">Vencimento</th>
                      <th class="text-left">Valor</th>
                      <th class="text-left">Forma de Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(installment, index) in paymentDetails.installments" :key="index">
                      <td>
                        <v-text-field
                          v-model="installment.due_date"
                          type="date"
                          variant="underlined"
                          density="compact"
                          hide-details
                        ></v-text-field>
                      </td>
                      <td>
                        <v-text-field
                          v-model.number="installment.value"
                          @update:model-value="(val) => handleInstallmentValueChange(index, val)"
                          type="number"
                          variant="underlined"
                          density="compact"
                          hide-details
                          prefix="R$"
                        ></v-text-field>
                      </td>
                      <td>
                        <v-autocomplete
                          v-model="installment.payment_method_id"
                          :items="paymentMethods"
                          item-title="nome"
                          item-value="id"
                          variant="underlined"
                          density="compact"
                          hide-details
                        ></v-autocomplete>
                      </td>
                    </tr>
                  </tbody>
                </v-table>

                <v-switch
                  v-model="orderHeader.has_down_payment"
                  label="Houve pagamento de entrada (sinal)?"
                  color="primary"
                  inset
                  class="mt-4"
                ></v-switch>

                <v-file-input
                  v-if="orderHeader.has_down_payment"
                  v-model="orderHeader.down_payment_proof_file"
                  @change="handleProofFileChange"
                  label="Comprovante de Entrada (Máx 5MB)"
                  variant="outlined"
                  prepend-icon="mdi-upload"
                  accept="image/*,.pdf"
                  class="mt-4"
                  :rules="[rules.required, rules.fileSize]"
                ></v-file-input>
              </v-form>
            </v-card-text>
          </v-card>
        </template>

        <template v-slot:actions>
          <div class="d-flex w-100 pa-4">
            <v-btn v-if="step > 1" @click="step--" variant="tonal">Voltar</v-btn>
            <v-spacer></v-spacer>

            <v-btn
              v-if="step === 2"
              @click="downloadPDF"
              color="secondary"
              variant="tonal"
              class="mr-2"
            >
              <v-icon start>mdi-download</v-icon>
              Baixar Resumo
            </v-btn>

            <v-btn v-if="step < 3" @click="nextStep" :disabled="!isStepValid">Continuar</v-btn>
            <v-btn v-else @click="submitLaunch" :loading="isSubmitting" :disabled="!isStepValid" color="primary" variant="flat">
              <v-icon left>mdi-rocket-launch</v-icon>
              Enviar Lançamento
            </v-btn>
          </div>
        </template>
      </v-stepper>

      <div v-else class="pa-8 text-center">
        <v-icon size="80" color="success" class="mb-4">mdi-check-circle-outline</v-icon>
        <h2 class="text-h5 font-weight-bold">Pedido #{{ String(createdOrderNumber).padStart(4, '0') }} criado com sucesso!</h2>
        <p class="mt-2 text-medium-emphasis">O pedido foi enviado para a equipe de design e para o sistema de gestão.</p>
        <div class="mt-8 d-flex flex-wrap justify-center ga-4">
          <v-btn
            color="primary"
            size="large"
            variant="flat"
            @click="generateQuoteAndUploadPdf"
            :loading="isGeneratingPdf"
          >
            <v-icon left>mdi-file-pdf-box</v-icon>
            Baixar Orçamento
          </v-btn>
           <v-btn
            v-if="orderHeader.has_down_payment"
            color="secondary"
            size="large"
            variant="outlined"
            @click="generateStandaloneReceiptPdf"
            :loading="isGeneratingPdf"
          >
            <v-icon left>mdi-receipt-text-outline</v-icon>
            Baixar Recibo de Sinal
          </v-btn>
          <v-btn
            size="large"
            variant="tonal"
            @click="resetForm"
          >
            Lançar Novo Pedido
          </v-btn>
        </div>
      </div>

      <v-alert v-if="feedback.message" :type="feedback.type" class="ma-4" closable @click:close="feedback.message = ''">
        {{ feedback.message }}
      </v-alert>
    </v-card>

    <ClientFormModal
      :show="showClientModal"
      @close="showClientModal = false"
      @client-created="handleClientCreated"
    />

    <v-dialog v-model="showStockWarningModal" max-width="500px" persistent>
        <v-card class="stock-alert-card" prepend-icon="mdi-alert-decagram-outline">
            <template #title>
            <span class="font-weight-bold text-h5">Estoque Insuficiente!</span>
            </template>
            <v-card-text class="py-4 text-body-1">
            <p>Não é possível adicionar o item <strong>{{ stockWarningDetails.fabric }}</strong> ao pedido.</p>
            <p class="mt-2">A quantidade necessária (<strong>{{ stockWarningDetails.needed.toLocaleString('pt-BR') }}{{ stockWarningDetails.unit }}</strong>) é maior que o estoque disponível (<strong>{{ stockWarningDetails.available.toLocaleString('pt-BR') }}{{ stockWarningDetails.unit }}</strong>).</p>

            <v-alert
                border="start"
                border-color="white"
                elevation="0"
                class="mt-4 pa-3"
                color="rgba(255,255,255,0.1)"
            >
                <strong class="text-white">Ação necessária:</strong> Favor avisar o gerente sobre a necessidade de reposição deste material para liberar o pedido.
            </v-alert>

            </v-card-text>
            <v-card-actions class="pa-4">
            <v-spacer></v-spacer>
            <v-btn
                color="white"
                variant="outlined"
                @click="showStockWarningModal = false"
                block
                size="large"
            >
                Entendido
            </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive, nextTick, toRaw, watch } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { useAppStore } from '@/stores/app';
import type { VForm } from 'vuetify/components';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ClientFormModal from '@/components/ClientFormModal.vue';
import { gestaoApi } from '@/api/gestaoClick';
import QRCode from 'qrcode';

// --- Type Definitions ---
type OrderHeader = {
    customer_id: number | null;
    customer_name: string;
    has_down_payment: boolean;
    down_payment_proof_file: File | null;
    observation?: string;
};
type OrderItem = {
  fabric_type: string | null;
  stamp_ref_id: string | null;
  stamp_ref: string;
  quantity: number | null;
  quantity_meters: number | null;
  unit_of_measure: 'm' | 'kg';
  rendimento: number | null;
  valor_unitario: number | null;
  stamp_image_url: string | null;
  notes: string;
  design_tag: 'Desenvolvimento' | 'Alteração' | 'Finalização' | 'Aprovado';
  new_stamp_file?: File | null;
  has_insufficient_stock: boolean;
  status: 'design_pending' | 'pending_stock';
  total_value_items?: number;
};
type StampLibraryItem = {
    id: number;
    gestao_click_service_id: string;
    name: string;
    image_url: string;
    is_approved_for_sale: boolean;
};
type StockItem = {
  id: string;
  gestao_click_id: string;
  fabric_type: string;
  available_meters: number;
  low_stock_threshold: number | null;
  unit_of_measure: 'metro' | 'kg';
  rendimento: number | null;
};
type Feedback = { message: string; type: 'success' | 'error'; }
type Client = { id: number; nome: string; cpf_cnpj?: string; tipo_pessoa?: 'PF' | 'PJ' }
type GestaoClickProduct = { id: string; nome: string; estoque: number | string; valor_venda: string; unidade: string | null; rendimento?: string | null; };
type GestaoClickService = { id: string; nome: string; valor_venda: string; imagem_url?: string; };
type SaleStatus = { id: number; nome: string; };
type PaymentMethod = { id: string; nome: string; };

interface Installment {
  due_date: string;
  value: number;
  payment_method_id: number | null;
}

// --- Component State ---
const userStore = useUserStore();
const appStore = useAppStore();
const step = ref(1);
const isSubmitting = ref(false);
const step1Form = ref<VForm | null>(null);
const step3Form = ref<VForm | null>(null);
const itemForm = ref<VForm | null>(null);
const stepperItems = [
  { title: 'Cliente', icon: 'mdi-account' },
  { title: 'Itens do Pedido', icon: 'mdi-format-list-bulleted-square' },
  { title: 'Pagamento', icon: 'mdi-cash-multiple' }
];
const nextOrderNumber = ref<number | null>(null);
const loadingNextOrderNumber = ref(true);
const orderCreatedSuccess = ref(false);
const createdOrderId = ref<string | null>(null);
const createdOrderNumber = ref<number | null>(null);
const isGeneratingPdf = ref(false);
const overridePrice = ref(false);
const tempMeters = ref<number | null>(null);

// ===== NOVOS ESTADOS PARA O MODAL DE AVISO =====
const showStockWarningModal = ref(false);
const stockWarningDetails = reactive({ fabric: '', needed: 0, available: 0, unit: 'm' });
// ===============================================

const paymentMethods = ref<PaymentMethod[]>([]);
const paymentDetails = reactive({
  type: 'vista' as 'vista' | 'parcelado',
  installments: [] as Installment[],
  installment_payment_method_id: null as number | null,
  installments_count: 1,
  installments_interval: 30,
  first_due_date: format(new Date(), 'yyyy-MM-dd'),
});


// --- Client Management State ---
const showClientModal = ref(false);
const clientList = ref<Client[]>([]);
const clientSearch = ref('');
const isSearchingClients = ref(false);
let searchTimeout: NodeJS.Timeout;

// --- Gestao Click, Stock & Stamp Library Data State ---
const gestaoClickProducts = ref<GestaoClickProduct[]>([]);
const stockItems = ref<StockItem[]>([]);
const loadingGestaoClickProducts = ref(true);
const gestaoClickServices = ref<GestaoClickService[]>([]);
const loadingGestaoClickServices = ref(true);
const saleStatuses = ref<SaleStatus[]>([]);
const stampLibrary = ref<StampLibraryItem[]>([]);
const isUploadingNewStamp = ref(false);

const tagColorMap = {
  'Desenvolvimento': '#40c4ff',
  'Alteração': '#ffab40',
  'Finalização': '#26A69A',
  'Aprovado': '#4CAF50'
};

const orderHeader = reactive<OrderHeader>({
    customer_id: null,
    customer_name: '',
    has_down_payment: false,
    down_payment_proof_file: null,
});

const createNewItem = (): OrderItem => ({
  fabric_type: null, stamp_ref_id: null, stamp_ref: '', quantity: null, quantity_meters: null,
  unit_of_measure: 'm', rendimento: null, valor_unitario: null, stamp_image_url: null,
  notes: '', design_tag: 'Desenvolvimento', new_stamp_file: null, has_insufficient_stock: false, status: 'design_pending',
});

const orderItems = ref<OrderItem[]>([]);
const editedItem = ref<OrderItem>(createNewItem());
const editedItemIndex = ref<number | null>(null);
const isEditing = computed(() => editedItemIndex.value !== null);

const feedback = reactive<Feedback>({ message: '', type: 'success' });

// --- Funções Auxiliares de Data ---
const addBusinessDays = (startDate: Date, days: number): Date => {
  const newDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < days) {
    newDate.setDate(newDate.getDate() + 1);
    if (newDate.getDay() !== 0) { // Domingo = 0
      addedDays++;
    }
  }
  return newDate;
};

const getNextDeliveryDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + 1);
  while (true) {
    const dayOfWeek = newDate.getDay();
    if ([2, 4, 6].includes(dayOfWeek)) { // Ter, Qui, Sáb
      return newDate;
    }
    newDate.setDate(newDate.getDate() + 1);
  }
};

// --- Validation and Computed Properties ---
const rules = {
  required: (v: any) => !!v || 'Campo obrigatório.',
  positive: (v: number | null) => (v != null && v > 0) || 'O valor deve ser maior que zero.',
  fileRequired: (v: any) => !!v || 'É obrigatório selecionar um arquivo.',
  fileSize: (v: File[] | null) => !v || v.length === 0 || !v[0] || v[0].size < 5000000 || 'O arquivo não pode exceder 5 MB!',
};

const forecastDeliveryDate = computed(() => {
    const hasStockIssues = orderItems.value.some(item => item.has_insufficient_stock);
    if (hasStockIssues) {
        return 'Indisponível (Falta de estoque)';
    }

    const today = new Date();
    const startProductionDate = addDays(today, 1);
    const completionDate = addBusinessDays(startProductionDate, 2);
    const deliveryDate = getNextDeliveryDay(completionDate);
    return format(deliveryDate, "EEEE, dd/MM", { locale: ptBR });
});

const totalOrderValue = computed(() => {
  return orderItems.value.reduce((total, item) => total + (item.quantity || 0) * (item.valor_unitario || 0), 0);
});

watch(totalOrderValue, (newValue) => {
    if (paymentDetails.type === 'vista' && paymentDetails.installments.length > 0) {
        paymentDetails.installments[0].value = newValue;
    }
});

watch(() => paymentDetails.type, (newType) => {
  generateInstallments();
});

const selectedProduct = computed(() => {
    if (!editedItem.value.fabric_type) return null;
    const product = stockItems.value.find(p => p.fabric_type === editedItem.value.fabric_type);
    return product || gestaoClickProducts.value.find(p => p.nome === editedItem.value.fabric_type);
});
const selectedProductUnit = computed(() => {
    if (!selectedProduct.value) return 'm';
    const unit = (selectedProduct.value as StockItem)?.unit_of_measure || (selectedProduct.value as GestaoClickProduct)?.unidade;
    return (unit || 'm').toLowerCase();
});
const selectedProductRendimento = computed(() => {
    if (!selectedProduct.value) return null;
    return (selectedProduct.value as StockItem).rendimento || parseFloat((selectedProduct.value as GestaoClickProduct).rendimento || '0');
});

// ===== INÍCIO DA CORREÇÃO (BUG do NaN) =====
const selectedProductStock = computed(() => {
    // Pega o nome do produto que está sendo editado.
    const productName = editedItem.value.fabric_type;
    if (!productName) return null;

    // Encontra o produto correspondente na MESMA lista que popula o dropdown.
    const product = gestaoClickProducts.value.find(p => p.nome === productName);
    if (!product || product.estoque === undefined) {
        // Se não encontrar ou não tiver a propriedade de estoque, assume 0.
        return 0;
    }

    // Extrai o valor do estoque da fonte de dados correta e atualizada.
    const stockValue = parseFloat(product.estoque as string);

    // Garante que, se o valor não for um número (NaN), ele retorne 0 para evitar bugs.
    return isNaN(stockValue) ? 0 : stockValue;
});
// ===== FIM DA CORREÇÃO =====

const estimatedMeters = computed(() => {
    if (selectedProductUnit.value !== 'kg' || !selectedProductRendimento.value || !editedItem.value.quantity) return null;
    return editedItem.value.quantity * selectedProductRendimento.value;
});
watch(() => editedItem.value.stamp_ref_id, (serviceId) => {
    if (isUploadingNewStamp.value) return;
    if (!serviceId) {
        editedItem.value.stamp_ref = '';
        editedItem.value.stamp_image_url = null;
        return;
    }
    const service = gestaoClickServices.value.find(s => s.id === serviceId);
    if (service) {
        editedItem.value.stamp_ref = service.nome;
    }
    const stamp = stampLibrary.value.find(s => s.gestao_click_service_id === serviceId);
    editedItem.value.stamp_image_url = stamp ? stamp.image_url : null;
});
watch(() => editedItem.value.fabric_type, (productName) => {
    const product = gestaoClickProducts.value.find(p => p.nome === productName);
    if (product) {
        if (!overridePrice.value) {
            editedItem.value.valor_unitario = parseFloat(product.valor_venda) || 0;
        }
        const stockItem = stockItems.value.find(s => s.gestao_click_id === product.id);
        if (stockItem) {
            editedItem.value.unit_of_measure = stockItem.unit_of_measure === 'kg' ? 'kg' : 'm';
            editedItem.value.rendimento = stockItem.rendimento;
        } else {
            editedItem.value.unit_of_measure = (product.unidade || 'm').toLowerCase() === 'kg' ? 'kg' : 'm';
            editedItem.value.rendimento = parseFloat(product.rendimento || '0');
        }
    } else {
        editedItem.value.valor_unitario = null;
    }
});
watch(tempMeters, (newVal) => {
  if (selectedProductUnit.value === 'kg' && selectedProductRendimento.value && newVal) {
    editedItem.value.quantity = parseFloat((newVal / selectedProductRendimento.value).toFixed(2));
  }
});

watch(() => editedItem.value.quantity, (newVal) => {
  if (selectedProductUnit.value === 'kg' && selectedProductRendimento.value && newVal) {
    // Se a unidade for KG, calcula os metros a partir do KG.
    editedItem.value.quantity_meters = parseFloat((newVal * selectedProductRendimento.value).toFixed(2));
  } else if (selectedProductUnit.value !== 'kg') {
    // Apenas se a unidade NÃO for KG (ou seja, for 'metro'),
    // iguala os dois campos.
    editedItem.value.quantity_meters = newVal;
  }
});
const getStockUsageColor = (quantity: number | null) => {
  if (selectedProductStock.value === null || !quantity) return 'primary';
  if (quantity > selectedProductStock.value) return 'error';
  if (quantity > selectedProductStock.value * 0.8) return 'warning';
  return 'success';
}

const isStepValid = computed(() => {
  if (step.value === 1) {
    return !!orderHeader.customer_id;
  }
  if (step.value === 2) {
    return orderItems.value.length > 0;
  }
  if (step.value === 3) {
    if (orderHeader.has_down_payment && !orderHeader.down_payment_proof_file) return false;
    if (paymentDetails.installments.length === 0) return false;
    const totalInstallmentValue = paymentDetails.installments.reduce((sum, inst) => sum + (inst.value || 0), 0);
    if (Math.abs(totalInstallmentValue - totalOrderValue.value) > 0.01) return false;
    return paymentDetails.installments.every(inst => inst.due_date && inst.value > 0 && inst.payment_method_id);
  }
  return false;
});

const isItemFormValid = computed(() => {
    const commonValid = !!editedItem.value.fabric_type && !!editedItem.value.quantity && editedItem.value.quantity > 0;
    if (isUploadingNewStamp.value) {
        return commonValid && !!editedItem.value.stamp_ref && !!editedItem.value.new_stamp_file;
    }
    return commonValid && !!editedItem.value.stamp_ref_id;
});

// --- API Calls and Data Fetching ---
watch(clientSearch, (newValue) => {
    if (!newValue) { return; }
    isSearchingClients.value = true;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        clientList.value = await gestaoApi.buscarClientes(newValue);
        isSearchingClients.value = false;
    }, 500);
});

const fetchInitialData = async () => {
    console.log("--- INICIANDO BUSCA DE DADOS --- CORREÇÃO FINAL ---");
    loadingGestaoClickProducts.value = true;
    loadingGestaoClickServices.value = true;
    try {
        // --- 1. BUSCANDO TUDO DA FONTE CORRETA: A TABELA 'stock' ---
        console.log("Buscando produtos e preços DIRETAMENTE da tabela 'stock' onde 'verification' é true...");
        const { data: stockData, error: stockError } = await supabase
            .from('stock')
            .select('*') // Pega todas as colunas, incluindo 'base_price'
            .eq('verification', true);

        if (stockError) throw stockError;

        console.log("DADOS BRUTOS RECEBIDOS DA TABELA 'stock':", JSON.parse(JSON.stringify(stockData)));

        // --- 2. MAPEANDO OS DADOS DIRETAMENTE, SEM FRESCURA ---
        console.log("Mapeando os dados. 'valor_venda' virá da coluna 'base_price'.");

        const finalProducts = stockData.map(stockItem => {
            const unitPrice = stockItem.base_price;

            if (unitPrice === null || unitPrice === undefined) {
                console.error(`❌ ALERTA! Produto '${stockItem.fabric_type}' está sem valor na coluna 'base_price'.`);
            } else {
                console.log(`✅ Preço para '${stockItem.fabric_type}' encontrado na coluna 'base_price': R$ ${unitPrice}`);
            }

            return {
                id: stockItem.gestao_click_id,
                nome: stockItem.fabric_type,
                estoque: stockItem.available_meters,
                // AQUI ESTÁ A CORREÇÃO: Pegando o preço da coluna certa.
                valor_venda: String(unitPrice || '0'),
                unidade: stockItem.unit_of_measure,
                rendimento: String(stockItem.rendimento || '0')
            };
        });

        console.log("4. RESULTADO FINAL! Estes são os produtos que serão exibidos:", JSON.parse(JSON.stringify(finalProducts)));
        gestaoClickProducts.value = finalProducts;

        // O resto do código continua como estava...
        const [services, statuses, stamps, payMethods] = await Promise.all([
            gestaoApi.buscarServicos(),
            gestaoApi.getSituacoesVenda(),
            supabase.from('stamp_library').select('*').eq('is_approved_for_sale', true),
            gestaoApi.buscarFormasDePagamento(),
        ]);

        if (stamps.error) throw stamps.error;

        paymentMethods.value = payMethods;
        stampLibrary.value = stamps.data || [];

        const approvedStampServiceIds = new Set(stampLibrary.value.map(s => s.gestao_click_service_id));
        gestaoClickServices.value = services
            .filter(service => approvedStampServiceIds.has(service.id))
            .map(service => {
                const matchingStamp = stampLibrary.value.find(s => s.gestao_click_service_id === service.id);
                return { ...service, imagem_url: matchingStamp ? matchingStamp.image_url : undefined };
            });

        saleStatuses.value = statuses;
        console.log("--- BUSCA DE DADOS FINALIZADA ---");

    } catch (error) {
        showFeedback('Não foi possível carregar os dados iniciais.', 'error');
        console.error("ERRO CRÍTICO NA BUSCA DE DADOS INICIAIS:", error);
    } finally {
        loadingGestaoClickProducts.value = false;
        loadingGestaoClickServices.value = false;
    }
};

const handleClientCreated = (newClient: Client) => {
  clientList.value.unshift(newClient);
  orderHeader.customer_id = newClient.id;
  showClientModal.value = false;
  showFeedback(`Cliente "${newClient.nome}" cadastrado com sucesso!`, 'success');
};
const fetchNextOrderNumber = async () => {
    loadingNextOrderNumber.value = true;
    try {
        const { data, error } = await supabase.rpc('get_next_order_number');
        if (error) throw error;
        nextOrderNumber.value = data;
    } catch (e) {
        console.error("Erro ao buscar próximo número do pedido:", e);
        nextOrderNumber.value = 0;
    } finally {
        loadingNextOrderNumber.value = false;
    }
};
const uploadFile = async (file: File | Blob, bucket: string, path: string): Promise<string> => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

// --- Form and Stepper Logic ---
const handleProofFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    orderHeader.down_payment_proof_file = target.files[0];
  } else {
    orderHeader.down_payment_proof_file = null;
  }
};
const handleNewStampFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    editedItem.value.new_stamp_file = file;
    if (file) {
        editedItem.value.stamp_image_url = URL.createObjectURL(file);
    } else {
        editedItem.value.stamp_image_url = null;
    }
};
const toggleStampUpload = () => {
    isUploadingNewStamp.value = !isUploadingNewStamp.value;
    editedItem.value.stamp_ref_id = null;
    editedItem.value.stamp_ref = '';
    editedItem.value.stamp_image_url = null;
    editedItem.value.new_stamp_file = null;
};
const nextStep = async () => {
  let formToValidate: VForm | null = null;
  if (step.value === 1) formToValidate = step1Form.value;
  if (step.value === 3) formToValidate = step3Form.value;

  if (formToValidate) {
    const { valid } = await formToValidate.validate();
    if (valid && isStepValid.value) {
      if (step.value === 2) generateInstallments();
      step.value++;
    }
  } else if (isStepValid.value) {
    if (step.value === 2) generateInstallments();
    step.value++;
  }
};
const prepareNewItem = async () => {
  editedItem.value = createNewItem();
  editedItemIndex.value = null;
  isUploadingNewStamp.value = false;
  overridePrice.value = false;
  tempMeters.value = null;
  await nextTick();
  itemForm.value?.resetValidation();
};
const editItem = (index: number) => {
  editedItemIndex.value = index;
  const itemToEdit = structuredClone(toRaw(orderItems.value[index]));
  editedItem.value = itemToEdit;
  isUploadingNewStamp.value = false;
};
const removeItem = (index: number) => {
  orderItems.value.splice(index, 1);
  if (editedItemIndex.value === index) {
    prepareNewItem();
  } else if (editedItemIndex.value !== null && editedItemIndex.value > index) {
    editedItemIndex.value--;
  }
};

const saveOrUpdateItem = async () => {
  if (itemForm.value) {
    const { valid } = await itemForm.value.validate();
    if (!valid || !isItemFormValid.value) {
      showFeedback('Por favor, preencha todos os campos obrigatórios do item.', 'error');
      return;
    }
  }

  const availableStock = selectedProductStock.value;
  const requiredQuantity = editedItem.value.quantity || 0;

  if (availableStock === null || requiredQuantity > availableStock) {
    stockWarningDetails.fabric = editedItem.value.fabric_type || 'N/A';
    stockWarningDetails.needed = requiredQuantity;
    stockWarningDetails.available = availableStock || 0;
    stockWarningDetails.unit = selectedProductUnit.value;
    showStockWarningModal.value = true;
    return;
  }

  editedItem.value.has_insufficient_stock = false;
  editedItem.value.status = 'design_pending';

  const rawItem = toRaw(editedItem.value);
  if (isEditing.value && editedItemIndex.value !== null) {
    orderItems.value[editedItemIndex.value] = structuredClone(rawItem);
  } else {
    orderItems.value.push(structuredClone(rawItem));
  }
  await prepareNewItem();
};


const generateInstallments = () => {
  paymentDetails.installments = [];
  const total = totalOrderValue.value;
  if (total <= 0) return;

  if (paymentDetails.type === 'vista') {
    paymentDetails.installments.push({
      due_date: paymentDetails.first_due_date,
      value: total,
      payment_method_id: paymentDetails.installment_payment_method_id,
    });
    return;
  }

  const count = paymentDetails.installments_count;
  if (count <= 0) return;

  const valuePerInstallment = parseFloat((total / count).toFixed(2));
  let remainder = total - (valuePerInstallment * count);

  for (let i = 0; i < count; i++) {
    const dueDate = addDays(new Date(paymentDetails.first_due_date), i * paymentDetails.installments_interval);
    let value = valuePerInstallment;
    if (i === 0) {
        value = parseFloat((value + remainder).toFixed(2));
    }
    paymentDetails.installments.push({
      due_date: format(dueDate, 'yyyy-MM-dd'),
      value: value,
      payment_method_id: paymentDetails.installment_payment_method_id,
    });
  }
};

const handleInstallmentValueChange = (changedIndex: number, newValue: string | number) => {
    const numericValue = typeof newValue === 'string' ? parseFloat(newValue) : newValue;
    if (isNaN(numericValue) || paymentDetails.installments.length <= 1) return;

    const changedValue = numericValue;
    const total = totalOrderValue.value;

    let filledTotal = 0;
    paymentDetails.installments.forEach((inst, index) => {
        if (index !== changedIndex) {
            filledTotal += inst.value || 0;
        }
    });

    const remainingValue = total - changedValue;
    const remainingInstallments = paymentDetails.installments.length - 1;

    if (remainingInstallments > 0) {
        const valuePerInstallment = parseFloat((remainingValue / remainingInstallments).toFixed(2));
        let remainder = remainingValue - (valuePerInstallment * remainingInstallments);

        let firstUnchangedFound = false;
        paymentDetails.installments.forEach((inst, index) => {
            if (index !== changedIndex) {
                let newValue = valuePerInstallment;
                if (!firstUnchangedFound) {
                    newValue = parseFloat((newValue + remainder).toFixed(2));
                    firstUnchangedFound = true;
                }
                inst.value = newValue;
            }
        });
    }
};


// --- Submission and Reset Logic ---
const sanitizeName = (name: string) => name.replace(/\s/g, '_').replace(/[^\w.\-]/g, '');

const syncOrderWithGestaoClick = async (proofPublicUrl: string | null) => {
    if (!orderHeader.customer_id) throw new Error("ID do cliente não encontrado.");
    const situacao = saleStatuses.value.find(s => s.nome.toLowerCase() === 'em aberto') || saleStatuses.value[0];
    if (!situacao) throw new Error("Situação de venda 'em aberto' não encontrada.");

    let observations = orderHeader.observation || '';
    if (proofPublicUrl) {
        observations += `\n\nComprovante de entrada disponível em: ${proofPublicUrl}`;
    }

   const salePayload: any = {
    codigo: String(nextOrderNumber.value),
    tipo: "produto",
    data: new Date().toISOString().split('T')[0],
    cliente_id: String(orderHeader.customer_id),
    vendedor_id: String(userStore.profile?.gestao_click_id),
    situacao_id: String(situacao.id),
    condicao_pagamento: paymentDetails.type === 'vista' ? 'a_vista' : paymentDetails.type,
    observacoes: observations.trim(),
    produtos: orderItems.value.map(item => {
        const product = gestaoClickProducts.value.find(p => p.nome === item.fabric_type);
        if (!product) throw new Error(`Produto ${item.fabric_type} não encontrado no Gestão Click.`);
        return {
            produto: {
                produto_id: product.id,
                variacao_id: null,
                quantidade: String(item.quantity || 0),
                valor_venda: (item.valor_unitario || 0).toFixed(2),
                detalhes: item.notes || "",
                tipo_desconto: "R$",
                desconto_valor: "0.00",
                desconto_porcentagem: "0.00"
            }
        };
    }),
    servicos: orderItems.value.map(item => ({
        servico: {
            servico_id: item.stamp_ref_id!,
            nome_servico: item.stamp_ref,
            detalhes: `Estampa para o item ${item.fabric_type}`,
            quantidade: "1.00",
            valor_venda: (0.00).toFixed(2),
            tipo_desconto: "R$",
            desconto_valor: "0.00",
            desconto_porcentagem: "0.00"
        }
    })),
     pagamentos: paymentDetails.installments.map(inst => ({
        pagamento: {
            data_vencimento: inst.due_date,
            valor: inst.value.toFixed(2),
            forma_pagamento_id: String(inst.payment_method_id),
            plano_contas_id: "32651675",
            observacao: `Parcela referente ao pedido do cliente.`
        }
    }))
};
    if (!salePayload.vendedor_id) {
        throw new Error("ID do vendedor no Gestão Click não encontrado no perfil do usuário.");
    }

    console.log("Enviando este payload para a API:", JSON.stringify(salePayload, null, 2));

    await gestaoApi.cadastrarVenda(salePayload);

    for (const item of orderItems.value) {
        const product = gestaoClickProducts.value.find(p => p.nome === item.fabric_type);
        if (product) {
            const currentStock = parseFloat(product.estoque as string);
            const quantityUsed = item.quantity || 0;
            const newStock = currentStock - quantityUsed;
            await gestaoApi.atualizarEstoqueProduto(product.id, newStock);
            const stockItem = stockItems.value.find(s => s.gestao_click_id === product.id);
            if (stockItem) {
                const { error } = await supabase.rpc('increment', { table_name: 'stock', row_id: stockItem.id, x: -quantityUsed });
                if (error) console.error(`Falha ao debitar estoque de ${stockItem.fabric_type} no Supabase:`, error);
                if (stockItem.low_stock_threshold && newStock < stockItem.low_stock_threshold) {
                    appStore.triggerLowStockAlert(stockItem.fabric_type, newStock);
                }
            }
        }
    }
};

const submitLaunch = async () => {
  if (orderItems.value.length === 0) {
    showFeedback('Adicione pelo menos um item ao lançamento.', 'error');
    return;
  }
  isSubmitting.value = true;
  feedback.message = '';
  try {
    // Itera sobre os itens para lidar com o upload de novas estampas primeiro
    for (const item of orderItems.value) {
      if (item.new_stamp_file) {
        const newService = await gestaoApi.cadastrarServico(item.stamp_ref);
        const filePath = `${Date.now()}-${sanitizeName(item.new_stamp_file.name)}`;
        const imageUrl = await uploadFile(item.new_stamp_file, 'stamp-library', filePath);
        const { error: stampError } = await supabase.from('stamp_library').insert({
          gestao_click_service_id: newService.id, name: item.stamp_ref, image_url: imageUrl, is_approved_for_sale: false,
        });
        if (stampError) throw stampError;
        item.stamp_ref_id = newService.id;
        item.stamp_image_url = imageUrl;
      }
    }

    // --- INÍCIO DA CORREÇÃO ---
    // Verifica e encontra o próximo número de pedido vago antes de sincronizar
    let availableOrderNumber = nextOrderNumber.value;
    if (availableOrderNumber) {
      let isTaken = await gestaoApi.verificarVendaPorCodigo(availableOrderNumber);
      while (isTaken) {
        availableOrderNumber++;
        isTaken = await gestaoApi.verificarVendaPorCodigo(availableOrderNumber);
      }
      // Atualiza o número do pedido para o próximo vago encontrado
      nextOrderNumber.value = availableOrderNumber;
    } else {
      throw new Error("Não foi possível determinar o número do próximo pedido.");
    }
    // --- FIM DA CORREÇÃO ---

    const selectedClient = clientList.value.find(c => c.id === orderHeader.customer_id);
    if (!selectedClient) throw new Error("Cliente selecionado não encontrado na lista.");

    let proofPublicUrl: string | null = null;
    if (orderHeader.has_down_payment && orderHeader.down_payment_proof_file) {
      const file = orderHeader.down_payment_proof_file;
      const baseName = sanitizeName(file.name);
      const filePath = `proofs/${Date.now()}-${baseName}`;
      proofPublicUrl = await uploadFile(file, 'proofs', filePath);
    }

    // Sincroniza com o Gestão Click usando o número de pedido já validado
    await syncOrderWithGestaoClick(proofPublicUrl);

   const itemsPayload = orderItems.value.map(item => {
     const total_value_item = (item.quantity || 0) * (item.valor_unitario || 0);

     return {
         fabric_type: item.fabric_type,
         stamp_ref: item.stamp_ref,
         quantity_meters: item.quantity_meters, // Sempre envia a metragem
         stamp_image_url: item.stamp_image_url,
         design_tag: item.design_tag,
         notes: item.notes,
         quantity_unit: item.quantity, // O mais importante: envia o valor final (KG ou Metro)
         unit_of_measure: item.unit_of_measure,
         rendimento: item.rendimento,
         status: item.status,
         total_value_items: total_value_item,
     };

   });

    const totalOrderValueCalculated = itemsPayload.reduce((sum, item) => sum + item.total_value_items, 0);

    const { data: newOrderNumber, error: rpcError } = await supabase.rpc('create_launch_order', {
      p_customer_name: selectedClient.nome, p_created_by: userStore.profile?.id, p_store_id: userStore.profile?.store_id,
      p_has_down_payment: orderHeader.has_down_payment, p_down_payment_proof_url: proofPublicUrl, p_order_items: itemsPayload,
      p_total_value: totalOrderValueCalculated
    });

    if (rpcError) throw rpcError;

    const { data: orderData } = await supabase.from('orders').select('id').eq('order_number', newOrderNumber).single();
    if (orderData) createdOrderId.value = orderData.id;
    createdOrderNumber.value = newOrderNumber;
    orderCreatedSuccess.value = true;
    showFeedback("Pedido criado e sincronizado com sucesso!", "success");
  } catch (error: any) {
    console.error('Erro ao criar lançamento:', error);
    let errorMessage = error.message || 'Erro desconhecido.';
    // Melhora a mensagem de erro para o usuário
    if (errorMessage.includes('Gestão Click') || (error.response && error.response.data)) {
        errorMessage = `Falha na integração com o sistema de gestão: ${errorMessage}`;
    }
    showFeedback(`Erro ao criar lançamento: ${errorMessage}`, 'error');
  } finally {
    isSubmitting.value = false;
  }
};


const resetForm = () => {
  orderHeader.customer_id = null;
  orderHeader.customer_name = '';
  orderHeader.has_down_payment = false;
  orderHeader.down_payment_proof_file = null;
  orderHeader.observation = '';
  paymentDetails.type = 'vista';
  paymentDetails.installments = [];
  paymentDetails.installments_interval = 30;
  clientSearch.value = '';
  clientList.value = [];
  orderItems.value = [];
  prepareNewItem();
  step.value = 1;
  orderCreatedSuccess.value = false;
  createdOrderId.value = null;
  createdOrderNumber.value = null;
  fetchNextOrderNumber();
  fetchInitialData();
};

const showFeedback = (message: string, type: 'success' | 'error') => {
  feedback.message = message;
  feedback.type = type;
};

const formatCurrency = (value: number | undefined | null) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const imageToBase64 = (urlOrFile: string | File): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        } else {
            reject(new Error('Não foi possível obter o contexto do canvas'));
        }
    };
    img.onerror = reject;

    if (typeof urlOrFile === 'string') {
        img.src = urlOrFile;
    } else {
        img.src = URL.createObjectURL(urlOrFile);
    }
});

const addHeader = async (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.width;
    try {
        const logoUrl = 'https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Sem_nome_1080_x_800_px_1080_x_500_px_1080_x_400_px_1000_x_380_px_da020cf2-2bb9-4dac-8dd3-4548cfd2e5ae.png?v=1756811713';
        const logoBase64 = await imageToBase64(logoUrl);
        const logoProps = doc.getImageProperties(logoBase64);
        const logoWidth = 50;
        const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
        doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight);
    } catch (e) {
        console.error("Não foi possível carregar o logo para o PDF", e);
    }

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text([
      "MR JACKY - 20.631.721/0001-07",
      "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000",
      "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com"
    ], pageWidth - 15, 15, { align: 'right' });

    doc.setLineWidth(0.5);
    doc.line(15, 35, pageWidth - 15, 35);
};

const addFooter = (doc: jsPDF) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8).setTextColor(150);
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Gerado com MJProcess em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, pageHeight - 10);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
    }
};

const addWatermark = (doc: jsPDF) => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(72);
        doc.setTextColor(255, 192, 203); // Light Pink
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.2 }));

        // Repete a marca d'água pela página
        for (let y = 0; y < pageHeight; y += 100) {
            for (let x = -50; x < pageWidth; x += 150) {
                 doc.text('RECIBO', x, y, { angle: -45, align: 'center' });
            }
        }
        doc.restoreGraphicsState();
    }
};


const generateQuoteAndUploadPdf = async () => {
    isGeneratingPdf.value = true;
    try {
        const selectedClient = clientList.value.find(c => c.id === orderHeader.customer_id) || { nome: 'Cliente Desconhecido' };

        const itemDetailsWithPrice = orderItems.value.map(item => {
            const price = item.valor_unitario || 0;
            const quantityForCalc = item.quantity || 0;
            const total = quantityForCalc * price;
            return {
                base: item.fabric_type, estampa: item.stamp_ref, quantidade: `${item.quantity}${item.unit_of_measure}`,
                rendimento: item.unit_of_measure === 'kg' ? `~ ${item.quantity_meters?.toFixed(2)}m` : '-',
                valorUnit: formatCurrency(price), valorTotal: formatCurrency(total)
            };
        });

        const grandTotal = itemDetailsWithPrice.reduce((sum, item) => sum + parseFloat(item.valorTotal.replace('R$', '').replace(/\./g, '').replace(',', '.')), 0);
        const doc = new jsPDF();

        await addHeader(doc);

        doc.setFontSize(18).setFont('helvetica', 'bold').text(`Orçamento #${String(createdOrderNumber.value).padStart(4, '0')}`, 15, 45);
        autoTable(doc, {
            startY: 50,
            head: [['CLIENTE', 'VENDEDOR', 'DATA DE EMISSÃO']],
            body: [[selectedClient.nome, userStore.profile?.full_name || 'N/A', format(new Date(), 'dd/MM/yyyy', { locale: ptBR })]],
            theme: 'striped',
        });
        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 10,
            head: [['Base', 'Estampa', 'Quantidade', 'Rendimento', 'Valor Unit.', 'Valor Total']],
            body: itemDetailsWithPrice.map(i => [i.base, i.estampa, i.quantidade, i.rendimento, i.valorUnit, i.valorTotal]),
            theme: 'grid',
            foot: [['', '', '', '', 'Total do Pedido:', formatCurrency(grandTotal)]],
            footStyles: { fontStyle: 'bold', fontSize: 11, halign: 'right' },
            didDrawPage: (data) => {
                const signatureY = doc.internal.pageSize.height - 40;
                doc.setLineWidth(0.5).setDrawColor(100, 100, 100).line(40, signatureY, doc.internal.pageSize.width - 40, signatureY);
                doc.setFontSize(10).setTextColor(100).text(`Assinatura do Cliente: ${selectedClient.nome}`, doc.internal.pageSize.width / 2, signatureY + 5, { align: 'center' });
            }
        });

        addFooter(doc);

        const pdfBlob = doc.output('blob');
        const pdfFileName = `Orcamento_${String(createdOrderNumber.value).padStart(4, '0')}_${sanitizeName(selectedClient.nome)}.pdf`;

        // Download logic
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Upload logic
        const pdfPath = `sales_orders/${pdfFileName}`;
        const publicUrl = await uploadFile(pdfBlob, 'sales-orders', pdfPath);
        const { error: updateError } = await supabase.from('orders').update({ sales_order_pdf_url: publicUrl }).eq('id', createdOrderId.value);
        if (updateError) throw updateError;
        showFeedback('Orçamento em PDF gerado, baixado e anexado com sucesso!', 'success');
    } catch (error: any) {
        console.error("Erro ao gerar PDF do orçamento:", error);
        showFeedback(`Erro ao gerar PDF: ${error.message}`, 'error');
    } finally {
        isGeneratingPdf.value = false;
    }
};

// =================================================================
// NOVA FUNÇÃO PARA BAIXAR O PDF DO RESUMO DO PEDIDO NO STEP 2
// =================================================================
const downloadPDF = async () => {
  isGeneratingPdf.value = true;
  try {
    const selectedClient = clientList.value.find(c => c.id === orderHeader.customer_id) || { nome: 'Cliente não selecionado' };
    const doc = new jsPDF();
    await addHeader(doc);
    doc.setFontSize(18).setFont('helvetica', 'bold').text(`Resumo do Pedido #${String(nextOrderNumber.value || '...').padStart(4, '0')}`, 15, 45);
    autoTable(doc, {
      startY: 50,
      head: [['CLIENTE', 'VENDEDOR', 'DATA DE EMISSÃO']],
      body: [[selectedClient.nome, userStore.profile?.full_name || 'N/A', format(new Date(), 'dd/MM/yyyy', { locale: ptBR })]],
      theme: 'striped',
    });
    const tableColumn = ["Base", "Estampa", "Quantidade", "Valor Unit.", "Subtotal"];
    const tableRows = orderItems.value.map(item => [
      item.fabric_type || 'N/A',
      item.stamp_ref || 'N/A',
      `${item.quantity || 0}${item.unit_of_measure}`,
      formatCurrency(item.valor_unitario),
      formatCurrency((item.quantity || 0) * (item.valor_unitario || 0))
    ]);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
    });
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(14);
    doc.text('Total do Pedido:', 14, finalY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(totalOrderValue.value), 200, finalY + 15, { align: 'right' });
    addFooter(doc);
    doc.save(`resumo_pedido_${sanitizeName(selectedClient.nome)}.pdf`);
    showFeedback('Resumo em PDF gerado com sucesso!', 'success');
  } catch (error: any) {
    console.error("Erro ao gerar PDF de resumo:", error);
    showFeedback(`Erro ao gerar PDF: ${error.message}`, 'error');
  } finally {
    isGeneratingPdf.value = false;
  }
};


const generateStandaloneReceiptPdf = async () => {
    if (!orderHeader.has_down_payment || !orderHeader.down_payment_proof_file) {
        showFeedback('Nenhum comprovante de sinal encontrado para gerar o recibo.', 'error');
        return;
    }
    isGeneratingPdf.value = true;
    try {
        const selectedClient = clientList.value.find(c => c.id === orderHeader.customer_id) || { nome: 'Cliente Desconhecido', cpf_cnpj: 'Não informado' };

        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('down_payment_proof_url')
            .eq('id', createdOrderId.value)
            .single();

        if (orderError || !orderData?.down_payment_proof_url) {
            throw new Error('Não foi possível encontrar o link do comprovante de sinal.');
        }

        const proofPublicUrl = orderData.down_payment_proof_url;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 15;

        // --- PÁGINA 1: cabeçalho e informações ---
        await addHeader(doc);

        doc.setFontSize(18).setFont('helvetica', 'bold').text(`Recibo de Sinal`, pageWidth / 2, 45, { align: 'center' });

        const startY = 60;
        const receiptText = `O Estúdio de Estampa MJ (CNPJ: 20.631.721/0001-07) confirma o recebimento do comprovante de sinal referente ao Pedido #${String(createdOrderNumber.value).padStart(4, '0')}.`;

        const maxTextWidth = pageWidth * 0.67;
        const splitText = doc.splitTextToSize(receiptText, maxTextWidth);

        doc.setFontSize(11).setFont('helvetica', 'normal');
        doc.text(splitText, margin, startY);

        const textHeight = doc.getTextDimensions(splitText).h;

        // QR Code
        const qrSize = textHeight * 1.4;
        const qrX = margin + maxTextWidth + 5;
        const qrY = startY - 4;

        const qrCodeDataUrl = await QRCode.toDataURL(proofPublicUrl, { width: qrSize * 5 });
        doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

        doc.setFontSize(7).setTextColor(100);
        doc.text('Aponte sua câmera aqui', qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });

        let nextElementY = startY + textHeight + 10;

        autoTable(doc, {
            startY: nextElementY,
            head: [['CLIENTE', 'CPF/CNPJ', 'DATA DE EMISSÃO']],
            body: [[selectedClient.nome, selectedClient.cpf_cnpj || 'Não informado', format(new Date(), 'dd/MM/yyyy', { locale: ptBR })]],
            theme: 'striped',
        });

        const orderItemsForReceipt = orderItems.value.map(item => [
            item.fabric_type || 'N/A',
            item.stamp_ref || 'N/A',
            `${item.quantity || 0}${item.unit_of_measure}`,
            item.unit_of_measure === 'kg' ? `~${item.quantity_meters?.toFixed(2) || 0}m` : '-'
        ]);

        doc.setFontSize(12).setFont('helvetica', 'bold').text('Itens do Pedido (Referência)', margin, (doc as any).lastAutoTable.finalY + 10);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 15,
            head: [['Base', 'Estampa', 'Quantidade', 'Rendimento Aprox.']],
            body: orderItemsForReceipt,
            theme: 'grid',
        });

        // --- PÁGINA 2: comprovante ---
        doc.addPage();
        await addHeader(doc);

        let lastY = 60; // logo abaixo do cabeçalho
        doc.setFontSize(12).setFont('helvetica', 'bold').text('Comprovante Anexado', margin, lastY);

        const proofFile = orderHeader.down_payment_proof_file;
        if (proofFile && proofFile.type.startsWith('image/')) {
            const proofBase64 = await imageToBase64(proofFile);
            const imgProps = doc.getImageProperties(proofBase64);

            let imgWidth = imgProps.width;
            let imgHeight = imgProps.height;

            const contentWidth = pageWidth - margin * 2;
            const contentHeight = pageHeight - lastY - 20; // deixa espaço pro footer

            const widthRatio = contentWidth / imgWidth;
            const heightRatio = contentHeight / imgHeight;
            const ratio = Math.min(widthRatio, heightRatio, 1);

            imgWidth *= ratio;
            imgHeight *= ratio;

            const x = (pageWidth - imgWidth) / 2;
            doc.addImage(proofBase64, 'PNG', x, lastY + 10, imgWidth, imgHeight);
        }

        // --- Marca d'água e rodapé ---
        addWatermark(doc);
        addFooter(doc);

        const pdfFileName = `Recibo_Sinal_Pedido_${String(createdOrderNumber.value).padStart(4, '0')}_${sanitizeName(selectedClient.nome)}.pdf`;
        doc.save(pdfFileName);

        showFeedback('Recibo de sinal gerado e baixado com sucesso!', 'success');
    } catch (error) {
        console.error("Erro ao gerar PDF do recibo:", error);
        showFeedback(`Erro ao gerar PDF do recibo: ${error.message}`, 'error');
    } finally {
        isGeneratingPdf.value = false;
    }
};


// --- Lifecycle Hooks ---
onMounted(() => {
    fetchNextOrderNumber();
    fetchInitialData();
});
</script>

<style scoped lang="scss">
@keyframes blink {
  50% {
    opacity: 0.5;
  }
}
.blinking-icon {
  animation: blink 1.5s infinite ease-in-out;
  color: #03A9F4;
}

.glassmorphism-card-order {
  backdrop-filter: blur(15px);
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
.item-list-card {
  background-color: rgba(255, 255, 255, 0.05);
  height: 100%;
}
.item-form-card {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

/* ===== NOVOS ESTILOS PARA O MODAL DE AVISO ===== */
.stock-alert-card {
    background: linear-gradient(145deg, #CF6679, #b00020);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
</style>
