<template>
  <v-card class="map-card" variant="flat">
    <v-card-title class="font-weight-bold d-flex align-center">
      Vendas por Região (Mês)
      <v-spacer></v-spacer>
      <v-chip-group v-model="displayMetric" mandatory variant="outlined" density="compact">
        <v-chip filter value="meters" size="small">Metragem</v-chip>
        <v-chip filter value="revenue" size="small">Faturamento</v-chip>
      </v-chip-group>
    </v-card-title>
    <div class="map-container" v-if="showMap">
      <l-map
        ref="map"
        v-model:zoom="zoom"
        :center="center"
        :use-global-leaflet="false"
        :options="{ attributionControl: false, zoomControl: false }"
        :max-bounds="maxBounds"
        :min-zoom="4"
        style="height: 100%; width: 100%; z-index: 1;"
      >
        <l-tile-layer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
          layer-type="base"
          name="CartoDB Voyager"
        ></l-tile-layer>

        <l-marker v-if="regionData.Sudoeste.value > 0" :lat-lng="locations.sudoeste">
          <l-icon :icon-size="[getIconSize(regionData.Sudoeste.value), getIconSize(regionData.Sudoeste.value)]" class-name="pulsing-icon-leaflet">
            <div class="pulsing-dot-leaflet"></div>
          </l-icon>
          <l-tooltip :options="{ permanent: true, direction: 'top', offset: [0, -getIconSize(regionData.Sudoeste.value) / 2] }">
            <div class="map-tooltip-content">
              <strong>SUDESTE</strong>
              <span>{{ formatValue(regionData.Sudoeste.value) }}</span>
              <div class="sellers-list">{{ regionData.Sudoeste.sellers.join(', ') }}</div>
            </div>
          </l-tooltip>
        </l-marker>

        <l-marker v-if="regionData.Nordeste.value > 0" :lat-lng="locations.nordeste">
           <l-icon :icon-size="[getIconSize(regionData.Nordeste.value), getIconSize(regionData.Nordeste.value)]" class-name="pulsing-icon-leaflet">
            <div class="pulsing-dot-leaflet"></div>
          </l-icon>
          <l-tooltip :options="{ permanent: true, direction: 'top', offset: [0, -getIconSize(regionData.Nordeste.value) / 2] }">
            <div class="map-tooltip-content">
              <strong>NORDESTE</strong>
              <span>{{ formatValue(regionData.Nordeste.value) }}</span>
              <div class="sellers-list">{{ regionData.Nordeste.sellers.join(', ') }}</div>
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
import { LMap, LTileLayer, LMarker, LTooltip, LIcon } from "@vue-leaflet/vue-leaflet";
import { useCrmStore } from '@/stores/crm';
import { storeToRefs } from 'pinia';

const crmStore = useCrmStore();
const { rawOrders } = storeToRefs(crmStore);

const showMap = ref(false);
const displayMetric = ref('meters'); // 'meters' ou 'revenue'

const NORDESTE_SELLERS = ['Elda', 'Sueli'];

const regionData = computed(() => {
    const data = {
        Sudoeste: { value: 0, sellers: new Set<string>() },
        Nordeste: { value: 0, sellers: new Set<string>() },
    };

    rawOrders.value.forEach(order => {
        let sellerName = order.profiles?.full_name || 'N/A';
        if (sellerName === 'Danilo Martins') sellerName = 'Fernanda Garcia';

        const region: 'Sudoeste' | 'Nordeste' = NORDESTE_SELLERS.includes(sellerName) ? 'Nordeste' : 'Sudoeste';

        if (displayMetric.value === 'meters') {
            const orderMeters = order.order_items.reduce((sum: number, item: any) => sum + (item.quantity_meters || 0), 0);
            data[region].value += orderMeters;
        } else {
            // Lógica de cálculo de faturamento (simplificada, idealmente viria da store)
             const orderValue = order.order_items.reduce((sum: number, item: any) => sum + ((item.quantity_meters || 0) * 30), 0); // Preço Fixo para exemplo
             data[region].value += orderValue;
        }
        data[region].sellers.add(sellerName);
    });

    return {
        Sudoeste: { value: data.Sudoeste.value, sellers: Array.from(data.Sudoeste.sellers) },
        Nordeste: { value: data.Nordeste.value, sellers: Array.from(data.Nordeste.sellers) },
    };
});


onMounted(() => {
  setTimeout(() => { showMap.value = true; }, 100);
});

const zoom = ref(4.5);
const center = ref([-15.3, -50.5]);
const maxBounds = ref([[-33.75, -73.98], [5.27, -32.38]]);

const locations = {
  sudoeste: [-23.5505, -46.6333],
  nordeste: [-7.9556, -36.2044]
};

const totalValue = computed(() => (regionData.value.Sudoeste.value || 0) + (regionData.value.Nordeste.value || 0));

const getIconSize = (regionValue: number) => {
  if (totalValue.value === 0) return 25;
  const percentage = (regionValue / totalValue.value);
  return 25 + (percentage * 50);
};

const formatValue = (value: number) => {
    if (displayMetric.value === 'meters') {
        if (!value) return "0m";
        if (value >= 1000) return `${(value / 1000).toFixed(1)}km`;
        return `${Number(value.toFixed(0)).toLocaleString('pt-BR')}m`;
    } else {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    }
}
</script>

<style lang="scss">
.map-card {
  background-color: rgba(30, 30, 45, 0.75);
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
  background-color: #1e1e1e;
}

.leaflet-tooltip {
  background-color: rgba(30, 31, 49, 0.8) !important;
  backdrop-filter: blur(5px) !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
  padding: 8px 12px !important;
  border-radius: 8px !important;
}
.leaflet-tooltip-top::before { content: none; }

.map-tooltip-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;

  strong { font-size: 0.8rem; font-weight: 700; color: #a0a0a0; text-transform: uppercase; }
  span { font-size: 1.2rem; font-weight: 700; color: #fff; }
  .sellers-list { font-size: 0.7rem; color: #888; max-width: 150px; white-space: normal; text-align: center; margin-top: 4px; }
}

.pulsing-icon-leaflet .pulsing-dot-leaflet {
  width: 100%; height: 100%;
  background-color: rgba(3, 169, 244, 0.8);
  border-radius: 50%; position: relative;
  box-shadow: 0 0 15px rgba(3, 169, 244, 0.7);

  &::before {
    content: ''; position: absolute; inset: 0; border-radius: 50%;
    background-color: rgba(3, 169, 244, 1);
    animation: pulse 2s infinite;
  }
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 1; }
  70% { transform: scale(2.5); opacity: 0; }
  100% { transform: scale(0.8); opacity: 0; }
}
</style>
