<template>
  <v-dialog :model-value="show" @update:model-value="onClose" max-width="1100px" persistent scrollable>
    <v-card class="dev-modal-card">
      <v-toolbar color="transparent" class="pr-2">
        <v-toolbar-title class="d-flex align-center">
          <v-icon color="primary" class="mr-3">mdi-clipboard-text-search-outline</v-icon>
          <span class="font-weight-bold">Detalhes do Desenvolvimento</span>
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-chip v-if="request.dev_code" color="primary" variant="tonal" class="mr-4">{{ request.dev_code }}</v-chip>
        <v-btn icon="mdi-close" @click="onClose"></v-btn>
      </v-toolbar>
      <v-divider></v-divider>

      <v-card-text class="pa-0">
        <v-row no-gutters>
          <v-col cols="12" md="7" class="pa-6 custom-scrollbar" style="max-height: 70vh; border-right: 1px solid #424242;">
            <h3 class="section-title">Solicitação Original</h3>
            <div v-for="(item, index) in request.design_items" :key="index" class="item-details-card mb-4">
              <div class="d-flex align-center mb-3">
                <v-icon start>mdi-account-circle-outline</v-icon>
                <span class="font-weight-bold">{{ item.customer_name }}</span>
              </div>
              <p v-if="item.notes" class="text-body-2 mb-3">{{ item.notes }}</p>
              <p v-else class="text-caption text-medium-emphasis mb-3">Nenhuma observação específica para este item.</p>

              <div v-if="item.attachments && item.attachments.length > 0">
                <div class="text-caption text-medium-emphasis mb-2">Anexos de Referência:</div>
                <div class="image-gallery">
                  <v-card v-for="(url, i) in item.attachments" :key="i" class="gallery-item" flat @click="openImage(url)">
                    <v-img :src="url" aspect-ratio="1" cover class="rounded">
                      <template v-slot:placeholder><v-skeleton-loader type="image"></v-skeleton-loader></template>
                    </v-img>
                    <div class="image-overlay"><v-icon>mdi-magnify-plus-outline</v-icon></div>
                  </v-card>
                </div>
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="5" class="right-column pa-6">
            <h3 class="section-title">Finalizar Desenvolvimento</h3>
            <v-form ref="form">
              <v-text-field
                v-model="newStampName"
                label="Nome da Nova Estampa"
                variant="solo-filled" flat
                :rules="[rules.required]"
                class="mb-4"
              ></v-text-field>

              <v-file-input
                label="Anexar Arte Final (PNG, JPG)"
                variant="solo-filled" flat
                accept="image/png, image/jpeg"
                :rules="[rules.fileRequired]"
                prepend-icon=""
                prepend-inner-icon="mdi-file-upload-outline"
                clearable
                @change="handleFileChange"
              ></v-file-input>
            </v-form>

            <v-card v-if="artPreviewUrl" class="mt-4 art-preview-card" flat>
              <v-img :src="artPreviewUrl" aspect-ratio="1.6" cover class="rounded"></v-img>
              <v-card-title class="text-caption pa-2">Pré-visualização</v-card-title>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider></v-divider>
      <v-card-actions class="pa-4 bg-grey-darken-4">
        <span class="text-caption text-medium-emphasis">A estampa será cadastrada e enviada para o vendedor.</span>
        <v-spacer></v-spacer>
        <v-btn
          @click="submitDevelopment" color="success" variant="elevated" size="large"
          :loading="loading" :disabled="!isFormValid"
        >
          <v-icon left>mdi-check-decagram-outline</v-icon>
          Concluir e Enviar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
  <ImageModal :show="showImageModal" :image-url="selectedImageUrl" @close="showImageModal = false" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { supabase } from '@/api/supabase';
import { gestaoApi } from '@/api/gestaoClick';
import { useUserStore } from '@/stores/user';
import ImageModal from '@/components/ImageModal.vue';
import type { VForm } from 'vuetify/components';

const props = defineProps({
  show: Boolean,
  request: { type: Object, default: () => ({ design_items: [] }) }
});
const emit = defineEmits(['close', 'completed']);

const userStore = useUserStore();
const form = ref<VForm | null>(null);
const newStampName = ref('');
const finalArtFile = ref<File | null>(null);
const artPreviewUrl = ref('');
const loading = ref(false);
const showImageModal = ref(false);
const selectedImageUrl = ref('');

const isFormValid = computed(() => {
  return !!newStampName.value && !!finalArtFile.value;
});

const rules = {
  required: (v: string) => !!v || 'Campo obrigatório.',
  fileRequired: (v: any) => !!finalArtFile.value || 'Arquivo obrigatório.',
};

watch(() => props.show, (newValue) => {
  if (newValue && props.request.dev_code) {
    const firstCustomer = props.request.design_items[0]?.customer_name || 'Cliente';
    newStampName.value = `${firstCustomer} - ${props.request.dev_code}`;
  }
});

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files ? target.files[0] : null;
  finalArtFile.value = file;

  if (artPreviewUrl.value) {
    URL.revokeObjectURL(artPreviewUrl.value);
  }
  if (file) {
    artPreviewUrl.value = URL.createObjectURL(file);
  } else {
    artPreviewUrl.value = '';
  }
};

const openImage = (url: string) => {
  selectedImageUrl.value = url;
  showImageModal.value = true;
};

const onClose = () => {
  form.value?.reset();
  form.value?.resetValidation();
  finalArtFile.value = null;
  artPreviewUrl.value = '';
  newStampName.value = '';
  emit('close');
};

const submitDevelopment = async () => {
  const { valid } = await form.value!.validate();
  if (!valid || !isFormValid.value || !userStore.profile) return;

  loading.value = true;

  try {
    const file = finalArtFile.value;
    if (!file) throw new Error("Arquivo não encontrado.");

    // 1. Upload da arte final
    const fileExt = file.name.split('.').pop();
    const filePath = `stamp-library/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('arts').upload(filePath, file);
    if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);
    const { data: { publicUrl: finalArtUrl } } = supabase.storage.from('arts').getPublicUrl(filePath);

    // 2. Cadastrar no GestãoClick
    const newService = await gestaoApi.cadastrarServico(newStampName.value);
    if (!newService || newService.sucesso === false) {
      throw new Error(newService?.erros?.[0] || 'Falha ao cadastrar no GestãoClick');
    }

    // ==================== INÍCIO DA CORREÇÃO ====================
    // 3. Cadastrar na tabela local `stamp_library` com as colunas corretas
    const { data: newStamp, error: stampError } = await supabase
      .from('stamp_library')
      .insert({
        name: newStampName.value,
        image_url: finalArtUrl,
        is_approved_for_sale: false, // O vendedor irá aprovar
        gestao_click_service_id: newService.id.toString() // ID do GestãoClick
      })
      .select()
      .single();
    if (stampError) throw stampError;
    // ==================== FIM DA CORREÇÃO ====================

    // 4. Atualizar o `design_request` original
    const { error: updateError } = await supabase
      .from('design_requests')
      .update({
        status: 'pending_approval',
        final_art_url: finalArtUrl,
        new_stamp_id: newStamp.id
      })
      .eq('id', props.request.id);
    if (updateError) throw updateError;

    // 5. Notificar o vendedor
    const { error: notifyError } = await supabase
      .from('notifications')
      .insert({
        recipient_id: props.request.created_by,
        sender_id: userStore.profile.id,
        content: `O desenvolvimento "${newStampName.value}" está pronto para sua avaliação.`,
        redirect_url: '/approvals'
      });
    if (notifyError) console.error("Falha ao criar notificação:", notifyError);

    emit('completed');
    onClose();

  } catch (error: any) {
    console.error("Erro completo ao submeter desenvolvimento:", error);
    alert(`Ocorreu um erro: ${error.message}`);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.dev-modal-card { border-radius: 16px; background-color: #1E1E1E; }
.right-column { background-color: #252525; border-left: 1px solid #424242;}
.section-title { font-size: 1.1rem; font-weight: 500; margin-bottom: 1.25rem; color: #E0E0E0; }
.item-details-card { background-color: #2F2F2F; padding: 1rem; border-radius: 8px; border: 1px solid #424242; }
.image-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; }
.gallery-item { cursor: pointer; position: relative; }
.image-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); opacity: 0; transition: opacity 0.2s ease; display: flex; justify-content: center; align-items: center; }
.gallery-item:hover .image-overlay { opacity: 1; }
.art-preview-card { border: 1px solid #424242; }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.2); border-radius: 3px; }
</style>
