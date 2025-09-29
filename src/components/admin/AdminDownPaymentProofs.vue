<template>
  <v-container fluid>
    <v-toolbar color="transparent">
      <v-toolbar-title class="font-weight-bold">Comprovantes de Entrada (Sinais)</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field
        v-model="search"
        variant="solo-filled"
        flat
        density="compact"
        label="Buscar por cliente ou vendedor..."
        prepend-inner-icon="mdi-magnify"
        hide-details
        clearable
        style="max-width: 350px;"
      ></v-text-field>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4 text-medium-emphasis">Buscando comprovantes...</p>
    </div>

    <v-alert v-else-if="error" type="error" prominent class="ma-4">
      {{ error }}
    </v-alert>

    <v-row v-else-if="filteredProofs.length > 0" class="mt-4">
      <v-col
        v-for="proof in filteredProofs"
        :key="proof.order_id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <v-card class="proof-card" variant="flat">
          <div class="proof-preview-container">
            <v-img
              v-if="isImage(proof.down_payment_proof_url)"
              :src="proof.down_payment_proof_url"
              height="200"
              cover
              class="proof-image"
              @click="openImageModal(proof.down_payment_proof_url, proof.customer_name)"
            >
              <template v-slot:placeholder>
                <div class="d-flex align-center justify-center fill-height">
                  <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
                </div>
              </template>
              <div class="image-overlay"></div>
            </v-img>

            <div v-else class="file-preview">
                <v-icon size="80" color="rgba(255, 255, 255, 0.7)">{{ getFileIcon(proof.down_payment_proof_url) }}</v-icon>
            </div>
          </div>

          <v-card-title class="pt-3 pb-1 font-weight-bold">
            {{ proof.customer_name }}
          </v-card-title>
          <v-card-subtitle>
            Pedido #{{ String(proof.order_number).padStart(4, '0') }}
          </v-card-subtitle>

          <v-card-text class="py-2">
            <div class="info-line">
              <v-icon size="small" class="mr-2">mdi-account-tie-outline</v-icon>
              <span>{{ proof.creator_name }}</span>
            </div>
            <div class="info-line">
              <v-icon size="small" class="mr-2">mdi-calendar-month-outline</v-icon>
              <span>{{ formatDate(proof.created_at) }}</span>
            </div>
          </v-card-text>

          <v-card-actions class="pa-3">
            <v-btn
              :href="proof.down_payment_proof_url"
              target="_blank"
              color="primary"
              variant="tonal"
              block
            >
              <v-icon start>mdi-file-download-outline</v-icon>
              Ver / Baixar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

     <div v-else class="text-center py-16 text-grey">
        <v-icon size="64" class="mb-4">mdi-receipt-text-remove-outline</v-icon>
        <p class="text-h6">Nenhum comprovante encontrado</p>
        <p>Não há comprovantes para os filtros atuais.</p>
    </div>

    <ImageModal
      :show="showModal"
      :image-url="selectedImageUrl"
      :file-name="selectedImageName"
      @close="showModal = false"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ImageModal from '@/components/ImageModal.vue';

type Proof = {
  order_id: string;
  order_number: number;
  customer_name: string;
  creator_name: string;
  created_at: string;
  down_payment_proof_url: string;
};

const loading = ref(true);
const search = ref('');
const proofs = ref<Proof[]>([]);
const error = ref<string | null>(null);

const showModal = ref(false);
const selectedImageUrl = ref('');
const selectedImageName = ref('');

// --- INÍCIO DAS CORREÇÕES ---

// Função para verificar se a URL é de uma imagem
const isImage = (url: string) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
};

// Função para retornar um ícone apropriado para o tipo de arquivo
const getFileIcon = (url: string) => {
    if (/\.pdf$/i.test(url)) return 'mdi-file-pdf-box';
    return 'mdi-file-document-outline';
};

// --- FIM DAS CORREÇÕES ---


const filteredProofs = computed(() => {
    if (!search.value) return proofs.value;
    const query = search.value.toLowerCase();
    return proofs.value.filter(p =>
        p.customer_name.toLowerCase().includes(query) ||
        p.creator_name.toLowerCase().includes(query)
    );
});

const openImageModal = (url: string, name: string) => {
  selectedImageUrl.value = url;
  selectedImageName.value = `Comprovante de ${name}`;
  showModal.value = true;
};

const fetchProofs = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { data, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, created_at, down_payment_proof_url, creator:created_by(full_name)')
      .not('down_payment_proof_url', 'is', null)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    proofs.value = data.map((order: any) => ({
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        creator_name: order.creator?.full_name || 'N/A',
        created_at: order.created_at,
        down_payment_proof_url: order.down_payment_proof_url,
    }));
  } catch (err: any) {
    console.error('Erro ao buscar comprovantes:', err);
    error.value = `Não foi possível carregar os comprovantes: ${err.message}`;
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
};

onMounted(fetchProofs);
</script>

<style scoped lang="scss">
.proof-card {
  border-radius: 16px;
  background-color: rgba(30, 30, 35, 0.7);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  overflow: hidden;

  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
    border-color: rgba(var(--v-theme-primary), 0.4);
  }
}

.proof-preview-container {
    height: 200px;
    width: 100%;
}

.proof-image {
  cursor: pointer;
  position: relative;
}

.file-preview {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0,0,0,0.2);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6) 10%, transparent 50%);
  transition: background 0.3s ease;
}

.proof-card:hover .image-overlay {
  background: linear-gradient(to top, rgba(0,0,0,0.8) 10%, transparent 70%);
}

.info-line {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: #E0E0E0;
  margin-top: 4px;

  .v-icon {
    color: rgba(var(--v-theme-primary-rgb), 0.7);
  }
}
</style>
