<template>
  <div class="message-wrapper" :class="{ 'my-message': isMyMessage }">
    <v-avatar :image="message.profile?.avatar_url" size="36" class="mr-3"></v-avatar>
    <div class="message-content">
      <div class="message-header">
        <span class="font-weight-bold">{{ message.profile?.full_name }}</span>
        <span class="text-caption ml-2 text-disabled">{{ formattedDate }}</span>
      </div>
      <p class="mb-0">{{ message.content }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const props = defineProps<{
  message: any;
}>();

const userStore = useUserStore();
const isMyMessage = computed(() => props.message.profile_id === userStore.profile?.id);

const formattedDate = computed(() => {
  const date = new Date(props.message.created_at);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return `Ontem às ${format(date, 'HH:mm')}`;
  return format(date, 'dd/MM/yy HH:mm');
});
</script>

<style lang="scss" scoped>
.message-wrapper {
  display: flex;
  align-items: flex-start;
  &.my-message {
    flex-direction: row-reverse;
    .message-content {
      background-color: #26A69A; // Cor primária
    }
    .v-avatar {
      margin-left: 12px;
      margin-right: 0;
    }
  }
}
.message-content {
  background-color: #363636;
  border-radius: 12px;
  padding: 8px 12px;
  max-width: 70%;
}
.message-header {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}
</style>
