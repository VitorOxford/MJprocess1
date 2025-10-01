<template>
  <v-card class="content-card" variant="flat">
    <v-card-title class="font-weight-bold">{{ title }}</v-card-title>
    <v-card-text class="d-flex align-center justify-center pa-4">
      <div class="podium-container">
        <div v-if="!items || items.length === 0" class="text-center text-grey">
          Nenhum dado para exibir no ranking.
        </div>
        <div v-for="item in rankedItems" :key="item.name" :class="`podium-item rank-${item.rank}`">
          <v-avatar :image="item.avatar_url" size="70" class="podium-avatar">
            <span v-if="!item.avatar_url" class="text-h5">{{ item.name.charAt(0) }}</span>
          </v-avatar>
          <div class="podium-name">{{ item.name }}</div>
          <div class="podium-value">{{ formatValue(item.value) }}</div>
          <div class="podium-base">
            <v-icon v-if="item.rank === 1" color="amber-lighten-1">mdi-trophy</v-icon>
            <span class="podium-rank">{{ item.rank }}</span>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, required: true }, // Espera um array de { name, value, avatar_url }
  unit: { type: String, default: 'm' }
});

// ===== INÍCIO DA CORREÇÃO =====
// A lógica agora é simples e correta.
// A prop 'items' já vem ordenada da store (do maior para o menor).
// Nós apenas pegamos os 3 primeiros e atribuímos o rank (1, 2, 3) com base na sua posição no array.
// O CSS cuida de colocar o rank 1 no meio e mais alto.
const rankedItems = computed(() => {
  if (!props.items) return [];
  return props.items.slice(0, 3).map((item, index) => ({
    ...item,
    rank: index + 1 // O primeiro item do array é o rank 1, o segundo é o 2, etc.
  }));
});
// ===== FIM DA CORREÇÃO =====

const formatValue = (value) => {
  if (!value && value !== 0) return "0";
  const unit = props.unit || '';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k${unit}`;
  return `${Number(value.toFixed(0)).toLocaleString('pt-BR')}${unit}`;
};
</script>

<style scoped lang="scss">
.content-card {
  background: rgba(30, 30, 45, 0.75);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  height: 100%;
}
.podium-container {
    display: flex; align-items: flex-end; justify-content: center;
    gap: 1rem; height: 100%; width: 100%; min-height: 220px;
}
.podium-item {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; width: 33%; position: relative;
  /* O CSS usa a classe 'rank-X' para posicionar os itens visualmente */
  &.rank-1 { order: 2; transform: translateY(-20px); .podium-base { height: 90px; background-color: #FFC107; } .podium-avatar { border-color: #FFC107; } }
  &.rank-2 { order: 1; .podium-base { height: 70px; background-color: #C0C0C0; } .podium-avatar { border-color: #C0C0C0; } }
  &.rank-3 { order: 3; .podium-base { height: 50px; background-color: #CD7F32; } .podium-avatar { border-color: #CD7F32; } }
}
.podium-avatar { border: 4px solid; margin-bottom: -35px; z-index: 2; background-color: #1F1D2B; }
.podium-name {
  font-weight: bold;
  margin-top: 45px;
  font-size: 0.9rem;
  line-height: 1.3;
  height: 2.6em;
  width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.podium-value { font-size: 1.1rem; font-weight: 700; color: #fff; margin-top: 4px; }
.podium-base {
  width: 100%; border-radius: 8px 8px 0 0; display: flex;
  flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 4px;
  margin-top: 8px;
  .podium-rank { font-size: 2rem; font-weight: 900; color: rgba(0,0,0,0.5); }
  .v-icon { position: absolute; top: 5px; font-size: 2rem; color: rgba(0,0,0,0.5); }
}
</style>
