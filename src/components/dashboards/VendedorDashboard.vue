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

      <v-col cols="12" md="8">
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
      <v-col cols="12" md="4">
        <v-card class="dashboard-card" color="rgba(30,30,35,0.8)">
          <v-card-title>Funil de Pedidos</v-card-title>
          <v-card-text>
            <div v-for="stage in salesFunnel" :key="stage.name" class="mb-4">
              <div class="d-flex justify-space-between mb-1">
                <span class="font-weight-bold">{{ stage.name }}</span>
                <span class="text-grey">{{ stage.count }} pedido(s)</span>
              </div>
              <v-progress-linear :model-value="stage.percentage" :color="stage.color" height="8" rounded></v-progress-linear>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card class="training-center-card" color="rgba(30,30,35,0.8)">
            <v-card-title class="text-h5 font-weight-bold d-flex align-center">
                <v-icon start size="32" color="primary">mdi-school-outline</v-icon>
                Central de Treinamento
            </v-card-title>
            <v-card-subtitle>Capacitação para Vendedores de Elite</v-card-subtitle>

             <v-card-text>
                <div class="main-video-container mb-6">
                    <h3 class="video-title">
                        <v-icon :color="completedVideos.has(trainingModules[0].url) ? 'success' : 'grey-lighten-1'">
                            {{ completedVideos.has(trainingModules[0].url) ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                        </v-icon>
                        {{ trainingModules[0].title }}
                    </h3>
                    <video
                        :src="trainingModules[0].url"
                        controls
                        class="video-player"
                        @ended="markAsCompleted(trainingModules[0].url)"
                    ></video>
                </div>

                <v-expansion-panels variant="accordion" class="training-modules">
                    <v-expansion-panel
                        v-for="topic in trainingModules.slice(1)"
                        :key="topic.title"
                        class="module-panel"
                    >
                        <v-expansion-panel-title class="panel-title">
                           <v-icon start :color="isTopicCompleted(topic) ? 'success' : 'primary'">{{ topic.icon }}</v-icon>
                           {{ topic.title }}
                        </v-expansion-panel-title>
                        <v-expansion-panel-text>
                            <div v-for="video in topic.videos" :key="video.url" class="video-item">
                               <h3 class="video-title">
                                    <v-icon :color="completedVideos.has(video.url) ? 'success' : 'grey-lighten-1'">
                                        {{ completedVideos.has(video.url) ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                                    </v-icon>
                                    {{ video.title }}
                                </h3>
                                <video :src="video.url" controls class="video-player" @ended="markAsCompleted(video.url)"></video>
                            </div>
                        </v-expansion-panel-text>
                    </v-expansion-panel>
                </v-expansion-panels>
            </v-card-text>
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

// --- LÓGICA DOS PEDIDOS (SEM ALTERAÇÃO) ---
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

const salesFunnel = computed(() => {
    const total = myActiveOrders.value.length;
    if (total === 0) return [];
    const designCount = myActiveOrders.value.filter(o => ['design_pending', 'in_design', 'changes_requested', 'finalizing'].includes(o.status)).length;
    const approvalCount = ordersPendingApproval.value;
    const productionCount = myActiveOrders.value.filter(o => ['production_queue', 'in_printing', 'in_cutting'].includes(o.status)).length;

    return [
        { name: 'Em Design', count: designCount, percentage: (designCount / total) * 100, color: 'blue' },
        { name: 'Aguardando Aprovação', count: approvalCount, percentage: (approvalCount / total) * 100, color: 'orange' },
        { name: 'Em Produção', count: productionCount, percentage: (productionCount / total) * 100, color: 'purple' },
    ];
});


// --- AAAAAAAAAAAAAAAAAAA LÓGICA DOS VÍDEOS AAAAAAAAAAAAAAAAAAAAAAAAA ---

const completedVideos = ref(new Set<string>());

const trainingModules = ref([
    {
        title: 'Apresentação Principal da Empresa',
        url: 'https://cdn.shopify.com/videos/c/o/v/3cad9212989d41a29eb30d4655d4f1bc.mp4',
    },
    {
        title: 'Conhecendo os Materiais',
        icon: 'mdi-layers-triple-outline',
        videos: [
            {
                title: 'Tipos de Tecido (Plano, Malha e Viscose)',
                url: 'https://cdn.shopify.com/videos/c/o/v/14f0a2cc4cb14feb9624311779424997.mp4'
            },
            {
                title: 'Tipos de Poliéster e Viscose',
                url: 'https://cdn.shopify.com/videos/c/o/v/37fd779c56b0417d97e648f48eb7c0b1.mp4'
            },
        ]
    },
    {
        title: 'Termos Técnicos',
        icon: 'mdi-book-open-page-variant-outline',
        videos: [
            {
                title: 'O que é Ourela?',
                url: 'https://cdn.shopify.com/videos/c/o/v/6421e9733ba640b58e2728e5e0cd6f37.mp4'
            }
        ]
    },
    {
        title: 'Processos e Prazos',
        icon: 'mdi-timeline-clock-outline',
        videos: [
            {
                title: 'Impressão e Prazos',
                url: 'https://cdn.shopify.com/videos/c/o/v/e2c3608e44bd4044a7a900bb27eacb56.mp4'
            }
        ]
    },
    {
        title: 'Comercial',
        icon: 'mdi-finance',
        videos: [
            {
                title: 'Tipos de Serviços',
                url: 'https://cdn.shopify.com/videos/c/o/v/4c1c47e0216c4ecab1c7fa222fb5304a.mp4'
            },
            {
                title: 'Formas de Pagamento',
                url: 'https://cdn.shopify.com/videos/c/o/v/647388af7c8d4a7b9ef6722b033ca56.mp4'
            }
        ]
    }
]);

const markAsCompleted = (url: string) => {
    completedVideos.value.add(url);
};

const isTopicCompleted = (topic: any) => {
    return topic.videos.every((video: any) => completedVideos.value.has(video.url));
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

// ===== ESTILOS PARA O CENTRO DE TREINAMENTO =====
.training-center-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.main-video-container {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 16px;
  background-color: rgba(0,0,0,0.1);
}

.video-player {
    width: 100%;
    border-radius: 8px;
    margin-top: 12px;
    background-color: #000;
}

.video-title {
    font-size: 1.1rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 12px;
}

.video-item {
    margin-bottom: 24px;
    &:last-child {
        margin-bottom: 0;
    }
}

.training-modules {
    :deep(.v-expansion-panel) {
        background-color: rgba(255, 255, 255, 0.05) !important;
        backdrop-filter: blur(10px);
        color: #FFFFFF;
        &:before {
            box-shadow: none !important;
        }
    }
    .panel-title {
        font-weight: bold;
    }
}

</style>
