<template>
  <v-card class="dev-card my-2" variant="flat" @click="$emit('open', item)">
    <div class="card-shine"></div>
    <div class="card-header">
      <span class="dev-code">{{ item.dev_code }}</span>
      <v-chip size="small" color="primary" variant="tonal" class="ml-auto">
        {{ item.design_items.length }} Estampa(s)
      </v-chip>
    </div>

    <v-card-text class="pa-3">
      <div v-for="(design, index) in item.design_items" :key="index" class="customer-item">
        <v-icon size="small" class="mr-2 icon-customer">mdi-account-outline</v-icon>
        <span class="customer-name">{{ design.customer_name }}</span>
      </div>

      <v-tooltip location="top">
        <template #activator="{ props }">
          <div v-bind="props" class="notes-preview mt-3">
            <v-icon size="small" class="mr-2 icon-notes">mdi-text-long</v-icon>
            <p class="notes-text">{{ item.general_notes || 'Sem observações gerais.' }}</p>
          </div>
        </template>
        <span>{{ item.general_notes || 'Sem observações gerais.' }}</span>
      </v-tooltip>
    </v-card-text>

    <div class="card-footer">
      <v-avatar size="24" class="mr-2">
        <v-img :src="item.profile?.avatar_url" :alt="item.profile?.full_name"></v-img>
      </v-avatar>
      <span class="creator-name">{{ item.profile?.full_name }}</span>
      <span class="creation-date ml-auto">{{ formatDate(item.created_at) }}</span>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

defineProps({
  item: {
    type: Object,
    required: true,
  },
});

defineEmits(['open']);

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
};
</script>

<style scoped lang="scss">
.dev-card {
  background-color: rgba(30, 35, 50, 0.85);
  border-radius: 12px;
  border: 1px solid rgba(68, 86, 129, 0.5);
  color: #e0e0e0;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: all 0.2s ease-out;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    border-color: #445681;
  }
}

.card-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: rgba(43, 53, 80, 0.7);
}

.dev-code {
  font-weight: bold;
  font-size: 0.9rem;
  color: #b3c5ff;
}

.customer-item {
  display: flex;
  align-items: center;
  padding: 4px 0;
  font-size: 0.95rem;

  .icon-customer {
    color: #82a0ff;
  }
  .customer-name {
    font-weight: 500;
  }
}

.notes-preview {
  display: flex;
  align-items: flex-start;
  background-color: rgba(0,0,0,0.2);
  padding: 8px;
  border-radius: 6px;
  font-size: 0.85rem;

  .icon-notes {
    color: #9e9e9e;
    margin-top: 2px;
  }

  .notes-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #bdbdbd;
  }
}

.card-footer {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  font-size: 0.8rem;
  color: #9e9e9e;
  border-top: 1px solid rgba(68, 86, 129, 0.5);

  .creator-name {
    font-weight: 500;
  }
  .creation-date {
    font-style: italic;
  }
}

.card-shine {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at var(--mouse-x) var(--mouse-y), rgba(130, 160, 255, 0.15), transparent 20%);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.dev-card:hover .card-shine {
  opacity: 1;
}
</style>
