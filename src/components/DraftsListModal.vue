<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="700px" persistent>
    <v-card class="glassmorphism-card-dialog">
      <v-card-title class="dialog-header">
        <span class="text-h5 font-weight-bold">Meus Rascunhos</span>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-list class="bg-transparent">
          <div v-if="drafts.length === 0" class="text-center text-grey py-8">
            <v-icon size="48" class="mb-2">mdi-file-hidden</v-icon>
            <p>Nenhum rascunho salvo.</p>
          </div>

          <template v-for="(draft, index) in drafts" :key="draft.id">
            <v-list-item>
              <template v-slot:prepend>
                <v-icon color="secondary">mdi-file-edit-outline</v-icon>
              </template>

              <v-list-item-title class="font-weight-bold">{{ draft.name }}</v-list-item-title>
              <v-list-item-subtitle>
                Salvo em: {{ formatRelativeDate(draft.createdAt) }}
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-btn color="primary" variant="tonal" class="mr-2" @click="$emit('load', draft.id)">
                  <v-icon start>mdi-file-import-outline</v-icon>
                  Carregar
                </v-btn>
                <v-btn icon="mdi-delete-outline" variant="text" color="error" @click="$emit('delete', draft.id)"></v-btn>
              </template>
            </v-list-item>
            <v-divider v-if="index < drafts.length - 1"></v-divider>
          </template>
        </v-list>
      </v-card-text>

      <v-card-actions class="dialog-footer">
        <v-spacer></v-spacer>
        <v-btn text @click="$emit('close')" size="large">Fechar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Draft {
  id: number;
  name: string;
  createdAt: string;
  // ... outras propriedades
}

defineProps<{
  show: boolean;
  drafts: Draft[];
}>();

defineEmits(['close', 'load', 'delete']);

const formatRelativeDate = (dateString: string) => {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
};
</script>

<style scoped lang="scss">
.glassmorphism-card-dialog {
  backdrop-filter: blur(25px) saturate(150%);
  -webkit-backdrop-filter: blur(25px) saturate(150%);
  background-color: rgba(30, 30, 35, 0.85) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.dialog-header, .dialog-footer {
  border-color: rgba(255, 255, 255, 0.1) !important;
}
</style>
