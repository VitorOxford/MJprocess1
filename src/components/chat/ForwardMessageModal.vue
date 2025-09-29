<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500px">
    <v-card class="glassmorphism-card">
      <v-card-title class="font-weight-bold">Encaminhar Mensagem</v-card-title>
      <v-card-text>
        <v-autocomplete
          v-model="selectedChannels"
          :items="channels"
          item-title="name"
          item-value="id"
          label="Selecionar conversas"
          variant="outlined"
          multiple
          chips
          closable-chips
        ></v-autocomplete>
        <div v-if="message" class="mt-4 pa-3 rounded" style="background-color: rgba(255,255,255,0.05);">
          <p class="text-caption">Mensagem a ser encaminhada:</p>
          <p class="text-body-2 text-truncate">{{ message.content }}</p>
        </div>
      </v-card-text>
      <v-card-actions class="dialog-footer">
        <v-spacer></v-spacer>
        <v-btn text @click="$emit('update:modelValue', false)">Cancelar</v-btn>
        <v-btn color="primary" @click="forwardMessage" :disabled="selectedChannels.length === 0">
            <v-icon start>mdi-share</v-icon>
            Encaminhar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    modelValue: boolean,
    message: any,
    channels: any[]
}>();

const emit = defineEmits(['update:modelValue', 'forward']);

const selectedChannels = ref<number[]>([]);

const forwardMessage = () => {
    emit('forward', { channels: selectedChannels.value, message: props.message });
}
</script>

<style scoped>
.glassmorphism-card {
  backdrop-filter: blur(15px);
  background-color: rgba(40, 40, 45, 0.85);
  border-radius: 12px;
}
.dialog-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
