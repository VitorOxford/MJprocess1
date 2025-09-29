<template>
  <div class="message-wrapper" :class="{ 'my-message': isMyMessage, 'consecutive': isConsecutive }">
    <v-avatar v-if="!isConsecutive && !isMyMessage" :image="message.profile?.avatar_url" size="36" class="message-avatar"></v-avatar>
    <div class="message-bubble" @contextmenu.prevent="showMenu">
      <div class="message-header" v-if="!isMyMessage && !isConsecutive">
        <span class="font-weight-bold author-name">{{ message.profile?.full_name }}</span>
      </div>

      <div v-if="message.message_type === 'image'" class="media-container">
        <v-img
          :src="message.content"
          class="rounded-lg media-content"
          max-height="300"
          max-width="400"
          @click="openImageModal(message.content)"
        ></v-img>
      </div>

      <div v-else-if="message.message_type === 'audio'" class="audio-container">
        <audio :src="message.content" controls></audio>
      </div>

      <div v-else-if="message.message_type === 'file'" class="file-attachment pa-3 my-2">
        <v-icon start>mdi-file-outline</v-icon>
        <a :href="message.content" target="_blank" download class="file-link">{{ getFileName(message.content) }}</a>
      </div>

      <p v-else class="message-text">{{ message.content }}</p>

      <div class="message-footer">
        <span class="message-time">{{ formattedTime }}</span>
        <v-icon v-if="isMyMessage" size="16" class="ml-1 read-receipt-icon">mdi-check-all</v-icon>
      </div>
    </div>

    <ImageModal :show="imageModal.show" :image-url="imageModal.url" @close="imageModal.show = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useUserStore } from '@/stores/user';
import { format } from 'date-fns';
import ImageModal from '@/components/ImageModal.vue';

const props = defineProps<{
  message: any;
  isConsecutive: boolean;
}>();

const emit = defineEmits(['show-menu']);

const userStore = useUserStore();
const isMyMessage = computed(() => props.message.profile_id === userStore.profile?.id);
const formattedTime = computed(() => format(new Date(props.message.created_at), 'HH:mm'));

const imageModal = reactive({ show: false, url: '' });

const openImageModal = (url: string) => {
  imageModal.url = url;
  imageModal.show = true;
};

const getFileName = (url: string) => {
  try {
    const decodedUrl = decodeURIComponent(url);
    // Remove o timestamp do início do nome do arquivo
    return decodedUrl.split('/').pop()?.split('?')[0].slice(14) || 'Arquivo';
  } catch {
    return 'Arquivo';
  }
}

const showMenu = (event: MouseEvent) => {
  emit('show-menu', { event, message: props.message });
};
</script>

<style lang="scss" scoped>
.message-wrapper {
  display: flex;
  margin: 2px 0;
  align-items: flex-end; /* Alinha na base */

  &.my-message {
    justify-content: flex-end;
    .message-bubble {
      background-color: #267267; // Verde escuro para minhas mensagens
      border-bottom-right-radius: 4px;
    }
  }

  &:not(.my-message) {
    justify-content: flex-start;
    .message-bubble {
      background-color: #2C2C2C; // Cinza escuro para mensagens dos outros
      border-bottom-left-radius: 4px;
    }
  }

  &.consecutive {
    margin-top: -8px; /* Junta as mensagens */
    .message-bubble {
      border-radius: 12px; // Remove a "cauda"
    }
  }
}

.message-avatar {
    margin-right: 8px;
    margin-bottom: 2px;
}

.message-bubble {
  padding: 8px 12px;
  border-radius: 12px;
  max-width: 70%;
  word-wrap: break-word;
  position: relative;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}
.author-name {
  color: #4DB6AC; // Cor de destaque para o nome
  font-size: 0.9rem;
}
.message-text {
  margin: 0;
  padding-bottom: 18px; /* Espaço para o tempo */
  line-height: 1.4;
  white-space: pre-wrap;
}
.message-footer {
  position: absolute;
  bottom: 5px;
  right: 10px;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
}
.read-receipt-icon {
  color: #53bdeb; // Cor para o "check" de lido
}
.media-container, .audio-container {
  padding-bottom: 20px;
  cursor: pointer;
}
audio {
  width: 250px;
  height: 40px;
}
.file-attachment a {
  color: white;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}
</style>
