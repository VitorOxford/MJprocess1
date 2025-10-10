<template>
  <div class="dev-request-page">
    <div class="background-shapes"></div>
    <v-container>
      <v-card class="glass-card pa-4 pa-md-8">
        <header class="card-header d-flex align-center mb-4">
          <v-icon class="header-icon mr-4" size="36">mdi-flask-outline</v-icon>
          <div>
            <h1 class="card-title">Central de Desenvolvimento</h1>
            <p class="card-subtitle">Crie e agrupe solicitações de estampas para um ou mais clientes em um único envio.</p>
          </div>
        </header>

        <v-divider class="divider-line my-6"></v-divider>

        <v-form ref="form" v-model="valid">
          <transition-group name="list" tag="div">
            <div v-for="(item, index) in requestItems" :key="item.id" class="item-wrapper mb-6">
               <v-card class="item-card pa-5" elevation="0">
                 <v-btn
                    v-if="requestItems.length > 1"
                    icon="mdi-close"
                    size="small"
                    variant="text"
                    color="grey"
                    @click="removeItem(index)"
                    class="close-button"
                  ></v-btn>

                  <v-autocomplete
                    v-model="item.customer"
                    v-model:search="item.clientSearch"
                    :items="clientList"
                    item-title="nome"
                    item-value="id"
                    return-object
                    label="Selecione ou busque um cliente"
                    variant="outlined"
                    prepend-inner-icon="mdi-account-search"
                    :rules="[rules.requiredObject]"
                    class="mb-4"
                    clearable
                    no-filter
                    :loading="isSearchingClients"
                  >
                    <template v-slot:append>
                      <v-btn @click.stop="openNewCustomerModal" color="primary" variant="text">Novo Cliente</v-btn>
                    </template>
                     <template v-slot:no-data>
                      <v-list-item
                        title="Nenhum cliente encontrado."
                        subtitle="Clique em 'Novo Cliente' para cadastrar."
                      ></v-list-item>
                    </template>
                  </v-autocomplete>
                  <v-file-input
                    v-model="item.files"
                    label="Anexos de referência"
                    multiple
                    variant="outlined"
                    prepend-icon=""
                    prepend-inner-icon="mdi-paperclip"
                    chips
                    counter
                  ></v-file-input>

                  <v-textarea
                    v-model="item.notes"
                    label="Observações da estampa"
                    variant="outlined"
                    rows="3"
                    class="mt-4"
                    prepend-inner-icon="mdi-text-long"
                  ></v-textarea>
               </v-card>
            </div>
          </transition-group>

          <v-btn @click="addItem" color="white" variant="text" class="mb-8 ml-n2">
            <v-icon left>mdi-plus</v-icon> Adicionar outra solicitação
          </v-btn>

          <v-textarea
            v-model="generalNotes"
            label="Observações Gerais do Envio"
            placeholder="Observações que se aplicam a todas as solicitações acima."
            variant="outlined"
            rows="2"
            prepend-inner-icon="mdi-comment-text-multiple"
          ></v-textarea>

          <v-card-actions class="mt-8 pa-0">
            <v-spacer></v-spacer>
            <v-btn
              :disabled="!valid || loading"
              :loading="loading"
              @click="submitRequest"
              size="x-large"
              class="submit-button"
              variant="elevated"
            >
              <v-icon left>mdi-rocket-launch-outline</v-icon>
              Enviar para Design
            </v-btn>
          </v-card-actions>
        </v-form>
      </v-card>

      <v-dialog v-model="showSuccessModal" max-width="500px" persistent>
        <v-card class="text-center pa-8">
          <v-icon size="80" color="success" class="mb-4">mdi-check-decagram</v-icon>
          <h2 class="text-h5 mb-2">Enviado com Sucesso!</h2>
          <p class="body-1">A solicitação de desenvolvimento <strong>{{ successfulDevCode }}</strong> foi enviada.</p>
          <v-card-actions class="justify-center mt-6">
            <v-btn color="primary" variant="tonal" @click="startNewRequest">Criar Nova Solicitação</v-btn>
            <v-btn color="grey-darken-1" variant="text" @click="goToKanban">Ver no Kanban</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

    </v-container>

    <ClientFormModal
      :show="isNewCustomerModalOpen"
      @close="isNewCustomerModalOpen = false"
      @client-created="handleNewCustomer"
    />
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { useRouter } from 'vue-router';
import ClientFormModal from '@/components/ClientFormModal.vue';
import { gestaoApi } from '@/api/gestaoClick.ts'; // CORREÇÃO 1

const form = ref(null);
const valid = ref(false);
const loading = ref(false);
const userStore = useUserStore();
const router = useRouter();
const isNewCustomerModalOpen = ref(false);
const showSuccessModal = ref(false);
const successfulDevCode = ref('');

// --- INÍCIO DA CORREÇÃO 1: Lógica de Busca de Clientes ---
const clientList = ref([]);
const isSearchingClients = ref(false);
let searchTimeout = null;

const generalNotes = ref('');
const requestItems = ref([{ id: Date.now(), customer: null, notes: '', files: [], clientSearch: '' }]);

watch(() => requestItems.value.map(item => item.clientSearch), async (searches) => {
  const activeSearch = searches.find(s => s && s.length > 2);
  if (activeSearch) {
    isSearchingClients.value = true;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      const apiClients = await gestaoApi.buscarClientes(activeSearch);
      // Combina com clientes já existentes na lista para não perder seleções
      const existingIds = new Set(clientList.value.map(c => c.id));
      const newClients = apiClients.filter(c => !existingIds.has(c.id));
      clientList.value = [...clientList.value, ...newClients];
      isSearchingClients.value = false;
    }, 500);
  } else {
    isSearchingClients.value = false;
  }
}, { deep: true });
// --- FIM DA CORREÇÃO 1 ---


const rules = {
  required: value => !!value || 'Campo obrigatório.',
  requiredObject: value => (!!value && typeof value === 'object' && Object.keys(value).length > 0) || 'Cliente é obrigatório.',
};

// Funções para gerenciar clientes
const fetchCustomers = async () => {
  const { data, error } = await supabase.from('customers').select('id, name').order('name');
  if (error) console.error('Error fetching customers:', error);
  else clientList.value = data.map(c => ({ id: c.id, nome: c.name })); // Garante o formato {id, nome}
};

const openNewCustomerModal = () => {
  isNewCustomerModalOpen.value = true;
};

const handleNewCustomer = (newCustomer) => {
  clientList.value.unshift(newCustomer);
  const lastItem = requestItems.value[requestItems.value.length - 1];
  if (!lastItem.customer) {
    lastItem.customer = newCustomer;
  }
  isNewCustomerModalOpen.value = false; // Garante que o modal feche
};

// Funções para gerenciar itens da lista
const addItem = () => {
  requestItems.value.push({ id: Date.now(), customer: null, notes: '', files: [], clientSearch: '' });
};

const removeItem = (index) => {
  requestItems.value.splice(index, 1);
};

// Função para upload de arquivos
const uploadFiles = async (item, devCode) => {
    if (!item.files || item.files.length === 0) return [];
    const uploadPromises = item.files.map(file => {
        const fileExt = file.name.split('.').pop();
        const safeCustomerName = item.customer.nome.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${devCode}/${safeCustomerName}_${Date.now()}.${fileExt}`;
        return supabase.storage.from('arts').upload(fileName, file);
    });
    const results = await Promise.all(uploadPromises);
    const urls = [];
    for (const result of results) {
        if (result.error) {
            console.error('Error uploading file:', result.error);
        } else {
            const { data } = supabase.storage.from('arts').getPublicUrl(result.data.path);
            urls.push(data.publicUrl);
        }
    }
    return urls;
}

// Submissão do formulário
const submitRequest = async () => {
  const { valid: isValid } = await form.value.validate();
  if (!isValid) return;

  loading.value = true;

  try {
    const tempDevCode = `DEV-TEMP-${Date.now()}`;
    const designItemsPayload = [];
    for (const item of requestItems.value) {
      const attachmentUrls = await uploadFiles(item, tempDevCode);
      designItemsPayload.push({
        customer_id: item.customer.id,
        customer_name: item.customer.nome,
        notes: item.notes,
        attachments: attachmentUrls,
      });
    }
    const { data: devCode, error } = await supabase.rpc('create_design_request', {
      p_general_notes: generalNotes.value,
      p_store_id: userStore.profile?.store_id,
      p_design_items: JSON.stringify(designItemsPayload),
      p_created_by: userStore.profile?.id,
    });
    if (error) throw error;
    successfulDevCode.value = devCode;
    showSuccessModal.value = true;
  } catch (error) {
    console.error('Error submitting development request:', error);
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
    requestItems.value = [{ id: Date.now(), customer: null, notes: '', files: [], clientSearch: '' }];
    generalNotes.value = '';
    if (form.value) form.value.resetValidation();
}

const startNewRequest = () => {
    showSuccessModal.value = false;
    resetForm();
}

const goToKanban = () => {
    router.push('/design/kanban');
}

onMounted(fetchCustomers);
</script>

<style scoped>
/* Estilos permanecem os mesmos da versão anterior */
.dev-request-page {
  background-color: #12121200;
  min-height: 100vh;
  padding: 2rem 0;
  position: relative;
  overflow: hidden;
}
.background-shapes {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    radial-gradient(circle at 15% 50%, rgba(136, 77, 255, 0.1), transparent 30%),
    radial-gradient(circle at 85% 30%, rgba(0, 150, 255, 0.1), transparent 30%);
  z-index: 0;
}
.v-container {
  position: relative;
  z-index: 1;
}
.glass-card {
  background: rgba(28, 28, 30, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
.header-icon {
  background: linear-gradient(135deg, #884dff, #0096ff);
  padding: 12px;
  border-radius: 50%;
  color: white;
}
.card-title { color: #FFFFFF; font-size: 2rem; font-weight: 600; }
.card-subtitle { color: #A0A0A0; font-size: 1rem; }
.divider-line { border-color: rgba(255, 255, 255, 0.1) !important; }
.item-wrapper { position: relative; }
.item-card {
   background-color: rgba(44, 44, 46, 0.247);
   border: 1px solid rgba(255, 255, 255, 0.08);
   border-radius: 12px;
}
.close-button { position: absolute; top: 12px; right: 12px; z-index: 10; }
.submit-button {
  background: #58a52bab;
  color: #ffffffc2;
  font-weight: bold;
  letter-spacing: 0.5px;
  transition: all 0.2s ease-in-out;
}
.submit-button:hover {
  background: #68cc2e;
  transform: scale(1.02);
}
.list-enter-active, .list-leave-active { transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1); }
.list-enter-from, .list-leave-to { opacity: 0; transform: scale(0.95) translateY(20px); }
</style>
