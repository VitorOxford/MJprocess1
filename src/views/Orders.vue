<template>
  <v-container fluid class="pa-md-8 pa-2 fill-height">
    <v-card class="glassmorphism-card mx-auto my-auto pa-2 pa-md-4">
      <template v-if="!loading">
        <v-toolbar color="transparent" class="mb-4 header-toolbar">
          <v-toolbar-title class="font-weight-bold header-title d-none d-sm-flex">
            <v-icon start>mdi-calendar-check-outline</v-icon>
            Agenda e Filas
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <div class="d-flex align-center">
            <v-btn icon="mdi-chevron-left" variant="text" @click="previousWeek"></v-btn>
            <div class="week-indicator mx-2 text-center">
              <div class="font-weight-bold">{{ weekRangeText }}</div>
              <div class="text-caption text-grey">{{ isCurrentWeek ? 'Semana Atual' : '' }}</div>
            </div>
            <v-btn icon="mdi-chevron-right" variant="text" @click="nextWeek"></v-btn>
          </div>
        </v-toolbar>

        <div class="d-flex flex-column flex-md-row ga-4 px-2 mb-2">
            <v-card
                class="queue-card"
                variant="tonal"
                color="error"
                @click="openQueueModal('stock')"
            >
                <v-card-text class="d-flex align-center">
                    <v-icon size="40" class="mr-4">mdi-package-variant-closed-remove</v-icon>
                    <div>
                        <div class="text-h6 font-weight-bold">{{ ordersPendingStock.length }} Pedido(s)</div>
                        <div class="text-subtitle-1">Aguardando Matéria-Prima</div>
                    </div>
                </v-card-text>
            </v-card>

             <v-card
                class="queue-card"
                variant="tonal"
                color="warning"
                @click="openQueueModal('schedule')"
            >
                <v-card-text class="d-flex align-center">
                     <v-icon size="40" class="mr-4">mdi-clock-alert-outline</v-icon>
                    <div>
                        <div class="text-h6 font-weight-bold">{{ totalMetersPendingSchedule.toLocaleString('pt-BR') }}m</div>
                        <div class="text-subtitle-1">Aguardando Agendamento</div>
                    </div>
                </v-card-text>
            </v-card>
        </div>

        <div class="d-flex flex-column flex-sm-row justify-space-between align-center ga-4 px-4 pb-4">
            <div class="d-flex align-center">
                <v-sheet height="12" width="12" color="cyan" rounded class="mr-2"></v-sheet>
                <span class="text-caption">Máquina MESA</span>
            </div>
            <div class="d-flex align-center">
                 <v-sheet height="12" width="12" color="amber" rounded class="mr-2"></v-sheet>
                <span class="text-caption">Máquina CORRIDA</span>
            </div>
             <v-spacer class="d-none d-sm-block"></v-spacer>
             <v-text-field
                v-model="searchQuery"
                variant="solo-filled"
                flat
                density="compact"
                label="Buscar cliente ou vendedor..."
                prepend-inner-icon="mdi-magnify"
                hide-details
                class="w-100"
                style="max-width: 300px;"
            ></v-text-field>
        </div>


        <div class="kanban-container d-none d-md-flex">
          <div v-for="day in weekDays" :key="day.date.toISOString()" class="kanban-column">
            <div class="column-header-kanban">
              <h4 class="font-weight-bold">{{ day.name }}</h4>
              <p class="text-caption text-grey">{{ getShortDate(day.date) }}</p>
              <v-progress-linear
                :model-value="(getDayProduction(day.date).total / getDailyLimit(day.date)) * 100"
                :color="isDayOverloaded(day.date) ? 'error' : 'primary'"
                height="6"
                rounded
                class="my-2"
              ></v-progress-linear>
              <v-chip size="small" variant="tonal">{{ getDayProduction(day.date).total.toLocaleString('pt-BR') }}m / {{ getDailyLimit(day.date).toLocaleString('pt-BR') }}m</v-chip>
            </div>
            <div class="kanban-content pa-2">
              <v-card v-for="entry in getEntriesForDay(day.date)" :key="entry.id" class="order-card-kanban my-2">
                <v-card-text class="pa-2 d-flex flex-column" @click="openDetailModal(entry.orders.id)">
                  <div class="d-flex justify-space-between align-center">
                    <p class="font-weight-bold text-body-2 text-truncate">{{ entry.orders.customer_name }}</p>
                    <v-chip size="x-small" :color="getMachineTypeForFabric(entry.orders.details.fabric_type) === 'MESA' ? 'cyan' : 'amber'" variant="flat">{{ entry.quantity_meters.toLocaleString('pt-BR') }}m</v-chip>
                  </div>
                  <p class="text-caption text-grey-lighten-1 mt-1">{{ entry.orders.details.fabric_type }}</p>

                  <v-spacer></v-spacer>

                  <div class="d-flex justify-space-between align-center mt-2">
                    <p class="text-caption text-grey">{{ entry.orders.creator?.full_name || 'N/A' }}</p>
                    <div v-if="userStore.isAdmin && entry.orders.has_down_payment && entry.orders.down_payment_proof_url">
                        <v-tooltip text="Comprovante de entrada anexado" location="top">
                            <template v-slot:activator="{ props }">
                                <a :href="getProofUrl(entry.orders.down_payment_proof_url)" target="_blank" @click.stop>
                                    <v-icon v-bind="props" class="pulsing-icon">mdi-receipt-text-check-outline</v-icon>
                                </a>
                            </template>
                        </v-tooltip>
                    </div>
                  </div>
                </v-card-text>
                <v-card-actions v-if="userStore.isAdmin && ['production_queue', 'in_printing', 'in_cutting'].includes(entry.orders.status)" class="pa-1 justify-center">
                    <v-btn color="primary" variant="tonal" size="small" @click="openFastTrackModal(entry.orders)">
                        <v-icon start>mdi-rocket-launch-outline</v-icon>
                        Adiantar Entrega
                    </v-btn>
                </v-card-actions>
                </v-card>
              <p v-if="getEntriesForDay(day.date).length === 0" class="text-caption text-grey text-center mt-4">Nenhum pedido agendado.</p>
            </div>
          </div>
        </div>

        <div class="d-md-none vertical-list-container">
            <div v-for="day in weekDays" :key="`mobile-${day.date.toISOString()}`" class="mb-6">
              <div class="vertical-day-header">
                <div class="d-flex justify-space-between align-baseline w-100">
                    <h3>{{ day.name }}</h3>
                    <span>{{ getShortDate(day.date) }}</span>
                </div>
                <div class="w-100 mt-2">
                    <v-progress-linear
                      :model-value="(getDayProduction(day.date).total / getDailyLimit(day.date)) * 100"
                      :color="isDayOverloaded(day.date) ? 'error' : 'primary'"
                      height="6"
                      rounded
                      class="my-2"
                    ></v-progress-linear>
                    <div class="text-center">
                        <v-chip size="small" variant="tonal">{{ getDayProduction(day.date).total.toLocaleString('pt-BR') }}m / {{ getDailyLimit(day.date).toLocaleString('pt-BR') }}m</v-chip>
                    </div>
                </div>
              </div>
              <div v-if="getEntriesForDay(day.date).length > 0" class="mt-4">
                <v-card v-for="entry in getEntriesForDay(day.date)" :key="`mobile-order-${entry.id}`" class="order-card-vertical mb-3" variant="flat">
                  <v-list-item lines="three" @click="openDetailModal(entry.orders.id)">
                    <v-list-item-title class="font-weight-bold text-body-1">{{ entry.orders.customer_name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ entry.orders.details.fabric_type }} <br>
                      <div class="d-flex justify-space-between align-center mt-1">
                        <span class="text-grey-lighten-2">Por: {{ entry.orders.creator?.full_name || 'N/A' }}</span>
                        <div v-if="userStore.isAdmin && entry.orders.has_down_payment && entry.orders.down_payment_proof_url">
                            <v-tooltip text="Comprovante de entrada anexado" location="top">
                                <template v-slot:activator="{ props }">
                                    <a :href="getProofUrl(entry.orders.down_payment_proof_url)" target="_blank" @click.stop>
                                        <v-icon v-bind="props" class="pulsing-icon" size="small">mdi-receipt-text-check-outline</v-icon>
                                    </a>
                                </template>
                            </v-tooltip>
                        </div>
                      </div>
                    </v-list-item-subtitle>
                    <template v-slot:append>
                      <div class="text-right">
                        <v-chip :color="getMachineTypeForFabric(entry.orders.details.fabric_type) === 'MESA' ? 'cyan' : 'amber'" variant="flat" class="mb-1">{{ entry.quantity_meters.toLocaleString('pt-BR') }}m</v-chip>
                      </div>
                    </template>
                  </v-list-item>
                   <v-card-actions v-if="userStore.isAdmin && ['production_queue', 'in_printing', 'in_cutting'].includes(entry.orders.status)" class="pa-1 justify-center">
                    <v-btn color="primary" variant="tonal" size="small" @click="openFastTrackModal(entry.orders)">
                        <v-icon start>mdi-rocket-launch-outline</v-icon>
                        Adiantar Entrega
                    </v-btn>
                  </v-card-actions>
                   </v-card>
              </div>
              <div v-else class="text-center text-grey-darken-1 pa-6">
                <v-icon>mdi-calendar-check</v-icon>
                <p class="mt-2 text-body-2">Nenhum pedido para este dia.</p>
              </div>
            </div>
          </div>
      </template>

      <v-card-text v-else class="d-flex justify-center align-center fill-height">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </v-card-text>
    </v-card>

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrderId" @close="showDetailModal = false"/>

    <v-dialog v-model="showQueueModal" max-width="900px" persistent>
      <v-card class="glassmorphism-card-dialog">
        <v-toolbar color="transparent">
            <v-toolbar-title class="font-weight-bold">{{ modalTitle }}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" @click="showQueueModal = false"></v-btn>
        </v-toolbar>
        <v-card-text>
            <v-data-table
                :headers="modalHeaders"
                :items="modalOrders"
                item-value="id"
                class="bg-transparent"
                density="compact"
            >
                <template v-slot:item.customer_name="{ item }">
                    <a @click.prevent="openDetailModal(item.id)" class="font-weight-bold clickable-link">{{ item.customer_name }}</a>
                </template>
                <template v-slot:item.quantity_meters="{ item }">
                    {{ item.quantity_meters.toLocaleString('pt-BR') }}m
                </template>
                  <template v-slot:item.creator.full_name="{ item }">
                    {{ item.creator?.full_name || 'N/A' }}
                </template>
                <template v-slot:item.created_at="{ item }">
                    {{ formatDate(item.created_at) }}
                </template>
            </v-data-table>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showFastTrackModal" max-width="500px" persistent>
        <v-card class="glassmorphism-card-dialog">
            <v-card-title class="dialog-header">
                <span class="text-h5">Adiantar Pedido?</span>
            </v-card-title>
            <v-card-text class="py-4">
                <p>
                    Tem certeza que deseja adiantar o pedido de <strong>{{ selectedOrderForFastTrack?.customer_name }}</strong>?
                </p>
                <p class="mt-2 text-medium-emphasis">
                    Esta ação irá mover o pedido diretamente para a fila de entregas, marcando-o como 'Concluído'.
                    A ação será registrada no histórico.
                </p>
            </v-card-text>
            <v-card-actions class="dialog-footer">
                <v-spacer></v-spacer>
                <v-btn text @click="closeFastTrackModal">Cancelar</v-btn>
                <v-btn color="primary" variant="flat" @click="confirmFastTrack" :loading="isFastTracking">
                    Confirmar
                </v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { format, startOfWeek, addDays, subDays, isSameDay, parseISO, endOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OrderDetailModal from '@/components/OrderDetailModal.vue';

type Order = {
  id: string;
  customer_name: string;
  status: string;
  created_at: string;
  quantity_meters: number;
  has_down_payment: boolean;
  down_payment_proof_url: string | null;
  details: {
    fabric_type: string;
    stamp_details: string;
  };
  creator?: {
    full_name: string;
  };
};

type ScheduleEntry = {
    id: number;
    scheduled_date: string;
    quantity_meters: number;
    orders: Order;
}

const userStore = useUserStore();
const allOrders = ref<Order[]>([]);
const scheduleEntries = ref<ScheduleEntry[]>([]);
const loading = ref(true);
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }));
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const showQueueModal = ref(false);
const modalTitle = ref('');
const modalOrders = ref<Order[]>([]);
const searchQuery = ref('');
const showFastTrackModal = ref(false);
const isFastTracking = ref(false);
const selectedOrderForFastTrack = ref<Order | null>(null);

const modalHeaders = [
    { title: 'Cliente', key: 'customer_name' },
    { title: 'Vendedor', key: 'creator.full_name' },
    { title: 'Tecido', key: 'details.fabric_type' },
    { title: 'Metragem', key: 'quantity_meters' },
    { title: 'Criado em', key: 'created_at' },
];

const filteredScheduleEntries = computed(() => {
    if (!searchQuery.value) {
        return scheduleEntries.value;
    }
    const query = searchQuery.value.toLowerCase();
    return scheduleEntries.value.filter(entry => {
        const customerName = entry.orders.customer_name?.toLowerCase() || '';
        const creatorName = entry.orders.creator?.full_name?.toLowerCase() || '';
        return customerName.includes(query) || creatorName.includes(query);
    });
});

const ordersPendingStock = computed(() => allOrders.value.filter(o => o.status === 'pending_stock'));
const ordersPendingSchedule = computed(() => allOrders.value.filter(o => o.status === 'scheduling_pending'));
const totalMetersPendingSchedule = computed(() => ordersPendingSchedule.value.reduce((sum, order) => sum + order.quantity_meters, 0));

const weekDays = computed(() => Array.from({ length: 6 }, (_, i) => ({ date: addDays(currentWeekStart.value, i), name: format(addDays(currentWeekStart.value, i), 'EEEE', { locale: ptBR }) })));
const weekRangeText = computed(() => `${format(currentWeekStart.value, 'dd MMM', { locale: ptBR })} - ${format(endOfWeek(currentWeekStart.value, { weekStartsOn: 1 }), 'dd MMM', { locale: ptBR })}`);
const isCurrentWeek = computed(() => isSameDay(startOfWeek(new Date(), { weekStartsOn: 1 }), currentWeekStart.value));

const nextWeek = () => { currentWeekStart.value = addDays(currentWeekStart.value, 7); };
const previousWeek = () => { currentWeekStart.value = subDays(currentWeekStart.value, 7); };
const getDailyLimit = (date: Date): number => getDay(date) === 6 ? 5000 : 14000;

const fabricMachineMap: Record<string, 'MESA' | 'CORRIDA'> = { 'Creponado': 'MESA', 'Tule': 'MESA', 'Fluity': 'MESA', 'Canelado': 'MESA', 'Suplex': 'MESA', 'Chiffon': 'MESA', 'Liganet': 'MESA', 'Crepinho': 'CORRIDA', 'Twill Fly': 'CORRIDA', 'Toque de seda': 'CORRIDA', 'Corta-Vento': 'CORRIDA', 'Tactel': 'CORRIDA', 'Alfaiataria': 'CORRIDA' };
const getMachineTypeForFabric = (fabric: string): 'MESA' | 'CORRIDA' => fabricMachineMap[fabric] || 'CORRIDA';

const getEntriesForDay = (date: Date) => {
    return filteredScheduleEntries.value.filter(entry => isSameDay(parseISO(entry.scheduled_date), date));
};
const getDayProduction = (date: Date) => {
    const dailyEntries = getEntriesForDay(date);
    const total = dailyEntries.reduce((sum, entry) => sum + entry.quantity_meters, 0);
    return { total };
};
const isDayOverloaded = (date: Date) => getDayProduction(date).total > getDailyLimit(date);
const openDetailModal = (orderId: string) => {
    selectedOrderId.value = orderId;
    showDetailModal.value = true;
};
const openQueueModal = (queueType: 'stock' | 'schedule') => {
    if (queueType === 'stock') {
        modalTitle.value = 'Pedidos Aguardando Matéria-Prima';
        modalOrders.value = ordersPendingStock.value;
    } else {
        modalTitle.value = 'Pedidos Aguardando Agendamento na Produção';
        modalOrders.value = ordersPendingSchedule.value;
    }
    showQueueModal.value = true;
};
const openFastTrackModal = (order: Order) => {
    selectedOrderForFastTrack.value = order;
    showFastTrackModal.value = true;
};

const closeFastTrackModal = () => {
    showFastTrackModal.value = false;
    selectedOrderForFastTrack.value = null;
};

// --- CORREÇÃO APLICADA AQUI ---
const confirmFastTrack = async () => {
    if (!selectedOrderForFastTrack.value || !userStore.profile?.id) return;
    isFastTracking.value = true;
    try {
        const { error } = await supabase.rpc('adiantar_pedido', {
            p_order_id: selectedOrderForFastTrack.value.id,
            p_admin_id: userStore.profile.id
        });
        if (error) throw error;

        // Em vez de manipular o array local, busca os dados novamente
        // para garantir que a visão esteja 100% atualizada com o banco.
        await fetchAllData();

        closeFastTrackModal();
    } catch (err: any) {
        console.error("Erro ao adiantar pedido:", err);
    } finally {
        isFastTracking.value = false;
    }
};

const getProofUrl = (path: string | null) => {
    if (!path) return '#';
    const { data } = supabase.storage.from('proofs').getPublicUrl(path);
    return data.publicUrl;
}

const fetchAllData = async () => {
  loading.value = true;
  try {
    const [ordersResponse, scheduleResponse] = await Promise.all([
      supabase
        .from('orders')
        .select(`*, creator:profiles!created_by(full_name)`)
        .in('status', ['pending_stock', 'scheduling_pending']),
      supabase
        .from('production_schedule')
        .select(`*, orders:order_id (*, creator:profiles!created_by(full_name))`)
        .gte('scheduled_date', format(subDays(new Date(), 90), 'yyyy-MM-dd'))
    ]);

    if (ordersResponse.error) throw ordersResponse.error;
    if (scheduleResponse.error) throw scheduleResponse.error;

    allOrders.value = ordersResponse.data || [];
    scheduleEntries.value = scheduleResponse.data || [];

  } catch (err: any) {
    console.error('Erro ao buscar dados da agenda:', err);
  } finally {
    loading.value = false;
  }
};
const getShortDate = (date: Date) => format(date, 'dd/MM');
const formatDate = (dateString: string) => format(new Date(dateString), "dd/MM/yy 'às' HH:mm", { locale: ptBR });
onMounted(fetchAllData);

</script>

<style scoped lang="scss">
// --- ESTILO CORRIGIDO E MELHORADO PARA O ÍCONE ---
@keyframes pulsing-glow {
  0% {
    color: #ffd700;
    text-shadow: 0 0 4px #ffd700, 0 0 8px #ffc400;
  }
  50% {
    color: #ffec8b;
    text-shadow: 0 0 8px #ffec8b, 0 0 16px #ffd700;
  }
  100% {
    color: #ffd700;
    text-shadow: 0 0 4px #ffd700, 0 0 8px #ffc400;
  }
}

.pulsing-icon {
    animation: pulsing-glow 2s linear infinite;
}

// --- AJUSTES DE LAYOUT DOS CARDS ---
.order-card-kanban .v-card-text {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.order-card-vertical .v-list-item-subtitle {
    line-height: 1.4;
}

// O restante dos estilos permanece o mesmo...
.glassmorphism-card {
  backdrop-filter: blur(15px);
  background-color: rgba(25, 25, 30, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  height: calc(100vh - 32px);
  max-height: 95vh;
  display: flex;
  flex-direction: column;
}
.header-toolbar .header-title { font-size: 1.5rem; }
.week-indicator { min-width: 150px; }
.queue-card {
    flex: 1;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 20px rgba(0,0,0,0.3);
    }
}
.kanban-container {
  overflow-x: auto;
  flex-grow: 1;
  padding: 8px;
  gap: 16px;
}
.kanban-column {
  flex: 1 1 0px;
  min-width: 280px;
  max-width: 320px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: rgba(255,255,255,0.05);
}
.column-header-kanban {
  text-align: center;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}
.kanban-content {
  overflow-y: auto;
  flex-grow: 1;
}
.order-card-kanban {
  background-color: rgba(50, 50, 60, 0.9);
  cursor: default;
  display: flex;
  flex-direction: column;
  min-height: 120px;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
  }
}
.vertical-list-container {
  padding: 16px;
  overflow-y: auto;
  flex-grow: 1;
}
.vertical-day-header {
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  h3 { font-size: 1.25rem; font-weight: 700; }
  span { opacity: 0.8; }
}
.order-card-vertical {
  background-color: rgba(45, 45, 55, 0.9) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}
.clickable-link {
    cursor: pointer;
    color: #4dd0e1;
    text-decoration: none;
    &:hover {
        text-decoration: underline;
    }
}
.dialog-header, .dialog-footer {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.dialog-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
