<template>
  <v-card class="map-card" variant="flat">
    <v-card-title class="font-weight-bold">Vendas por Região (Mês)</v-card-title>
    <div class="map-container" v-if="showMap">
      <l-map
        ref="map"
        v-model:zoom="zoom"
        :center="center"
        :use-global-leaflet="false"
        :options="{ attributionControl: true }"
        :max-bounds="maxBounds"
        :min-zoom="4"
        style="height: 100%; width: 100%; z-index: 1;"
      >
        <l-tile-layer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          layer-type="base"
          name="CartoDB Voyager"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>"
        ></l-tile-layer>

        <l-marker v-if="salesData.Sudoeste > 0" :lat-lng="locations.sudoeste">
          <l-icon :icon-size="[getIconSize(salesData.Sudoeste), getIconSize(salesData.Sudoeste)]" class-name="pulsing-icon-leaflet">
            <div class="pulsing-dot-leaflet"></div>
          </l-icon>
          <l-tooltip :options="{ permanent: true, direction: 'top', offset: [0, -getIconSize(salesData.Sudoeste) / 2] }">
            <div class="map-tooltip-content">
              <strong>SUDESTE</strong>
              <span>{{ formatMeters(salesData.Sudoeste) }}m</span>
            </div>
          </l-tooltip>
        </l-marker>

        <l-marker v-if="salesData.Nordeste > 0" :lat-lng="locations.nordeste">
           <l-icon :icon-size="[getIconSize(salesData.Nordeste), getIconSize(salesData.Nordeste)]" class-name="pulsing-icon-leaflet">
            <div class="pulsing-dot-leaflet"></div>
          </l-icon>
          <l-tooltip :options="{ permanent: true, direction: 'top', offset: [0, -getIconSize(salesData.Nordeste) / 2] }">
            <div class="map-tooltip-content">
              <strong>NORDESTE</strong>
              <span>{{ formatMeters(salesData.Nordeste) }}m</span>
            </div>
          </l-tooltip>
        </l-marker>
      </l-map>
    </div>
     <div v-else class="fill-height d-flex align-center justify-center text-grey">
      Carregando mapa...
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import "leaflet/dist/leaflet.css";
import {
  LMap,
  LTileLayer,
  LMarker,
  LTooltip,
  LIcon
} from "@vue-leaflet/vue-leaflet";

const props = defineProps<{
  salesData: {
    Sudoeste: number;
    Nordeste: number;
  };
}>();

const showMap = ref(false);

onMounted(() => {
  // --- CORREÇÃO DEFINITIVA ---
  // Atrasar a renderização com setTimeout(..., 0) garante que o DOM esteja
  // completamente estável antes de o Leaflet tentar encontrar seu contêiner.
  setTimeout(() => {
    showMap.value = true;
  }, 100); // Um pequeno delay para garantir
});

// Configurações iniciais do mapa
const zoom = ref(4.5);
const center = ref([-15.3, -50.5]); // Ponto centralizado no Brasil
const maxBounds = ref([[-33.75, -73.98], [5.27, -32.38]]); // Limites geográficos do Brasil

// Coordenadas exatas solicitadas
const locations = {
  sudoeste: [-23.5505, -46.6333], // São Paulo, SP
  nordeste: [-7.9556, -36.2044]   // Santa Cruz do Capibaribe, PE
};

const totalSales = computed(() => (props.salesData?.Sudoeste || 0) + (props.salesData?.Nordeste || 0));

// Função para calcular o tamanho do ícone dinamicamente
const getIconSize = (regionSales: number) => {
  if (totalSales.value === 0) return 20;
  const percentage = (regionSales / totalSales.value);
  // Tamanho mínimo de 20px e máximo de 60px
  return 20 + (percentage * 40);
};

const formatMeters = (value: number) => {
    if (!value) return "0";
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return Number(value.toFixed(0)).toLocaleString('pt-BR');
}
</script>

<style lang="scss">
.map-card {
  background-color: #1F1D2B;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  height: 100%;
  min-height: 450px;
  display: flex;
  flex-direction: column;
}

.map-container {
  flex-grow: 1;
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}

// Estilo para o tooltip permanente no mapa
.leaflet-tooltip {
  background-color: rgba(30, 31, 49, 0.8);
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  padding: 4px 10px;
  border-radius: 8px;
}
.leaflet-tooltip-top::before {
  content: none;
}

.map-tooltip-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;

  strong {
    font-size: 0.8rem;
    font-weight: 700;
    color: #a0a0a0;
    text-transform: uppercase;
  }

  span {
    font-size: 1rem;
    font-weight: 700;
    color: #fff;
  }
}

// Animação de pulsação para o ícone do marcador
.pulsing-icon-leaflet {
  display: flex;
  align-items: center;
  justify-content: center;

  .pulsing-dot-leaflet {
    width: 100%;
    height: 100%;
    background-color: rgba(3, 169, 244, 0.8); // Cor primária vibrante
    border-radius: 50%;
    position: relative;
    transition: transform 0.3s ease;
    box-shadow: 0 0 15px rgba(3, 169, 244, 0.7);

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background-color: rgba(3, 169, 244, 1);
      animation: pulse 2s infinite;
    }
  }
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  70% {
    transform: scale(2.5);
    opacity: 0;
  }
  100% {
    transform: scale(0.8);
    opacity: 0;
  }
}
</style>
