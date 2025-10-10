<template>
  <v-card class="dev-approval-card" variant="flat">
    <v-img :src="item.final_art_url" height="250px" cover class="align-end">
      <div class="card-overlay pa-3">
        <div class="d-flex align-center">
          <v-chip size="small" color="white" variant="elevated">{{ item.dev_code }}</v-chip>
          <v-spacer></v-spacer>
          <v-btn size="small" variant="tonal" @click.stop="showComparison = !showComparison">
            <v-icon left>{{ showComparison ? 'mdi-arrow-collapse' : 'mdi-compare-horizontal' }}</v-icon>
            {{ showComparison ? 'Ocultar' : 'Comparar' }}
          </v-btn>
        </div>
      </div>
    </v-img>

    <v-expand-transition>
      <div v-show="showComparison" class="comparison-section">
        <div class="text-caption text-center text-uppercase font-weight-bold text-medium-emphasis">Referências Originais</div>
        <div class="image-gallery">
          <v-img
            v-for="(url, i) in referenceImages" :key="i"
            :src="url" aspect-ratio="1" cover class="gallery-item rounded"
          ></v-img>
        </div>
      </div>
    </v-expand-transition>

    <v-card-title class="pt-3 font-weight-bold">{{ item.new_stamp.name }}</v-card-title>
    <v-card-subtitle>Design por: {{ item.designer?.full_name || 'N/A' }}</v-card-subtitle>

    <v-card-text class="pb-1">
      <div class="info-item">
        <v-icon size="small" start>mdi-account-outline</v-icon>
        <span>{{ firstCustomerName }}</span>
        <v-tooltip v-if="additionalCustomersCount > 0" location="top" activator="parent">
          E mais {{ additionalCustomersCount }} cliente(s)
        </v-tooltip>
      </div>
      <div class="info-item">
        <v-icon size="small" start>mdi-calendar-clock</v-icon>
        <span>Enviado {{ formatDate(item.updated_at) }}</span>
      </div>
    </v-card-text>

    <v-divider></v-divider>

    <v-card-actions class="pa-3">
      <v-btn color="error" variant="text" @click.stop="$emit('reject', item)">Solicitar Alteração</v-btn>
      <v-spacer></v-spacer>
      <v-btn color="success" variant="elevated" @click.stop="$emit('approve', item)" :loading="loading">
        <v-icon left>mdi-check</v-icon> Aprovar Estampa
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const props = defineProps({
  item: { type: Object, required: true },
  loading: Boolean,
});

defineEmits(['approve', 'reject']);

const showComparison = ref(false);

const referenceImages = computed(() => {
  if (!props.item.design_items) return [];
  return props.item.design_items.flatMap((item: any) => item.attachments || []);
});

const firstCustomerName = computed(() => props.item.design_items?.[0]?.customer_name || 'N/A');
const additionalCustomersCount = computed(() => (props.item.design_items?.length || 0) - 1);

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
};
</script>

<style scoped lang="scss">
.dev-approval-card {
  border-radius: 16px;
  border: 1px solid #333;
  transition: all 0.3s ease-in-out;
  background-color: #2a2a2a;
  &:hover {
    transform: translateY(-5px) scale(1.02);
    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    border-color: rgba(var(--v-theme-primary-rgb), 0.5);
  }
}
.card-overlay { background: linear-gradient(to top, rgba(0,0,0,0.8) 20%, transparent 100%); }
.comparison-section {
  padding: 12px;
  background-color: rgba(0,0,0,0.2);
  border-bottom: 1px solid #333;
}
.image-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 8px; margin-top: 8px; }
.info-item { display: flex; align-items: center; margin-bottom: 4px; color: #ccc; }
</style>
