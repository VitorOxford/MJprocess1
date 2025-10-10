<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="fill-height" variant="outlined">
          <v-card-item>
            <v-card-title>
              <v-icon start>mdi-broadcast</v-icon>
              Anunciar Atualização do Sistema
            </v-card-title>
            <v-card-subtitle>Envie um alerta em tempo real para todos os usuários online.</v-card-subtitle>
          </v-card-item>

          <v-card-text>
            <v-form ref="announcementForm">
              <v-textarea
                v-model="announcement.message"
                label="Mensagem do Alerta"
                placeholder="Ex: O sistema será atualizado em breve. Por favor, salvem seu trabalho para evitar perdas."
                variant="outlined"
                rows="4"
                counter
                maxlength="250"
                :rules="[rules.required, rules.minLength(10)]"
                class="mb-4"
              ></v-textarea>

              <v-text-field
                v-model.number="announcement.minutes"
                label="Contagem Regressiva (em minutos)"
                type="number"
                variant="outlined"
                suffix="minutos"
                :rules="[rules.required, rules.positive]"
              ></v-text-field>
            </v-form>
          </v-card-text>

          <v-card-actions class="pa-4">
            <v-btn
              color="primary"
              variant="flat"
              block
              size="large"
              @click="sendAnnouncement"
              :loading="isSending"
            >
              <v-icon start>mdi-send-clock-outline</v-icon>
              Enviar Anúncio com Timer
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="fill-height" variant="outlined">
          <v-card-item>
            <v-card-title>
              <v-icon start>mdi-history</v-icon>
              Histórico de Notificações
            </v-card-title>
             <v-card-subtitle>Visualize as últimas notificações enviadas.</v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <p class="text-center text-grey">
              Funcionalidade de histórico a ser implementada.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useAppStore } from '@/stores/app';
import type { VForm } from 'vuetify/components';

const appStore = useAppStore();
const announcementForm = ref<VForm | null>(null);
const isSending = ref(false);

const announcement = reactive({
  message: 'O sistema entrará em manutenção em breve para uma atualização importante. Por favor, salve todo o seu trabalho para não haver perdas.',
  minutes: 5,
});

const rules = {
  required: (v: any) => !!v || 'Campo obrigatório.',
  minLength: (len: number) => (v: string) => (v && v.length >= len) || `A mensagem deve ter pelo menos ${len} caracteres.`,
  positive: (v: number) => (v > 0) || 'O valor deve ser maior que zero.',
};

const sendAnnouncement = async () => {
  if (announcementForm.value) {
    const { valid } = await announcementForm.value.validate();
    if (!valid) {
      appStore.showSnackbar('Por favor, preencha o formulário corretamente.', 'error');
      return;
    }
  }

  isSending.value = true;
  try {
    await appStore.broadcastSystemAnnouncement(announcement.message, announcement.minutes);
    // Limpa o formulário após o envio bem-sucedido
    announcementForm.value?.reset();
  } catch (error) {
    console.error("Falha ao enviar anúncio do componente:", error);
  } finally {
    isSending.value = false;
  }
};
</script>
