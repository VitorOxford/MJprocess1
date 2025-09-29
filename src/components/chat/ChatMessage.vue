<template>
  <div class="message-wrapper" :class="{ 'my-message': isMyMessage, 'consecutive': isConsecutive }">
    <v-avatar v-if="!isConsecutive && !isMyMessage" :image="message.profile?.avatar_url" size="36" class="message-avatar"></v-avatar>
    <div class="message-bubble" @contextmenu.prevent="showMenu">
      <div class="message-header" v-if="!isMyMessage && !isConsecutive">
        <span class="font-weight-bold author-name">{{ message.profile?.full_name }}</span>
      </div>

      <div v-if="message.replied_message" class="reply-container">
          <div class="reply-author">{{ message.replied_message.profile.full_name }}</div>
          <div class="reply-text text-truncate">{{ message.replied_message.content }}</div>
      </div>

      <div v-if="message.message_type === 'image'" class="media-container" @click="openImageModal(message.content)">
        <v-img :src="message.content" class="rounded-lg media-content" aspect-ratio="1" cover>
          <template v-slot:placeholder>
            <div class="d-flex align-center justify-center fill-height">
              <v-progress-circular color="grey-lighten-4" indeterminate></v-progress-circular>
            </div>
          </template>
        </v-img>
      </div>

      <div v-else-if="message.message_type === 'audio'" class="audio-container">
        <audio :src="message.content" controls></audio>
      </div>

      <div v-else-if="message.message_type === 'file'" class="file-attachment pa-3 my-2">
        <v-icon start>mdi-file-outline</v-icon>
        <a :href="message.content" target="_blank" download class="file-link">{{ getFileName(message.content) }}</a>
      </div>

      <div v-else class="message-content-wrapper">
        <p class="message-text" v-html="highlightedContent"></p>
        <div class="message-footer">
          <span class="message-time">{{ formattedTime }}</span>
          <v-icon v-if="isMyMessage" size="16" class="ml-1 read-receipt-icon">mdi-check-all</v-icon>
        </div>
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
  searchQuery?: string;
}>();

const emit = defineEmits(['show-menu']);

const userStore = useUserStore();
const isMyMessage = computed(() => props.message.profile_id === userStore.profile?.id);
const formattedTime = computed(() => format(new Date(props.message.created_at), 'HH:mm'));

const imageModal = reactive({ show: false, url: '' });

const highlightedContent = computed(() => {
  const content = props.message.content;
  if (!props.searchQuery || props.message.message_type !== 'text') {
    return content;
  }
  const regex = new RegExp(`(${props.searchQuery})`, 'gi');
  return content.replace(regex, '<mark class="search-highlight">$1</mark>');
});

const openImageModal = (url: string) => {
  imageModal.url = url;
  imageModal.show = true;
};

const getFileName = (url: string) => {
  try {
    const decodedUrl = decodeURIComponent(url);
    return decodedUrl.split('/').pop()?.split('?')[0].slice(14) || 'Arquivo';
  } catch {
    return 'Arquivo';
  }
}

const showMenu = (event: MouseEvent) => {
  emit('show-menu', { event, message: props.message });
};
</script>

<style lang="scss">
.search-highlight {
  background-color: #FFC107;
  color: #000;
  padding: 1px 0;
}
</style>

<style lang="scss" scoped>
.message-wrapper {
  display: flex;
  margin: 8px 0;
  align-items: flex-end;

  &.my-message {
    justify-content: flex-end;
    .message-bubble { background-color: rgba(38, 114, 103, 0.7); border-bottom-right-radius: 4px; }
    .reply-container { border-left-color: #80CBC4; }
    .reply-author { color: #80CBC4; }
  }

  &:not(.my-message) {
    justify-content: flex-start;
    .message-bubble { background-color: rgba(44, 44, 44, 0.7); border-bottom-left-radius: 4px; }
    .reply-container { border-left-color: #4DB6AC; }
    .reply-author { color: #4DB6AC; }
  }

  &.consecutive {
    margin-top: 2px;
    .message-bubble { border-radius: 12px; }
    &:not(.my-message) { padding-left: 44px; }
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
  cursor: pointer;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.author-name { color: #4DB6AC; font-size: 0.9rem; }

.reply-container {
    padding: 6px 10px;
    margin: -2px -6px 8px -6px;
    background-color: rgba(0,0,0,0.2);
    border-left: 3px solid;
    border-radius: 4px;
    .reply-author { font-size: 0.8rem; font-weight: bold; }
    .reply-text { font-size: 0.85rem; color: #e0e0e0; }
}

.message-content-wrapper { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 8px; }
.message-text { margin: 0; line-height: 1.4; white-space: pre-wrap; min-width: 20px; flex: 1 1 auto; }
.message-footer { font-size: 0.7rem; color: rgba(255, 255, 255, 0.6); display: flex; align-items: center; white-space: nowrap; flex-shrink: 0; }
.read-receipt-icon { color: #53bdeb; }
.media-container, .audio-container { cursor: pointer; }
.media-container { min-width: 250px; max-width: 400px; }
audio { width: 250px; height: 40px; }
.file-attachment a { color: white; text-decoration: none; &:hover { text-decoration: underline; } }
</style>
