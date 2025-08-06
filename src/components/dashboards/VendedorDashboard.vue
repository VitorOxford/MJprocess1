<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" sm="6">
        <v-card class="kpi-card text-center" color="rgba(255, 152, 0, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ ordersPendingApproval }}</div>
            <div class="text-subtitle-2 text-white-50">Aprovações Pendentes</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6">
        <v-card class="kpi-card text-center" color="rgba(3, 169, 244, 0.3)">
          <v-card-text>
            <div class="text-h4 font-weight-bold">{{ totalOrdersCreated }}</div>
            <div class="text-subtitle-2 text-white-50">Meus Pedidos Criados</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card class="dashboard-card training-portal" color="rgba(30,30,35,0.8)">
          <v-card-title class="text-h5 font-weight-bold">
            <v-icon start>mdi-school-outline</v-icon>
            Portal de Treinamento do Vendedor
          </v-card-title>
          <v-row class="pa-4">
            <v-col cols="12" md="8">
              <v-card class="video-player-card" color="black">
                <video ref="videoPlayer" :src="selectedVideo.url" controls class="main-video"></video>
              </v-card>
              <h2 class="text-h6 mt-4 font-weight-bold">{{ selectedVideo.title }}</h2>
            </v-col>

            <v-col cols="12" md="4" class="modules-list-col">
              <div class="modules-list">
                <v-expansion-panels variant="accordion" v-model="panel">
                  <v-expansion-panel
                    v-for="module in trainingModules"
                    :key="module.title"
                    class="module-panel"
                    bg-color="rgba(45,45,55,0.8)"
                  >
                    <v-expansion-panel-title class="font-weight-bold">
                      <v-icon start>{{ module.icon }}</v-icon>
                      {{ module.title }}
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-list dense nav bg-color="transparent" class="video-playlist">
                        <v-list-item
                          v-for="video in module.videos"
                          :key="video.title"
                          @click="playVideo(video)"
                          :active="selectedVideo.title === video.title"
                          rounded="lg"
                        >
                          <template v-slot:prepend>
                            <v-icon size="small">{{ selectedVideo.title === video.title ? 'mdi-play-circle' : 'mdi-play-circle-outline' }}</v-icon>
                          </template>
                          <v-list-item-title>{{ video.title }}</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </div>
            </v-col>
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card class="dashboard-card" color="rgba(30,30,35,0.8)">
          <v-card-title class="d-flex align-center">
            Meus Pedidos Ativos
            <v-spacer></v-spacer>
            <v-btn :to="{ name: 'NewOrder' }" color="primary" variant="tonal" prepend-icon="mdi-plus-box-outline">
              Lançar Pedido
            </v-btn>
          </v-card-title>
          <v-data-table
            :headers="headers"
            :items="myActiveOrders"
            class="bg-transparent"
            density="compact"
          >
            <template v-slot:item.status="{ value, item }">
              <v-chip v-if="value !== 'customer_approval'" size="small" :color="statusColorMap[value]" label>{{ statusDisplayMap[value] }}</v-chip>
              <v-btn v-else :to="{ name: 'ApproveOrder', params: { id: item.id } }" color="orange" size="small" variant="tonal">
                Aprovar Arte
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDashboardStore, type Order } from '@/stores/dashboard';
import { useUserStore } from '@/stores/user';

const dashboardStore = useDashboardStore();
const userStore = useUserStore();

// --- LÓGICA EXISTENTE DO DASHBOARD ---
const headers = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Status', key: 'status', width: '180px' },
];

const statusDisplayMap: Record<string, string> = {
    design_pending: 'No Design', in_design: 'No Design', changes_requested: 'No Design',
    finalizing: 'No Design', customer_approval: 'Aprovação', production_queue: 'Produção',
    in_printing: 'Produção', in_cutting: 'Produção', completed: 'Finalizado'
};
const statusColorMap: Record<string, string> = {
    design_pending: 'blue-grey', in_design: 'blue', changes_requested: 'red',
    finalizing: 'purple', customer_approval: 'orange', production_queue: 'grey',
    in_printing: 'blue', in_cutting: 'orange', completed: 'green'
};

const myOrders = computed((): Order[] => {
    if (!userStore.profile?.id) return [];
    return dashboardStore.orders.filter(o => o.created_by === userStore.profile.id);
});

const myActiveOrders = computed((): Order[] => myOrders.value.filter(order => order.status !== 'completed'));
const ordersPendingApproval = computed(() => myActiveOrders.value.filter(order => order.status === 'customer_approval').length);
const totalOrdersCreated = computed(() => myOrders.value.length);

// --- NOVA LÓGICA DO PORTAL DE TREINAMENTO ---
const panel = ref(0); // Mantém o primeiro painel aberto por padrão
const videoPlayer = ref<HTMLVideoElement | null>(null);

const presentationVideo = {
  title: 'Apresentação do Processo de Vendas',
  url: 'https://cdn.shopify.com/videos/c/o/v/3cad9212989d41a29eb30d4655d4f1bc.mp4'
};

const selectedVideo = ref(presentationVideo);

const trainingModules = ref([
  {
    icon: 'mdi-play-box-outline',
    title: 'Módulo 1: Introdução',
    videos: [
      presentationVideo,
      {
        title: 'Entendendo o Fluxo do Pedido',
        url: 'https://cdn.shopify.com/videos/c/o/v/14f0a2cc4cb14feb9624311779424997.mp4'
      },
      {
        title: 'Detalhes da Aprovação',
        url: 'https://cdn.shopify.com/videos/c/o/v/37fd779c56b0417d97e648f48eb7c0b1.mp4'
      },
    ]
  },
  {
    icon: 'mdi-lightbulb-on-outline',
    title: 'Módulo 2: Dicas e Estratégias',
    videos: [
      {
        title: 'Como Lançar um Pedido Corretamente',
        url: 'https://cdn.shopify.com/videos/c/o/v/6421e9733ba640b58e2728e5e0cd6f37.mp4'
      },
      {
        title: 'Argumentação de Vendas',
        url: 'https://cdn.shopify.com/videos/c/o/v/e2c3608e44bd4044a7a900bb27eacb56.mp4'
      },
    ]
  },
  {
    icon: 'mdi-cogs',
    title: 'Módulo 3: Ferramentas e Sistema',
    videos: [
      {
        title: 'Navegando no Dashboard',
        url: 'https://cdn.shopify.com/videos/c/o/v/4c1c47e0216c4ecab1c7fa222fb5304a.mp4'
      },
      {
        title: 'Utilizando o Chat Interno',
        url: 'https://cdn.shopify.com/videos/c/o/v/647388af7c8d4a7b9ef6722b0b33ca56.mp4'
      },
    ]
  }
]);

const playVideo = (video: { title: string, url: string }) => {
  selectedVideo.value = video;
  videoPlayer.value?.load();
  videoPlayer.value?.play();
};

</script>

<style scoped lang="scss">
.kpi-card, .dashboard-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  height: 100%;
}
.kpi-card {
    border-left-width: 4px;
    border-left-color: currentColor;
}
:deep(.v-data-table__wrapper) {
    background-color: transparent !important;
}

// --- NOVOS ESTILOS PARA O PORTAL DE TREINAMENTO ---
.training-portal {
  .video-player-card {
    border-radius: 12px;
    overflow: hidden;
    aspect-ratio: 16/9;
  }
  .main-video {
    width: 100%;
    height: 100%;
    background-color: black;
  }
  .modules-list-col {
    max-height: 500px; // Altura máxima para a lista de vídeos
    @media (min-width: 960px) {
      height: 100%;
    }
  }
  .modules-list {
    height: 100%;
    overflow-y: auto;
  }
  .module-panel {
    border-radius: 8px !important;
    margin-bottom: 8px;
    &:before {
      display: none; // Remove a linha feia do expansion-panel
    }
  }
  .video-playlist {
    .v-list-item {
      margin-bottom: 4px;
      &--active {
        background-color: rgba(var(--v-theme-primary), 0.2) !important;
        color: rgba(var(--v-theme-primary)) !important;
      }
    }
  }
}
</style>
