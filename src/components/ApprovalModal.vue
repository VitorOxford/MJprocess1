<template>
  <v-dialog :model-value="show" @update:model-value="close" max-width="600px" persistent>
    <v-card class="glassmorphism-card">
      <v-card-title class="dialog-header">
        <span class="text-h5">Finalizar e Enviar para Aprovação</span>
      </v-card-title>
      <v-divider></v-divider>

      <v-card-text v-if="item" class="dialog-content">
        <div class="mb-4">
          <p class="text-caption text-medium-emphasis">Cliente</p>
          <p class="text-body-1 font-weight-bold">{{ item.order.customer_name }}</p>
        </div>
        <div class="mb-4">
          <p class="text-caption text-medium-emphasis">Referência da Estampa</p>
          <p class="text-body-1">{{ item.stamp_ref }}</p>
        </div>
        <div class="mb-4">
          <p class="text-caption text-medium-emphasis">Arte Final do Designer</p>
          <v-img
            v-if="item.final_art_url"
            :src="item.final_art_url"
            class="art-preview-image"
            max-height="300"
            @click="openImage(item.final_art_url)"
          ></v-img>
           <p v-else class="text-body-2 text-red">Nenhuma arte final anexada.</p>
        </div>
        <div>
          <p class="text-caption text-medium-emphasis">Observações do Vendedor (Opcional)</p>
          <v-textarea
            v-model="sellerNotes"
            placeholder="Adicione observações para o cliente, se necessário."
            variant="outlined"
            rows="2"
            hide-details
          ></v-textarea>
        </div>
      </v-card-text> <v-card-actions class="dialog-actions">
        <v-btn color="error" variant="text" @click="openChangesModal">
          Solicitar Alteração
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="close">Cancelar</v-btn>
        <v-btn
          color="success"
          variant="elevated"
          @click="approve"
          :loading="loading"
        >
          Aprovar e Liberar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <ImageModal :show="showImageModal" :image-url="imageUrl" @close="showImageModal = false"/>
  <RequestChangesModal :show="showRequestChangesModal" :item="item" @close="showRequestChangesModal = false" @sent="handleChangesSent" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import ImageModal from '@/components/ImageModal.vue';
import RequestChangesModal from '@/components/RequestChangesModal.vue';

// ---- PROPS E EMITS ----
const props = defineProps({
  show: Boolean,
  item: {
    type: Object,
    default: null
  },
});
const emit = defineEmits(['close', 'approved', 'changes-requested']);

// ---- ESTADO ----
const userStore = useUserStore();
const loading = ref(false);
const sellerNotes = ref('');
const showImageModal = ref(false);
const imageUrl = ref('');
const showRequestChangesModal = ref(false);


// ---- MÉTODOS ----
const close = () => {
  sellerNotes.value = '';
  emit('close');
};

const approve = async () => {
  if (!props.item || !userStore.profile) return;
  loading.value = true;
  try {
    const { error } = await supabase.rpc('approve_and_schedule_item', {
      p_item_id: props.item.id,
      p_seller_id: userStore.profile.id,
      p_seller_notes: sellerNotes.value
    });
    if (error) throw error;
    emit('approved');
    close();
  } catch (error: any) {
    console.error("Erro ao aprovar item:", error);
    alert(`Falha ao aprovar: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

const openChangesModal = () => {
  showRequestChangesModal.value = true;
};

const handleChangesSent = () => {
  emit('changes-requested');
  close();
}

const openImage = (url: string) => {
  imageUrl.value = url;
  showImageModal.value = true;
};
</script>

<style scoped>
.glassmorphism-card {
  background: rgba(40, 40, 40, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px !important;
}
.dialog-header {
  padding: 16px 24px;
}
.dialog-content {
  padding: 24px;
}
.art-preview-image {
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.dialog-actions {
  padding: 16px 24px;
  background-color: rgba(0,0,0,0.2);
}
</style>
