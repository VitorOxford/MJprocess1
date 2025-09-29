<template>
  <v-menu
    :model-value="show"
    @update:model-value="$emit('update:show', $event)"
    :target="[x, y]"
    absolute
  >
    <v-list class="message-menu" density="compact" nav>
      <v-list-item @click="$emit('action', 'reply')" prepend-icon="mdi-reply-outline">
        <v-list-item-title>Responder</v-list-item-title>
      </v-list-item>
      <v-list-item v-if="isMyMessage" @click="$emit('action', 'edit')" prepend-icon="mdi-pencil-outline">
        <v-list-item-title>Editar</v-list-item-title>
      </v-list-item>
      <v-list-item @click="$emit('action', 'forward')" prepend-icon="mdi-share-outline">
        <v-list-item-title>Encaminhar</v-list-item-title>
      </v-list-item>
      <v-divider class="my-1"></v-divider>
      <v-list-item v-if="isMyMessage" @click="$emit('action', 'delete')" prepend-icon="mdi-delete-outline" base-color="error">
        <v-list-item-title>Excluir</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean;
  isMyMessage: boolean;
  x: number;
  y: number;
}>();
defineEmits(['update:show', 'action']);
</script>

<style scoped lang="scss">
.message-menu {
  backdrop-filter: blur(12px) saturate(150%);
  background-color: rgba(40, 42, 53, 0.85) !important;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px !important;

  .v-list-item-title {
    font-size: 0.9rem;
  }
}
</style>
