<template>
  <v-container class="py-8">
    <v-expand-transition>
      <v-alert
        v-if="showDraftAlert"
        class="mb-6 modern-draft-alert"
        color="primary"
        variant="tonal"
        border="start"
        elevation="2"
        icon="mdi-content-save-clock-outline"
      >
        <div class="d-flex flex-wrap align-center">
          <div class="flex-grow-1">
            <div class="font-weight-bold">Um rascunho automático foi encontrado.</div>
            <div class="text-caption">Continue de onde você parou ou explore outras opções.</div>
          </div>
          <div class="mt-2 mt-sm-0">
            <v-btn color="primary" variant="flat" @click="restoreAutoSave" class="mr-2" size="small">
              <v-icon start>mdi-restore</v-icon>
              Restaurar
            </v-btn>
            <v-btn variant="outlined" @click="openDraftsModal" class="mr-2" size="small">Ver Outros</v-btn>
            <v-btn icon="mdi-close" variant="text" @click="clearAutoSave(true)" size="small"></v-btn>
          </div>
        </div>
      </v-alert>
    </v-expand-transition>

    <v-card class="glassmorphism-card-order mx-auto" max-width="1200">
      <v-toolbar color="transparent">
        <v-toolbar-title class="font-weight-bold">
          <v-icon start>mdi-plus-box-outline</v-icon>
          Lançar Novo Pedido
          <v-chip v-if="isDraftMode" color="warning" size="small" class="ml-2" label>
            <v-icon start>mdi-pencil-circle-outline</v-icon>
            MODO RASCUNHO
          </v-chip>
        </v-toolbar-title>
        <v-spacer></v-spacer>

        <v-switch
            v-model="isDraftMode"
            label="Modo Rascunho"
            color="warning"
            hide-details
            inset
            class="mr-2"
        ></v-switch>

        <v-btn variant="text" class="mr-2" @click="openDraftsModal">
          <v-icon start>mdi-file-document-multiple-outline</v-icon>
          Rascunhos
        </v-btn>
        <v-btn variant="tonal" color="secondary" class="mr-4" @click="saveDraftAs" :loading="isSavingDraft">
          <v-icon start>mdi-content-save-outline</v-icon>
          Salvar Rascunho
        </v-btn>

        <div class="pa-2 text-right">
          <div class="text-caption text-grey">Número do Pedido</div>
          <div v-if="loadingNextOrderNumber" class="text-center">
            <v-progress-circular indeterminate size="20" width="2"></v-progress-circular>
          </div>
          <div v-else class="text-h6 font-weight-bold">#{{ String(currentOrderNumber).padStart(4, '0') }}</div>
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
                              v-if="item.has_insufficient_stock"
                              color="error"
                              size="x-small"
                              class="ml-2"
                              label
                            >
                              <v-icon start size="x-small">mdi-alert-circle-outline</v-icon>
                              Estoque Insuficiente
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
                                size="small"
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


                            <div v-if="editedItem.fabric_type" class="mt-n2 mb-4 px-2">
                               <div class="d-flex justify-space-between text-caption text-grey">
                                 <span v-if="(editedItem.quantity || 0) > realTimeAvailableStock" class="text-error font-weight-bold">
                                    Estoque insuficiente!
                                  </span>
                                 <span v-else>Estoque disponível para este pedido:</span>
                                 <span>{{ realTimeAvailableStock.toLocaleString('pt-BR') }}{{ selectedProductUnit }}</span>
                               </div>
                              <v-progress-linear
                                :model-value="((editedItem.quantity || 0) / (selectedProductStock || 1)) * 100"
                                :color="getStockUsageColor(editedItem.quantity || 0, realTimeAvailableStock)"
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

                  <v-text-field
                    v-model.number="downPaymentForReceipt"
                    label="Valor do Sinal Recebido (para recibo)"
                    type="number"
                    variant="outlined"
                    prefix="R$"
                    class="mb-4"
                    :disabled="!orderHeader.customer_id"
                  ></v-text-field>

                  <v-btn
                    color="info"
                    variant="outlined"
                    block
                    class="mb-6"
                    @click="generateDraftReceiptPdf"
                    :loading="isGeneratingPdf"
                    :disabled="!downPaymentForReceipt || downPaymentForReceipt <= 0"
                  >
                    <v-icon start>mdi-receipt-text-outline</v-icon>
                    Gerar Recibo de Sinal
                  </v-btn>

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
                  label="Anexar comprovante de entrada (opcional)?"
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
                ></v-file-input>
              </v-form>
            </v-card-text>
          </v-card>
        </template>

        <template v-slot:actions>
          <div class="d-flex w-100 pa-4">
            <v-btn v-if="step > 1" @click="step--" variant="text">
              <v-icon start>mdi-chevron-left</v-icon>
              Voltar
            </v-btn>
            <v-spacer></v-spacer>
            <v-btn v-if="step < 3" @click="nextStep" :disabled="!isStepValid" color="primary" variant="outlined">
              Continuar
              <v-icon end>mdi-chevron-right</v-icon>
            </v-btn>
            <div v-else>
                <v-tooltip location="top" :disabled="isCurrentDraftLaunchable">
                  <template v-slot:activator="{ props }">
                    <div v-bind="props">
                      <v-btn
                        v-if="isDraftMode"
                        @click="convertToOrder"
                        :disabled="!isCurrentDraftLaunchable"
                        color="success"
                        variant="flat"
                        size="large"
                      >
                        <v-icon start>mdi-file-check-outline</v-icon>
                        Converter para Pedido
                      </v-btn>
                    </div>
                  </template>
                  <span>Há itens com estoque insuficiente. Verifique os itens sinalizados.</span>
                </v-tooltip>
                <v-tooltip location="top" :disabled="!hasGrossOrderProduct">
    <template v-slot:activator="{ props }">
        <div v-bind="props"> <v-btn
                v-if="!isDraftMode"
                @click="submitLaunch"
                :loading="isSubmitting"
                :disabled="!isStepValid || hasGrossOrderProduct"
                color="primary"
                variant="flat"
                size="large"
            >
                <v-icon start>mdi-rocket-launch</v-icon>
                Enviar Lançamento
            </v-btn>
        </div>
    </template>
    <span>Não é possível lançar pedidos com "PEDIDO BRUTO". Salve como rascunho ou remova o item.</span>
</v-tooltip>
            </div>
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
            <v-icon start>mdi-file-pdf-box</v-icon>
            Baixar Orçamento
          </v-btn>
          <v-btn
            size="large"
            variant="tonal"
            @click="resetForm(true)"
          >
            <v-icon start>mdi-plus-box</v-icon>
            Lançar Novo Pedido
          </v-btn>
        </div>
      </div>

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
            <p>Não é possível adicionar ou atualizar o item <strong>{{ stockWarningDetails.fabric }}</strong>.</p>
            <p class="mt-2">A quantidade total necessária para o pedido (<strong>{{ stockWarningDetails.needed.toLocaleString('pt-BR') }}{{ stockWarningDetails.unit }}</strong>) excede o estoque disponível (<strong>{{ stockWarningDetails.available.toLocaleString('pt-BR') }}{{ stockWarningDetails.unit }}</strong>).</p>

            <v-alert
                border="start"
                border-color="white"
                elevation="0"
                class="mt-4 pa-3"
                color="rgba(255,255,255,0.1)"
            >
                <strong class="text-white">Ação Sugerida:</strong> Ative o "Modo Rascunho" para continuar montando o pedido ou avise o gerente sobre a necessidade de reposição.
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

    <DraftsListModal
      :show="draftsModal"
      :drafts="drafts"
      :products="gestaoClickProducts"
      @close="draftsModal = false"
      @load="loadDraft"
      @delete="deleteDraft"
    />

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive, nextTick, toRaw, watch, onBeforeUnmount } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { useAppStore } from '@/stores/app';
import type { VForm } from 'vuetify/components';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCode from 'qrcode';
import ClientFormModal from '@/components/ClientFormModal.vue';
import { gestaoApi } from '@/api/gestaoClick';
import DraftsListModal from '@/components/DraftsListModal.vue';

// --- Constantes ---
const GROSS_ORDER_PRODUCT_NAME = 'PEDIDO BRUTO';

// --- Type Definitions ---
type OrderHeader = {
  customer_id: number | null;
  customer_name: string;
  has_down_payment: boolean;
  down_payment_proof_file: File | null;
  observation?: string;
};
type OrderItem = {
  fabric_type: string | null; stamp_ref_id: string | null; stamp_ref: string; quantity: number | null; quantity_meters: number | null;
  unit_of_measure: 'm' | 'kg'; rendimento: number | null; valor_unitario: number | null; stamp_image_url: string | null; notes: string;
  design_tag: 'Desenvolvimento' | 'Alteração' | 'Finalização'; new_stamp_file?: File | null;
  has_insufficient_stock: boolean; status: 'design_pending' | 'pending_stock';
};
type StampLibraryItem = { id: number; gestao_click_service_id: string; name: string; image_url: string; is_approved_for_sale: boolean; };
type StockItem = { id: string; gestao_click_id: string; fabric_type: string; available_meters: number; low_stock_threshold: number | null; unit_of_measure: 'metro' | 'kg'; rendimento: number | null; };
type Client = { id: number; nome: string; cpf_cnpj?: string; tipo_pessoa?: 'PF' | 'PJ' }
type GestaoClickProduct = { id: string; nome: string; estoque: number | string; valor_venda: string; unidade: string | null; rendimento?: string | null; };
type GestaoClickService = { id: string; nome: string; valor_venda: string; imagem_url?: string; };
type SaleStatus = { id: number; nome: string; };
type PaymentMethod = { id: string; nome: string; };
interface Installment { due_date: string; value: number; payment_method_id: number | null; }
interface Draft {
  id: string;
  user_id: string;
  name: string;
  draft_data: {
    orderHeader: OrderHeader;
    orderItems: OrderItem[];
    paymentDetails: any;
    step: number;
    isDraftMode?: boolean;
  };
  reserved_order_number: number | null;
  created_at: string;
}

// --- Component State ---
const userStore = useUserStore();
const appStore = useAppStore();
const step = ref(1);
const isSubmitting = ref(false);
const step1Form = ref<VForm | null>(null);
const step3Form = ref<VForm | null>(null);
const itemForm = ref<VForm | null>(null);
const stepperItems = [ { title: 'Cliente', icon: 'mdi-account' }, { title: 'Itens do Pedido', icon: 'mdi-format-list-bulleted-square' }, { title: 'Pagamento', icon: 'mdi-cash-multiple' } ];
const currentOrderNumber = ref<number | null>(null);
const loadingNextOrderNumber = ref(true);
const orderCreatedSuccess = ref(false);
const createdOrderId = ref<string | null>(null);
const createdOrderNumber = ref<number | null>(null);
const isGeneratingPdf = ref(false);
const overridePrice = ref(false);
const tempMeters = ref<number | null>(null);
const isDraftMode = ref(false); // CORRIGIDO: Inicia como 'false' por padrão.
const downPaymentForReceipt = ref<number | null>(null);
const AUTO_RECOVERY_KEY = 'autoRecoveryOrder';
const showDraftAlert = ref(false);
const draftsModal = ref(false);
const isSavingDraft = ref(false);
const drafts = ref<Draft[]>([]);
let autoSaveTimeout: NodeJS.Timeout;
const currentDraftId = ref<string | null>(null);
const showStockWarningModal = ref(false);
const stockWarningDetails = reactive({ fabric: '', needed: 0, available: 0, unit: 'm' });
const paymentMethods = ref<PaymentMethod[]>([]);
const paymentDetails = reactive({ type: 'vista' as 'vista' | 'parcelado', installments: [] as Installment[], installment_payment_method_id: null as number | null, installments_count: 1, installments_interval: 30, first_due_date: format(new Date(), 'yyyy-MM-dd'), });
const showClientModal = ref(false);
const clientList = ref<Client[]>([]);
const clientSearch = ref('');
const isSearchingClients = ref(false);
let searchTimeout: NodeJS.Timeout;
const gestaoClickProducts = ref<GestaoClickProduct[]>([]);
const stockItems = ref<StockItem[]>([]);
const loadingGestaoClickProducts = ref(true);
const gestaoClickServices = ref<GestaoClickService[]>([]);
const loadingGestaoClickServices = ref(true);
const saleStatuses = ref<SaleStatus[]>([]);
const stampLibrary = ref<StampLibraryItem[]>([]);
const isUploadingNewStamp = ref(false);
const tagColorMap = { 'Desenvolvimento': '#40c4ff', 'Alteração': '#ffab40', 'Finalização': '#26A69A'};
const orderHeader = reactive<OrderHeader>({ customer_id: null, customer_name: '', has_down_payment: false, down_payment_proof_file: null, observation: '' });
const createNewItem = (): OrderItem => ({ fabric_type: null, stamp_ref_id: null, stamp_ref: '', quantity: null, quantity_meters: null, unit_of_measure: 'm', rendimento: null, valor_unitario: null, stamp_image_url: null, notes: '', design_tag: 'Desenvolvimento', new_stamp_file: null, has_insufficient_stock: false, status: 'design_pending' });
const orderItems = ref<OrderItem[]>([]);
const editedItem = ref<OrderItem>(createNewItem());
const editedItemIndex = ref<number | null>(null);
const isEditing = computed(() => editedItemIndex.value !== null);

// --- LÓGICA DE RASCUNHOS (BACKEND) ---
const orderState = computed(() => ({ orderHeader: toRaw(orderHeader), orderItems: toRaw(orderItems.value), paymentDetails: toRaw(paymentDetails), step: step.value, isDraftMode: isDraftMode.value, }));

const saveDraftAs = async () => {
  const clientName = orderHeader.customer_name || 'Rascunho';
  const draftName = prompt('Dê um nome para este rascunho:', `${clientName} - ${new Date().toLocaleDateString('pt-BR')}`);

  if (draftName && userStore.profile?.id) {
    isSavingDraft.value = true;
    try {
      const { data: reservedNumber, error: rpcError } = await supabase.rpc('get_and_increment_order_number');
      if (rpcError) throw rpcError;

      currentOrderNumber.value = reservedNumber;

      const draftPayload = {
        user_id: userStore.profile.id,
        name: draftName,
        draft_data: orderState.value,
        reserved_order_number: reservedNumber,
      };

      const { data, error } = await supabase
        .from('order_drafts')
        .insert(draftPayload)
        .select()
        .single();

      if (error) throw error;

      currentDraftId.value = data.id;
      appStore.showSnackbar(`Rascunho "${draftName}" salvo com o pedido #${reservedNumber}!`, 'success');
      resetForm(true);

    } catch (error: any) {
      console.error("Erro ao salvar rascunho no banco de dados:", error);
      appStore.showSnackbar(`Falha ao salvar rascunho: ${error.message}`, 'error');
    } finally {
      isSavingDraft.value = false;
    }
  }
};

const loadDraft = (draft: Draft) => {
  restoreState(draft.draft_data);
  currentOrderNumber.value = draft.reserved_order_number;
  currentDraftId.value = draft.id;
  draftsModal.value = false;
  showDraftAlert.value = false;
  localStorage.removeItem(AUTO_RECOVERY_KEY);
  appStore.showSnackbar(`Rascunho "${draft.name}" carregado.`, 'info');
};

const deleteDraft = async (draftId: string) => {
  if (confirm('Tem certeza que deseja excluir este rascunho do banco de dados?')) {
    const { error } = await supabase.from('order_drafts').delete().match({ id: draftId });
    if (error) {
      appStore.showSnackbar(`Erro ao excluir rascunho: ${error.message}`, 'error');
    } else {
      drafts.value = drafts.value.filter(d => d.id !== draftId);
      appStore.showSnackbar('Rascunho excluído.', 'success');
    }
  }
};

const openDraftsModal = async () => {
  if (!userStore.profile?.id) return;
  const { data, error } = await supabase
    .from('order_drafts')
    .select('*')
    .eq('user_id', userStore.profile.id)
    .order('created_at', { ascending: false });

  if (data) drafts.value = data;
  draftsModal.value = true;
};

const autoSave = () => {
  if (!orderHeader.customer_id && orderItems.value.length === 0) {
    clearAutoSave(); return;
  }
  localStorage.setItem(AUTO_RECOVERY_KEY, JSON.stringify(orderState.value));
};

const restoreState = (stateToRestore: any) => {
  Object.assign(orderHeader, stateToRestore.orderHeader);
  orderItems.value = stateToRestore.orderItems;
  Object.assign(paymentDetails, stateToRestore.paymentDetails);
  isDraftMode.value = stateToRestore.isDraftMode ?? false;

  if (orderHeader.customer_id && !clientList.value.some(c => c.id === orderHeader.customer_id)) {
    clientList.value.unshift({ id: orderHeader.customer_id, nome: orderHeader.customer_name });
  }

  nextTick(() => {
    step.value = stateToRestore.step;
  });
};

const restoreAutoSave = () => {
  try {
    const savedState = localStorage.getItem(AUTO_RECOVERY_KEY);
    if (savedState) {
      restoreState(JSON.parse(savedState));
      appStore.showSnackbar('Progresso não salvo restaurado.', 'info');
    }
    showDraftAlert.value = false;
  } catch (e) {
    console.error("Erro ao restaurar rascunho:", e);
    appStore.showSnackbar('Falha ao restaurar rascunho.', 'error');
    clearAutoSave();
  }
};

const clearAutoSave = (showSnack = false) => {
  localStorage.removeItem(AUTO_RECOVERY_KEY);
  showDraftAlert.value = false;
  if (showSnack) {
    appStore.showSnackbar('Rascunho de recuperação descartado.', 'success');
    resetForm(false);
  }
};

watch(orderState, () => { clearTimeout(autoSaveTimeout); autoSaveTimeout = setTimeout(autoSave, 2000); }, { deep: true });


// --- LÓGICA DO COMPONENTE ---
const hasGrossOrderProduct = computed(() =>
  orderItems.value.some(item => item.fabric_type?.trim() === GROSS_ORDER_PRODUCT_NAME)
);

const addBusinessDays = (startDate: Date, days: number): Date => { const newDate = new Date(startDate); let addedDays = 0; while (addedDays < days) { newDate.setDate(newDate.getDate() + 1); if (newDate.getDay() !== 0) { addedDays++; } } return newDate; };
const rules = { required: (v: any) => !!v || 'Campo obrigatório.', positive: (v: number | null) => (v != null && v > 0) || 'O valor deve ser maior que zero.', fileRequired: (v: any) => !!v || 'É obrigatório selecionar um arquivo.', };
const isCurrentDraftLaunchable = computed(() => { if (orderItems.value.length === 0) return false; return !orderItems.value.some(item => item.has_insufficient_stock); });

const convertToOrder = () => {
    if (hasGrossOrderProduct.value) {
      appStore.showSnackbar('Remova ou altere o item "PEDIDO BRUTO" antes de converter para um pedido final.', 'error');
      return;
    }
    if (!isCurrentDraftLaunchable.value) {
      appStore.showSnackbar('Este rascunho não pode ser convertido pois há itens com estoque insuficiente.', 'error');
      return;
    }
    isDraftMode.value = false;
};

const totalOrderValue = computed(() => orderItems.value.reduce((total, item) => total + (item.quantity || 0) * (item.valor_unitario || 0), 0));
watch(totalOrderValue, (newValue) => { if (paymentDetails.type === 'vista' && paymentDetails.installments.length > 0) { paymentDetails.installments[0].value = newValue; } });
watch(() => paymentDetails.type, (newType) => { generateInstallments(); });
const selectedProduct = computed(() => { if (!editedItem.value.fabric_type) return null; const product = stockItems.value.find(p => p.fabric_type === editedItem.value.fabric_type); return product || gestaoClickProducts.value.find(p => p.nome === editedItem.value.fabric_type); });
const selectedProductUnit = computed(() => { if (!selectedProduct.value) return 'm'; const unit = (selectedProduct.value as StockItem)?.unit_of_measure || (selectedProduct.value as GestaoClickProduct)?.unidade; return (unit || 'm').toLowerCase(); });
const selectedProductRendimento = computed(() => { if (!selectedProduct.value) return null; return (selectedProduct.value as StockItem).rendimento || parseFloat((selectedProduct.value as GestaoClickProduct).rendimento || '0'); });
const selectedProductStock = computed(() => { const productName = editedItem.value.fabric_type; if (!productName) return null; const product = gestaoClickProducts.value.find(p => p.nome === productName); if (!product || product.estoque === undefined) return 0; const stockValue = parseFloat(product.estoque as string); return isNaN(stockValue) ? 0 : stockValue; });
const realTimeAvailableStock = computed(() => { const totalStock = selectedProductStock.value; if (totalStock === null || !editedItem.value.fabric_type) { return 0; } const quantityAlreadyInCart = orderItems.value.reduce((total, item, index) => { if (item.fabric_type === editedItem.value.fabric_type && index !== editedItemIndex.value) { return total + (item.quantity || 0); } return total; }, 0); return totalStock - quantityAlreadyInCart; });
watch(isDraftMode, (isDraft) => {
    if (isDraft) {
        appStore.showSnackbar('Modo Rascunho ativado. O estoque não será validado ao adicionar itens.', 'info');
        const allFabrics = [...new Set(orderItems.value.map(i => i.fabric_type).filter(Boolean))];
        allFabrics.forEach(fabric => {
            const itemsOfSameFabric = orderItems.value.filter(i => i.fabric_type === fabric);
            const totalQuantityForFabric = itemsOfSameFabric.reduce((sum, i) => sum + (i.quantity || 0), 0);
            const product = gestaoClickProducts.value.find(p => p.nome === fabric);
            const totalStock = product ? parseFloat(product.estoque as string) : 0;
            const hasEnoughStock = totalQuantityForFabric <= totalStock;
            itemsOfSameFabric.forEach(i => i.has_insufficient_stock = !hasEnoughStock);
        });
    } else {
        if (!isCurrentDraftLaunchable.value) {
            appStore.showSnackbar('Este rascunho não pode ser convertido para um pedido pois há itens com estoque insuficiente.', 'error');
            nextTick(() => { isDraftMode.value = true });
        } else {
            appStore.showSnackbar('Modo Rascunho desativado. O pedido agora pode ser lançado.', 'success');
            orderItems.value.forEach(item => item.has_insufficient_stock = false);
        }
    }
});
watch(() => orderHeader.customer_id, (newId) => { if (newId) { const client = clientList.value.find(c => c.id === newId); if (client) { orderHeader.customer_name = client.nome; } } else { orderHeader.customer_name = ''; } });
watch(() => editedItem.value.stamp_ref_id, (serviceId) => { if (isUploadingNewStamp.value) return; if (!serviceId) { editedItem.value.stamp_ref = ''; editedItem.value.stamp_image_url = null; return; } const service = gestaoClickServices.value.find(s => s.id === serviceId); if (service) { editedItem.value.stamp_ref = service.nome; } const stamp = stampLibrary.value.find(s => s.gestao_click_service_id === serviceId); editedItem.value.stamp_image_url = stamp ? stamp.image_url : null; });
watch(() => editedItem.value.fabric_type, (productName) => { const product = gestaoClickProducts.value.find(p => p.nome === productName); if (product) { if (!overridePrice.value) { editedItem.value.valor_unitario = parseFloat(product.valor_venda) || 0; } const stockItem = stockItems.value.find(s => s.gestao_click_id === product.id); if (stockItem) { editedItem.value.unit_of_measure = stockItem.unit_of_measure === 'kg' ? 'kg' : 'm'; editedItem.value.rendimento = stockItem.rendimento; } else { editedItem.value.unit_of_measure = (product.unidade || 'm').toLowerCase() === 'kg' ? 'kg' : 'm'; editedItem.value.rendimento = parseFloat(product.rendimento || '0'); } } else { editedItem.value.valor_unitario = null; } });
watch(tempMeters, (newVal) => { if (selectedProductUnit.value === 'kg' && selectedProductRendimento.value && newVal) { editedItem.value.quantity = parseFloat((newVal / selectedProductRendimento.value).toFixed(2)); } });
watch(() => editedItem.value.quantity, (newVal) => { if (selectedProductUnit.value === 'kg' && selectedProductRendimento.value && newVal) { editedItem.value.quantity_meters = parseFloat((newVal * selectedProductRendimento.value).toFixed(2)); } else if (selectedProductUnit.value !== 'kg') { editedItem.value.quantity_meters = newVal; } });
const getStockUsageColor = (quantity: number, availableStock: number) => { if (availableStock <= 0) return 'error'; if (quantity > availableStock) return 'error'; if (quantity > availableStock * 0.8) return 'warning'; return 'success'; }
const isStepValid = computed(() => { if (step.value === 1) { return !!orderHeader.customer_id; } if (step.value === 2) { return orderItems.value.length > 0; } if (step.value === 3) { if (isDraftMode.value) return true; if (paymentDetails.installments.length === 0) return false; const totalInstallmentValue = paymentDetails.installments.reduce((sum, inst) => sum + (inst.value || 0), 0); if (Math.abs(totalInstallmentValue - totalOrderValue.value) > 0.01) return false; return paymentDetails.installments.every(inst => inst.due_date && inst.value > 0 && inst.payment_method_id); } return false; });
const isItemFormValid = computed(() => { const commonValid = !!editedItem.value.fabric_type && !!editedItem.value.quantity && editedItem.value.quantity > 0; if (isUploadingNewStamp.value) { return commonValid && !!editedItem.value.stamp_ref && !!editedItem.value.new_stamp_file; } return commonValid && !!editedItem.value.stamp_ref_id; });
watch(clientSearch, (newValue) => { if (!newValue) { return; } isSearchingClients.value = true; clearTimeout(searchTimeout); searchTimeout = setTimeout(async () => { clientList.value = await gestaoApi.buscarClientes(newValue); isSearchingClients.value = false; }, 500); });
const fetchInitialData = async () => { loadingGestaoClickProducts.value = true; loadingGestaoClickServices.value = true; try { const { data: stockData, error: stockError } = await supabase.from('stock').select('*').eq('verification', true); if (stockError) throw stockError; const finalProducts = stockData.map(stockItem => { const unitPrice = stockItem.base_price; return { id: stockItem.gestao_click_id, nome: stockItem.fabric_type, estoque: stockItem.available_meters, valor_venda: String(unitPrice || '0'), unidade: stockItem.unit_of_measure, rendimento: String(stockItem.rendimento || '0') }; }); gestaoClickProducts.value = finalProducts; const [services, statuses, stamps, payMethods] = await Promise.all([ gestaoApi.buscarServicos(), gestaoApi.getSituacoesVenda(), supabase.from('stamp_library').select('*').eq('is_approved_for_sale', true), gestaoApi.buscarFormasDePagamento(), ]); if (stamps.error) throw stamps.error; paymentMethods.value = payMethods; stampLibrary.value = stamps.data || []; const approvedStampServiceIds = new Set(stampLibrary.value.map(s => s.gestao_click_service_id)); gestaoClickServices.value = services.filter(service => approvedStampServiceIds.has(service.id)).map(service => { const matchingStamp = stampLibrary.value.find(s => s.gestao_click_service_id === service.id); return { ...service, imagem_url: matchingStamp ? matchingStamp.image_url : undefined }; }); saleStatuses.value = statuses; } catch (error) { appStore.showSnackbar('Não foi possível carregar os dados iniciais.', 'error'); console.error("ERRO CRÍTICO NA BUSCA DE DADOS INICIAIS:", error); } finally { loadingGestaoClickProducts.value = false; loadingGestaoClickServices.value = false; } };
const handleClientCreated = (newClient: Client) => { clientList.value.unshift(newClient); orderHeader.customer_id = newClient.id; showClientModal.value = false; appStore.showSnackbar(`Cliente "${newClient.nome}" cadastrado com sucesso!`, 'success'); };
const fetchNextOrderNumber = async () => { loadingNextOrderNumber.value = true; try { const { data, error } = await supabase.rpc('get_next_order_number'); if (error) throw error; currentOrderNumber.value = data; } catch (e) { console.error("Erro ao buscar número do pedido:", e); currentOrderNumber.value = 0; } finally { loadingNextOrderNumber.value = false; } };
const uploadFile = async (file: File | Blob, bucket: string, path: string): Promise<string> => { const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true }); if (error) throw error; return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl; };
const handleProofFileChange = (event: Event) => { const target = event.target as HTMLInputElement; if (target.files && target.files[0]) { orderHeader.down_payment_proof_file = target.files[0]; } else { orderHeader.down_payment_proof_file = null; } };
const handleNewStampFileChange = (event: Event) => { const target = event.target as HTMLInputElement; const file = target.files ? target.files[0] : null; editedItem.value.new_stamp_file = file; if (file) { editedItem.value.stamp_image_url = URL.createObjectURL(file); } else { editedItem.value.stamp_image_url = null; } };
const toggleStampUpload = () => { isUploadingNewStamp.value = !isUploadingNewStamp.value; editedItem.value.stamp_ref_id = null; editedItem.value.stamp_ref = ''; editedItem.value.stamp_image_url = null; editedItem.value.new_stamp_file = null; };
const nextStep = async () => { let formToValidate: VForm | null = null; if (step.value === 1) formToValidate = step1Form.value; if (step.value === 3) formToValidate = step3Form.value; if (formToValidate) { const { valid } = await formToValidate.validate(); if (valid && isStepValid.value) { if (step.value === 2) generateInstallments(); step.value++; } } else if (isStepValid.value) { if (step.value === 2) generateInstallments(); step.value++; } };
const prepareNewItem = async () => { editedItem.value = createNewItem(); editedItemIndex.value = null; isUploadingNewStamp.value = false; overridePrice.value = false; tempMeters.value = null; await nextTick(); itemForm.value?.resetValidation(); };
const editItem = (index: number) => { editedItemIndex.value = index; const itemToEdit = structuredClone(toRaw(orderItems.value[index])); editedItem.value = itemToEdit; isUploadingNewStamp.value = false; };
const removeItem = (index: number) => { const removedItemFabric = orderItems.value[index].fabric_type; orderItems.value.splice(index, 1); if (editedItemIndex.value === index) { prepareNewItem(); } else if (editedItemIndex.value !== null && editedItemIndex.value > index) { editedItemIndex.value--; } if (isDraftMode.value && removedItemFabric) { const itemsOfSameFabric = orderItems.value.filter(i => i.fabric_type === removedItemFabric); if (itemsOfSameFabric.length > 0) { const totalQuantityForFabric = itemsOfSameFabric.reduce((sum, i) => sum + (i.quantity || 0), 0); const product = gestaoClickProducts.value.find(p => p.nome === removedItemFabric); const totalStock = product ? parseFloat(product.estoque as string) : 0; const hasEnoughStock = totalQuantityForFabric <= totalStock; itemsOfSameFabric.forEach(i => i.has_insufficient_stock = !hasEnoughStock); } } };
const saveOrUpdateItem = async () => { if (itemForm.value) { const { valid } = await itemForm.value.validate(); if (!valid) { return; } } const requiredQuantity = editedItem.value.quantity || 0; const isStockSufficient = requiredQuantity <= realTimeAvailableStock.value; if (!isDraftMode.value && !isStockSufficient) { stockWarningDetails.fabric = editedItem.value.fabric_type || 'N/A'; stockWarningDetails.needed = requiredQuantity; stockWarningDetails.available = realTimeAvailableStock.value; stockWarningDetails.unit = selectedProductUnit.value; showStockWarningModal.value = true; return; } editedItem.value.has_insufficient_stock = !isStockSufficient; editedItem.value.status = 'design_pending'; const rawItem = toRaw(editedItem.value); const originalFabric = isEditing.value && editedItemIndex.value !== null ? orderItems.value[editedItemIndex.value].fabric_type : null; if (isEditing.value && editedItemIndex.value !== null) { orderItems.value[editedItemIndex.value] = structuredClone(rawItem); } else { orderItems.value.push(structuredClone(rawItem)); } if (isDraftMode.value) { const fabricsToUpdate = new Set<string | null>([editedItem.value.fabric_type, originalFabric].filter(Boolean)); fabricsToUpdate.forEach(fabric => { const itemsOfSameFabric = orderItems.value.filter(i => i.fabric_type === fabric); const totalQuantityForFabric = itemsOfSameFabric.reduce((sum, i) => sum + (i.quantity || 0), 0); const product = gestaoClickProducts.value.find(p => p.nome === fabric); const totalStock = product ? parseFloat(product.estoque as string) : 0; const hasEnoughStock = totalQuantityForFabric <= totalStock; itemsOfSameFabric.forEach(i => i.has_insufficient_stock = !hasEnoughStock); }); } await prepareNewItem(); };
const generateInstallments = () => { paymentDetails.installments = []; const total = totalOrderValue.value; if (total <= 0) return; if (paymentDetails.type === 'vista') { paymentDetails.installments.push({ due_date: paymentDetails.first_due_date, value: total, payment_method_id: paymentDetails.installment_payment_method_id, }); return; } const count = paymentDetails.installments_count; if (count <= 0) return; const valuePerInstallment = parseFloat((total / count).toFixed(2)); let remainder = total - (valuePerInstallment * count); for (let i = 0; i < count; i++) { const dueDate = addDays(new Date(paymentDetails.first_due_date), i * paymentDetails.installments_interval); let value = valuePerInstallment; if (i === 0) { value = parseFloat((value + remainder).toFixed(2)); } paymentDetails.installments.push({ due_date: format(dueDate, 'yyyy-MM-dd'), value: value, payment_method_id: paymentDetails.installment_payment_method_id, }); } };
const handleInstallmentValueChange = (changedIndex: number, newValue: string | number) => { const numericValue = typeof newValue === 'string' ? parseFloat(newValue) : newValue; if (isNaN(numericValue) || paymentDetails.installments.length <= 1) return; const changedValue = numericValue; const total = totalOrderValue.value; let filledTotal = 0; paymentDetails.installments.forEach((inst, index) => { if (index !== changedIndex) { filledTotal += inst.value || 0; } }); const remainingValue = total - changedValue; const remainingInstallments = paymentDetails.installments.length - 1; if (remainingInstallments > 0) { const valuePerInstallment = parseFloat((remainingValue / remainingInstallments).toFixed(2)); let remainder = remainingValue - (valuePerInstallment * remainingInstallments); let firstUnchangedFound = false; paymentDetails.installments.forEach((inst, index) => { if (index !== changedIndex) { let newValue = valuePerInstallment; if (!firstUnchangedFound) { newValue = parseFloat((newValue + remainder).toFixed(2)); firstUnchangedFound = true; } inst.value = newValue; } }); } };
const sanitizeName = (name: string) => name.replace(/\s/g, '_').replace(/[^\w.\-]/g, '');
const syncOrderWithGestaoClick = async () => { if (!orderHeader.customer_id) throw new Error("ID do cliente não encontrado."); const situacao = saleStatuses.value.find(s => s.nome.toLowerCase() === 'em aberto') || saleStatuses.value[0]; if (!situacao) throw new Error("Situação de venda 'em aberto' não encontrada."); const salePayload: any = { codigo: String(currentOrderNumber.value), tipo: "produto", data: new Date().toISOString().split('T')[0], cliente_id: String(orderHeader.customer_id), vendedor_id: String(userStore.profile?.gestao_click_id), situacao_id: String(situacao.id), condicao_pagamento: paymentDetails.type === 'vista' ? 'a_vista' : paymentDetails.type, observacoes: orderHeader.observation || '', produtos: orderItems.value.map(item => { const product = gestaoClickProducts.value.find(p => p.nome === item.fabric_type); if (!product) throw new Error(`Produto ${item.fabric_type} não encontrado no Gestão Click.`); return { produto: { produto_id: product.id, variacao_id: null, quantidade: String(item.quantity || 0), valor_venda: (item.valor_unitario || 0).toFixed(2), detalhes: item.notes || "", tipo_desconto: "R$", desconto_valor: "0.00", desconto_porcentagem: "0.00" } }; }), servicos: orderItems.value.map(item => ({ servico: { servico_id: item.stamp_ref_id!, nome_servico: item.stamp_ref, detalhes: `Estampa para o item ${item.fabric_type}`, quantidade: "1.00", valor_venda: (0.00).toFixed(2), tipo_desconto: "R$", desconto_valor: "0.00", desconto_porcentagem: "0.00" } })), pagamentos: paymentDetails.installments.map(inst => ({ pagamento: { data_vencimento: inst.due_date, valor: inst.value.toFixed(2), forma_pagamento_id: String(inst.payment_method_id), plano_contas_id: "32651675", observacao: `Parcela referente ao pedido do cliente.` } })) }; if (!salePayload.vendedor_id) { throw new Error("ID do vendedor no Gestão Click não encontrado no perfil do usuário."); } await gestaoApi.cadastrarVenda(salePayload); for (const item of orderItems.value) { const product = gestaoClickProducts.value.find(p => p.nome === item.fabric_type); if (product) { const currentStock = parseFloat(product.estoque as string); const quantityUsed = item.quantity || 0; const newStock = currentStock - quantityUsed; await gestaoApi.atualizarEstoqueProduto(product.id, newStock); const stockItem = stockItems.value.find(s => s.gestao_click_id === product.id); if (stockItem) { const { error } = await supabase.rpc('increment', { table_name: 'stock', row_id: stockItem.id, x: -quantityUsed }); if (error) console.error(`Falha ao debitar estoque de ${stockItem.fabric_type} no Supabase:`, error); if (stockItem.low_stock_threshold && newStock < stockItem.low_stock_threshold) { appStore.triggerLowStockAlert(stockItem.fabric_type, newStock); } } } } };

const submitLaunch = async () => {
    if (hasGrossOrderProduct.value) {
      appStore.showSnackbar('Não é possível lançar pedidos com "PEDIDO BRUTO". Salve como rascunho ou remova/altere o item.', 'error');
      return;
    }
    if (orderItems.value.length === 0) { appStore.showSnackbar('Adicione pelo menos um item ao lançamento.', 'error'); return; }
    if(isDraftMode.value) { appStore.showSnackbar('Converta o rascunho para um pedido antes de lançar.', 'warning'); return; }

    isSubmitting.value = true;
    console.log("--- INICIANDO LANÇAMENTO ---");
    try {
        for (const item of orderItems.value) {
            if (item.new_stamp_file) {
                console.log(`Fazendo upload de nova estampa: ${item.stamp_ref}`);
                const newService = await gestaoApi.cadastrarServico(item.stamp_ref);
                const filePath = `${Date.now()}-${sanitizeName(item.new_stamp_file.name)}`;
                const imageUrl = await uploadFile(item.new_stamp_file, 'stamp-library', filePath);
                const { error: stampError } = await supabase.from('stamp_library').insert({ gestao_click_service_id: newService.id, name: item.stamp_ref, image_url: imageUrl, is_approved_for_sale: false, });
                if (stampError) throw stampError;
                item.stamp_ref_id = newService.id;
                item.stamp_image_url = imageUrl;
                console.log(`Estampa ${item.stamp_ref} enviada com sucesso.`);
            }
        }
        if (!currentOrderNumber.value || currentDraftId.value === null) {
            console.log("Nenhum número reservado, buscando e reservando um novo...");
            const { data: newNumber, error: rpcError } = await supabase.rpc('get_and_increment_order_number');
            if (rpcError) throw rpcError;
            currentOrderNumber.value = newNumber;
            console.log(`Número reservado: ${currentOrderNumber.value}`);
        }
        const customerNameToSave = orderHeader.customer_name;
        if (!customerNameToSave) throw new Error("Nome do cliente não encontrado para salvar no Supabase.");

        let proofPublicUrl: string | null = null;
        if (orderHeader.has_down_payment && orderHeader.down_payment_proof_file) {
            console.log("Fazendo upload do comprovante...");
            const file = orderHeader.down_payment_proof_file;
            const baseName = sanitizeName(file.name);
            const filePath = `proofs/${currentOrderNumber.value}-${baseName}`;
            proofPublicUrl = await uploadFile(file, 'proofs', filePath);
            console.log(`Comprovante enviado para: ${proofPublicUrl}`);
        }

        const itemsPayload = orderItems.value.map(item => ({ ...item, total_value_items: (item.quantity || 0) * (item.valor_unitario || 0) }));
        const totalOrderValueCalculated = itemsPayload.reduce((sum, item) => sum + (item.total_value_items || 0), 0);
        const rpcPayload = { p_customer_name: customerNameToSave, p_created_by: userStore.profile?.id, p_store_id: userStore.profile?.store_id, p_has_down_payment: orderHeader.has_down_payment, p_down_payment_proof_url: proofPublicUrl, p_order_items: itemsPayload, p_total_value: totalOrderValueCalculated, };

        console.log("Payload para a função 'create_launch_order':", JSON.stringify(rpcPayload, null, 2));

        const { data: newOrderNumber, error: rpcError } = await supabase.rpc('create_launch_order', rpcPayload);
        if (rpcError) { console.error("ERRO DETALHADO DO SUPABASE RPC:", rpcError); throw rpcError; }

        console.log("Sincronizando com Gestão Click...");
        await syncOrderWithGestaoClick();
        console.log("Sincronização com Gestão Click completa.");

        if (currentDraftId.value) {
            await supabase.from('order_drafts').delete().match({ id: currentDraftId.value });
        }

        const { data: orderData } = await supabase.from('orders').select('id').eq('order_number', newOrderNumber).single();
        if (orderData) createdOrderId.value = orderData.id;
        createdOrderNumber.value = newOrderNumber;
        orderCreatedSuccess.value = true;
        appStore.showSnackbar("Pedido criado e sincronizado com sucesso!", "success");
        clearAutoSave();
    } catch (error: any) {
        console.error('Erro ao criar lançamento:', error);
        let errorMessage = error.message || 'Erro desconhecido.';
        if (errorMessage.includes('Gestão Click') || (error.response && error.response.data)) {
            errorMessage = `Falha na integração com o sistema de gestão: ${errorMessage}`;
        }
        appStore.showSnackbar(`Erro ao criar lançamento: ${errorMessage}`, 'error');
    } finally {
        isSubmitting.value = false;
    }
};

const resetForm = (clearRecovery = true) => {
  Object.assign(orderHeader, { customer_id: null, customer_name: '', has_down_payment: false, down_payment_proof_file: null, observation: '' });
  Object.assign(paymentDetails, { type: 'vista', installments: [], installments_interval: 30, });
  clientSearch.value = '';
  clientList.value = [];
  orderItems.value = [];
  prepareNewItem();
  step.value = 1;
  orderCreatedSuccess.value = false;
  createdOrderId.value = null;
  createdOrderNumber.value = null;
  isDraftMode.value = false; // Garante que um novo formulário comece como um pedido normal
  downPaymentForReceipt.value = null;
  currentDraftId.value = null;
  fetchNextOrderNumber();
  if (clearRecovery) {
    clearAutoSave();
  }
};

const formatCurrency = (value: number | undefined | null) => { if (value === null || value === undefined) return 'R$ 0,00'; return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value); };
const imageToBase64 = (urlOrFile: string | File): Promise<string> => new Promise((resolve, reject) => { const img = new Image(); img.crossOrigin = 'Anonymous'; img.onload = () => { const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height; const ctx = canvas.getContext('2d'); if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png')); } else { reject(new Error('Canvas context not available')); } }; img.onerror = reject; if (typeof urlOrFile === 'string') { img.src = urlOrFile; } else { img.src = URL.createObjectURL(urlOrFile); } });
const addHeader = async (doc: jsPDF) => { const pageWidth = doc.internal.pageSize.width; try { const logoUrl = 'https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Sem_nome_1080_x_800_px_1080_x_500_px_1080_x_400_px_1000_x_380_px_da020cf2-2bb9-4dac-8dd3-4548cfd2e5ae.png?v=1756811713'; const logoBase64 = await imageToBase64(logoUrl); const logoProps = doc.getImageProperties(logoBase64); const logoWidth = 50; const logoHeight = (logoProps.height * logoWidth) / logoProps.width; doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight); } catch (e) { console.error("Não foi possível carregar o logo para o PDF", e); } doc.setFontSize(9); doc.setTextColor(100); doc.text([ "MR JACKY - 20.631.721/0001-07", "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000", "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com" ], pageWidth - 15, 15, { align: 'right' }); doc.setLineWidth(0.5); doc.line(15, 35, pageWidth - 15, 35); };
const addFooter = (doc: jsPDF) => { const pageCount = (doc as any).internal.getNumberOfPages(); const pageWidth = doc.internal.pageSize.width; const pageHeight = doc.internal.pageSize.height; doc.setFontSize(8).setTextColor(150); for (let i = 1; i <= pageCount; i++) { doc.setPage(i); doc.text(`Gerado com MJProcess em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, pageHeight - 10); doc.text(`Página ${i} de ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' }); } };
const addWatermark = (doc: jsPDF) => { const totalPages = (doc as any).internal.getNumberOfPages(); const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); for (let i = 1; i <= totalPages; i++) { doc.setPage(i); doc.setFontSize(72); doc.setTextColor(255, 0, 0); doc.saveGraphicsState(); doc.setGState(new (doc as any).GState({ opacity: 0.15 })); for (let y = 0; y < pageHeight; y += 100) { for (let x = -50; x < pageWidth; x += 180) { doc.text('RECIBO', x, y, { angle: -45, align: 'center' }); } } doc.restoreGraphicsState(); } };

const generateDraftReceiptPdf = async () => {
    if (!downPaymentForReceipt.value || downPaymentForReceipt.value <= 0 || !orderHeader.customer_id) {
        appStore.showSnackbar('Preencha o cliente e o valor do sinal para gerar o recibo.', 'error');
        return;
    }
    isGeneratingPdf.value = true;
    try {
        const selectedClient = clientList.value.find(c => c.id === orderHeader.customer_id) || { nome: 'Cliente Desconhecido', cpf_cnpj: 'Não informado' };
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const margin = 15;

        await addHeader(doc);
        doc.setFontSize(18).setFont('helvetica', 'bold').text(`Recibo de Sinal`, pageWidth / 2, 45, { align: 'center' });

        const startY = 60;
        const receiptText = `Recebemos de ${selectedClient.nome} (CPF/CNPJ: ${selectedClient.cpf_cnpj || 'Não informado'}) a importância de ${formatCurrency(downPaymentForReceipt.value)} como sinal e princípio de pagamento para o Pedido de Venda #${String(currentOrderNumber.value).padStart(4, '0')}.`;

        const maxTextWidth = pageWidth * 0.67;
        const splitText = doc.splitTextToSize(receiptText, maxTextWidth);
        doc.setFontSize(11).setFont('helvetica', 'normal');
        doc.text(splitText, margin, startY);

        const textHeight = doc.getTextDimensions(splitText).h;
        const qrSize = textHeight * 1.3;
        const qrX = margin + maxTextWidth + 5;
        const qrY = startY - 4;
        const qrCodeContent = `Pedido: ${currentOrderNumber.value}\nCliente: ${selectedClient.nome}\nValor Sinal: ${formatCurrency(downPaymentForReceipt.value)}`;
        const qrCodeDataUrl = await QRCode.toDataURL(qrCodeContent, { width: qrSize * 5 });
        doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        doc.setFontSize(7).setTextColor(100);
        doc.text('Dados do Pedido', qrX + qrSize / 2, qrY + qrSize + 4, { align: 'center' });
        let nextElementY = startY + textHeight + 10;

        const itemsForPdf = orderItems.value.filter(item => item.fabric_type !== GROSS_ORDER_PRODUCT_NAME);

        let finalY;

        if (itemsForPdf.length > 0) {
            const orderItemsForReceipt = itemsForPdf.map(item => [
                item.fabric_type || 'N/A',
                item.stamp_ref || 'N/A',
                `${item.quantity || 0}${item.unit_of_measure}`,
                formatCurrency(item.valor_unitario)
            ]);
            doc.setFontSize(12).setFont('helvetica', 'bold').text('Itens do Pedido (Referência)', margin, nextElementY);
            autoTable(doc, {
                startY: nextElementY + 5,
                head: [['Base', 'Estampa', 'Quantidade', 'Valor Unit.']],
                body: orderItemsForReceipt,
                theme: 'grid',
            });
            finalY = (doc as any).lastAutoTable.finalY + 20;
        } else {
            finalY = nextElementY + 10;
        }

        doc.setFontSize(10).text(`Tiete, ${format(new Date(), 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR })}.`, margin, finalY);

        const signatureY = doc.internal.pageSize.height - 40;
        doc.setLineWidth(0.5).setDrawColor(100, 100, 100).line(margin + 20, signatureY, pageWidth - margin - 20, signatureY);
        doc.setFontSize(10).setTextColor(100).text(selectedClient.nome, pageWidth / 2, signatureY + 5, { align: 'center' });
        doc.setFontSize(8).setTextColor(150).text('Assinatura do Cliente', pageWidth / 2, signatureY + 9, { align: 'center' });

        addWatermark(doc);
        addFooter(doc);

        const pdfFileName = `Recibo_Sinal_${String(currentOrderNumber.value).padStart(4, '0')}_${sanitizeName(selectedClient.nome)}.pdf`;
        doc.save(pdfFileName);
        appStore.showSnackbar('Recibo de sinal gerado com sucesso!', 'success');

    } catch (error: any) {
        console.error("Erro ao gerar PDF do recibo:", error);
        appStore.showSnackbar(`Erro ao gerar PDF do recibo: ${error.message}`, 'error');
    } finally {
        isGeneratingPdf.value = false;
    }
};

const generateQuoteAndUploadPdf = async () => { isGeneratingPdf.value = true; try { const selectedClient = clientList.value.find(c => c.id === orderHeader.customer_id) || { nome: 'Cliente Desconhecido' }; const itemDetailsWithPrice = orderItems.value.map(item => { const price = item.valor_unitario || 0; const quantityForCalc = item.quantity || 0; const total = quantityForCalc * price; return { base: item.fabric_type, estampa: item.stamp_ref, quantidade: `${item.quantity}${item.unit_of_measure}`, rendimento: item.unit_of_measure === 'kg' ? `~ ${item.quantity_meters?.toFixed(2)}m` : '-', valorUnit: formatCurrency(price), valorTotal: formatCurrency(total) }; }); const grandTotal = itemDetailsWithPrice.reduce((sum, item) => sum + parseFloat(item.valorTotal.replace('R$', '').replace(/\./g, '').replace(',', '.')), 0); const doc = new jsPDF(); await addHeader(doc); doc.setFontSize(18).setFont('helvetica', 'bold').text(`Orçamento #${String(createdOrderNumber.value).padStart(4, '0')}`, 15, 45); autoTable(doc, { startY: 50, head: [['CLIENTE', 'VENDEDOR', 'DATA DE EMISSÃO']], body: [[selectedClient.nome, userStore.profile?.full_name || 'N/A', format(new Date(), 'dd/MM/yyyy', { locale: ptBR })]], theme: 'striped', }); autoTable(doc, { startY: (doc as any).lastAutoTable.finalY + 10, head: [['Base', 'Estampa', 'Quantidade', 'Rendimento', 'Valor Unit.', 'Valor Total']], body: itemDetailsWithPrice.map(i => [i.base, i.estampa, i.quantidade, i.rendimento, i.valorUnit, i.valorTotal]), theme: 'grid', foot: [['', '', '', '', 'Total do Pedido:', formatCurrency(grandTotal)]], footStyles: { fontStyle: 'bold', fontSize: 11, halign: 'right' }, didDrawPage: (data) => { const signatureY = doc.internal.pageSize.height - 40; doc.setLineWidth(0.5).setDrawColor(100, 100, 100).line(40, signatureY, doc.internal.pageSize.width - 40, signatureY); doc.setFontSize(10).setTextColor(100).text(`Assinatura do Cliente: ${selectedClient.nome}`, doc.internal.pageSize.width / 2, signatureY + 5, { align: 'center' }); } }); addFooter(doc); const pdfBlob = doc.output('blob'); const pdfFileName = `Orcamento_${String(createdOrderNumber.value).padStart(4, '0')}_${sanitizeName(selectedClient.nome)}.pdf`; const url = URL.createObjectURL(pdfBlob); const a = document.createElement('a'); a.href = url; a.download = pdfFileName; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); const pdfPath = `sales_orders/${pdfFileName}`; const publicUrl = await uploadFile(pdfBlob, 'sales-orders', pdfPath); const { error: updateError } = await supabase.from('orders').update({ sales_order_pdf_url: publicUrl }).eq('id', createdOrderId.value); if (updateError) throw updateError; appStore.showSnackbar('Orçamento em PDF gerado, baixado e anexado com sucesso!', 'success'); } catch (error: any) { console.error("Erro ao gerar PDF do orçamento:", error); appStore.showSnackbar(`Erro ao gerar PDF: ${error.message}`, 'error'); } finally { isGeneratingPdf.value = false; } };

onMounted(() => {
  fetchNextOrderNumber();
  fetchInitialData();
  if (localStorage.getItem(AUTO_RECOVERY_KEY)) {
    showDraftAlert.value = true;
  }
});

onBeforeUnmount(() => { clearTimeout(autoSaveTimeout); });

</script>

<style scoped lang="scss">
.modern-draft-alert {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
  border-left-width: 4px !important;
  border-radius: 8px !important;
  &.v-alert {
    :deep(.v-alert__prepend) {
      align-self: center;
      margin-right: 16px;
    }
  }
}

.blinking-icon { animation: blink 1.5s infinite ease-in-out; }
@keyframes blink { 50% { opacity: 0.5; } }
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
.item-list-card, .item-form-card {
  background-color: rgba(255, 255, 255, 0.05);
}
.stock-alert-card {
  background: linear-gradient(145deg, #CF6679, #b00020);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
