<template>
  <v-container fluid class="delivery-container pa-md-6 pa-4">
    <v-toolbar color="transparent" class="mb-6">
      <v-toolbar-title class="font-weight-bold text-h5">
        <v-icon start size="x-large" class="mr-2">mdi-truck-delivery-outline</v-icon>
        Agenda de Entregas
      </v-toolbar-title>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      <p class="mt-4 text-body-2 text-grey-lighten-1">Calculando agenda de entregas...</p>
    </div>

    <div v-else>
      <div class="delivery-board">
        <div class="delivery-column to-be-scheduled-column">
          <div class="column-header">
            <v-icon class="header-icon">mdi-clipboard-clock-outline</v-icon>
            <div>
              <h3 class="column-title text-h6">Aguardando Envio</h3>
              <p class="text-caption text-grey">{{ toBeScheduledOrders.length }} pedido(s) pronto(s)</p>
            </div>
          </div>
          <draggable
            v-model="toBeScheduledOrders"
            group="orders"
            item-key="id"
            class="column-content pa-3"
            ghost-class="ghost-card"
            @end="onDragEnd"
            data-status="to-be-scheduled"
          >
            <template #item="{ element: order }">
              <v-card class="order-card mb-4" elevation="4" @click="openDetailModal(order.id)" :data-id="order.id">
                <v-card-text>
                  <div class="d-flex align-center justify-space-between mb-2">
                    <p class="font-weight-bold text-subtitle-1">{{ order.customer_name }}</p>
                    <v-chip size="small" variant="tonal" color="grey-lighten-1">{{ order.id.substring(0, 8) }}</v-chip>
                  </div>
                  <p class="info-line"><v-icon size="small">mdi-layers-triple-outline</v-icon> {{ order.details.fabric_type }}</p>
                  <p class="info-line"><v-icon size="small">mdi-ruler-square</v-icon> {{ order.quantity_meters }}m</p>
                  <v-divider class="my-3"></v-divider>
                  <div class="d-flex justify-space-between align-center text-caption">
                    <div class="text-success ml-auto">
                      <v-icon size="x-small">mdi-check-decagram-outline</v-icon>
                      Pronto em {{ formatDate(order.completion_date, 'dd/MM') }}
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </template>
          </draggable>
        </div>

        <div v-for="day in deliveryDays" :key="day.date.toISOString()" class="delivery-column">
          <div class="column-header">
            <v-icon class="header-icon">mdi-calendar-blank-outline</v-icon>
            <div>
              <h3 class="column-title text-h6">{{ day.name }}</h3>
              <p class="text-caption text-grey">{{ formatDate(day.date, 'dd/MM') }}</p>
            </div>
          </div>
          <draggable
            v-model="day.orders"
            group="orders"
            item-key="id"
            class="column-content pa-3"
            :data-date="day.date.toISOString()"
            ghost-class="ghost-card"
             @end="onDragEnd"
          >
            <template #item="{ element: order }">
              <v-card class="order-card mb-4" elevation="4" :class="{ 'confirmed': order.isConfirmed }" @click="openDetailModal(order.id)" :data-id="order.id">
                  <v-icon v-if="order.isConfirmed" class="confirmed-icon" color="success">mdi-check-circle</v-icon>
                  <v-card-text>
                      <div class="d-flex align-center justify-space-between mb-2">
                          <p class="font-weight-bold text-subtitle-1">{{ order.customer_name }}</p>
                          <v-chip size="small" variant="tonal" color="grey-lighten-1">{{ order.id.substring(0, 8) }}</v-chip>
                      </div>
                      <p class="info-line"><v-icon size="small">mdi-layers-triple-outline</v-icon> {{ order.details.fabric_type }}</p>
                      <p class="info-line"><v-icon size="small">mdi-ruler-square</v-icon> {{ order.quantity_meters }}m</p>
                  </v-card-text>
                <v-fade-transition>
                  <v-card-actions class="actions-overlay">
                    <v-tooltip text="Cancelar Agendamento" location="top">
                        <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" icon="mdi-close" color="red" variant="flat" size="small" @click.stop="rejectDelivery(order)"></v-btn>
                        </template>
                    </v-tooltip>
                    <v-tooltip text="Confirmar Entrega" location="top">
                      <template v-slot:activator="{ props }">
                        <v-btn v-bind="props" icon="mdi-check" color="success" variant="flat" size="small" @click.stop="confirmDelivery(order)"></v-btn>
                      </template>
                    </v-tooltip>
                  </v-card-actions>
                </v-fade-transition>
              </v-card>
            </template>
          </draggable>
        </div>
      </div>

      <v-card class="mt-8 history-card" color="rgba(30,30,35,0.8)">
        <v-toolbar color="transparent">
          <v-toolbar-title class="font-weight-bold">
            <v-icon start>mdi-history</v-icon>
            Histórico de Entregas Recentes
          </v-toolbar-title>
        </v-toolbar>
        <v-data-table
          :headers="historyHeaders"
          :items="deliveredOrders"
          class="bg-transparent"
          item-value="id"
          density="comfortable"
          hover
        >
          <template v-slot:item.actual_delivery_date="{ item }">
            <span>{{ formatDate(item.actual_delivery_date, 'dd/MM/yyyy') }}</span>
          </template>
          <template v-slot:item.customer_name="{ item }">
            <span class="font-weight-bold">{{ item.customer_name }}</span>
          </template>
           <template v-slot:item.quantity_meters="{ item }">
            <v-chip color="primary" variant="tonal" size="small">{{ item.quantity_meters }}m</v-chip>
          </template>
          <template v-slot:no-data>
            <div class="py-8 text-center text-grey">
              Nenhuma entrega concluída recentemente.
            </div>
          </template>
        </v-data-table>
      </v-card>
    </div>

    <OrderDetailModal
      :show="showDetailModal"
      :order-id="selectedOrderId"
      @close="showDetailModal = false"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { supabase } from '@/api/supabase';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import draggable from 'vuedraggable';
import { useUserStore } from '@/stores/user';
import {
  format, addDays, startOfToday, getDay, nextTuesday,
  nextThursday, nextSaturday, isSameDay, parseISO, isAfter, isBefore
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos
type Order = {
  id: string;
  customer_name: string;
  quantity_meters: number;
  status: string;
  production_date: string;
  details: { fabric_type: string; };
  completion_date?: Date;
  actual_delivery_date?: Date | null;
  delivery_confirmed_at?: string | null;
  isConfirmed?: boolean;
  creator: { full_name: string; } | null;
};

type DeliveryDay = {
  name: string;
  date: Date;
  orders: Order[];
};

// Estado
const userStore = useUserStore();
const loading = ref(true);
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const toBeScheduledOrders = ref<Order[]>([]);
const deliveryDays = reactive<DeliveryDay[]>([]);
const deliveredOrders = ref<Order[]>([]);

const historyHeaders = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Data da Entrega', key: 'actual_delivery_date' },
  { title: 'Tecido', key: 'details.fabric_type' },
  { title: 'Metragem', key: 'quantity_meters' },
  { title: 'Vendedor', key: 'creator.full_name' },
];

// Lógica de Datas
const today = startOfToday();
const getNextDeliveryDay = (date: Date, dayOfWeek: number) => {
  let result;
  if (dayOfWeek === 2) result = nextTuesday(date);
  else if (dayOfWeek === 4) result = nextThursday(date);
  else result = nextSaturday(date);

  if (getDay(date) === dayOfWeek && isAfter(date, addDays(today, -1))) {
    result = date;
  }
  return result;
};

const initializeDeliveryDays = () => {
  const days = [
    { name: 'Terça-feira', date: getNextDeliveryDay(addDays(today, -1), 2), orders: [] },
    { name: 'Quinta-feira', date: getNextDeliveryDay(addDays(today, -1), 4), orders: [] },
    { name: 'Sábado', date: getNextDeliveryDay(addDays(today, -1), 6), orders: [] },
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
  deliveryDays.splice(0, deliveryDays.length, ...days);
};

const calculateDeliveryDate = (completionDate: Date) => {
    let deliveryDate = new Date(completionDate);
    const deliveryDaysOfWeek = [2, 4, 6];
    while (!deliveryDaysOfWeek.includes(getDay(deliveryDate))) {
        deliveryDate = addDays(deliveryDate, 1);
    }
    return deliveryDate;
}

// Funções de Manipulação de Pedidos
const processAndDistributeOrders = (orders: Order[]) => {
  const readyForScheduling: Order[] = [];
  const history: Order[] = [];
  deliveryDays.forEach(day => day.orders = []);

  orders.forEach(order => {
    const productionStartDate = parseISO(order.production_date);
    order.completion_date = addDays(productionStartDate, 3);
    order.isConfirmed = !!order.delivery_confirmed_at;

    const actualDeliveryDate = calculateDeliveryDate(order.completion_date);
    order.actual_delivery_date = actualDeliveryDate;

    if (order.isConfirmed && isBefore(actualDeliveryDate, today)) {
        history.push(order);
        return;
    }

    if (order.status === 'completed') {
        const targetDay = deliveryDays.find(d => isSameDay(d.date, actualDeliveryDate));
        if (targetDay) {
            targetDay.orders.push(order);
        } else {
            readyForScheduling.push(order);
        }
    }
  });
  toBeScheduledOrders.value = readyForScheduling;
  deliveredOrders.value = history.sort((a, b) => (b.actual_delivery_date?.getTime() || 0) - (a.actual_delivery_date?.getTime() || 0));
};
const onDragEnd = async (event: any) => {
    const { item, to, from } = event;
    const orderId = item.dataset.id;
    const newDateStr = to.dataset.date;
    const fromStatus = from.dataset.status;

    if (!orderId) return;

    // Movido para uma coluna de data
    if (newDateStr) {
        const newDate = parseISO(newDateStr);
        // Aqui você pode adicionar lógica para salvar a nova data de entrega agendada no banco de dados, se necessário
    }
    // Movido de volta para "Aguardando Envio"
    else if (fromStatus !== 'to-be-scheduled') {
        const order = deliveryDays.flatMap(d => d.orders).find(o => o.id === orderId);
        if (order) {
            rejectDelivery(order);
        }
    }
}
const confirmDelivery = async (order: Order) => {
  if (!userStore.profile) return;
  try {
    const deliveryDay = deliveryDays.find(day => day.orders.some(o => o.id === order.id));
    const deliveryDate = deliveryDay ? deliveryDay.date : order.actual_delivery_date;

    await supabase
      .from('production_schedule')
      .update({ delivery_confirmed_at: new Date().toISOString() })
      .eq('order_id', order.id);

    const deliveryDateFormatted = deliveryDate ? formatDate(deliveryDate, 'dd/MM/yyyy') : 'data agendada';

    await supabase.from('order_logs').insert({
        order_id: order.id,
        profile_id: userStore.profile.id,
        log_type: 'STATUS_CHANGE',
        description: `Entrega confirmada para ${deliveryDateFormatted}.`
    });

    // Atualização visual imediata
    const day = deliveryDays.find(d => d.orders.some(o => o.id === order.id));
    if (day) {
        const orderInDay = day.orders.find(o => o.id === order.id);
        if(orderInDay) orderInDay.isConfirmed = true;
    }

  } catch (err: any) {
    console.error('Erro ao confirmar entrega:', err.message);
  }
};

const rejectDelivery = async (order: Order) => {
    if (!userStore.profile) return;
    try {
        await supabase
            .from('production_schedule')
            .update({ delivery_confirmed_at: null })
            .eq('order_id', order.id);

        await supabase.from('order_logs').insert({
            order_id: order.id,
            profile_id: userStore.profile.id,
            log_type: 'STATUS_CHANGE',
            description: 'Agendamento de entrega cancelado. Pedido retornou para a fila de agendamento.'
        });

        // Atualização visual imediata
        const day = deliveryDays.find(d => d.orders.some(o => o.id === order.id));
        if (day) {
            const index = day.orders.findIndex(o => o.id === order.id);
            if (index > -1) {
                const [movedOrder] = day.orders.splice(index, 1);
                movedOrder.isConfirmed = false;
                toBeScheduledOrders.value.push(movedOrder);
            }
        }
    } catch (err: any) {
        console.error('Erro ao cancelar entrega:', err.message);
    }
};

const openDetailModal = (orderId: string) => {
  selectedOrderId.value = orderId;
  showDetailModal.value = true;
};

const formatDate = (date: Date | string | undefined | null, formatString: string) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString, { locale: ptBR });
};

const fetchScheduledOrders = async () => {
  loading.value = true;
  initializeDeliveryDays();
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, quantity_meters, status, production_date, details, creator:created_by(full_name), production_schedule!inner(delivery_confirmed_at)')
      .eq('status', 'completed'); // Apenas pedidos concluídos podem ser agendados/entregues

    if (error) throw error;

    const formattedData = data?.map((order: any) => ({
      ...order,
      delivery_confirmed_at: order.production_schedule[0]?.delivery_confirmed_at,
    })) || [];

    processAndDistributeOrders(formattedData as Order[]);

  } catch (err: any) {
    console.error('Erro ao buscar pedidos para entrega:', err.message);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchScheduledOrders);
</script>

<style scoped lang="scss">
.delivery-container {
  padding: 1rem;
}

.delivery-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }
   @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.delivery-column {
  background-color: rgba(30, 30, 35, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: calc(100vh - 200px);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  }
}

.to-be-scheduled-column {
  background-color: rgba(60, 50, 70, 0.6);
}

.column-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  .column-title {
    font-weight: 600;
  }
}

.column-content {
  flex-grow: 1;
  overflow-y: auto;
  min-height: 200px;
}

.order-card {
  cursor: grab;
  position: relative;
  background-color: rgba(45, 45, 55, 0.9);
  transition: all 0.2s ease-in-out;
  border: 1px solid transparent;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(var(--v-theme-primary), 0.5);
  }

  &.confirmed {
    opacity: 0.8;
    background-color: rgba(30, 60, 40, 0.8);
    .v-card-text {
      opacity: 0.7;
    }
  }
  &:active {
    cursor: grabbing;
    transform: scale(0.98);
  }
}

.info-line {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #e0e0e0;
    margin-bottom: 4px;
}

.ghost-card {
  opacity: 0.5;
  background: rgba(var(--v-theme-primary), 0.2);
  border: 2px dashed rgba(var(--v-theme-primary), 0.5);
}

.actions-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  padding: 8px;
  display: flex;
  justify-content: center;
  gap: 16px;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.order-card:hover .actions-overlay {
  opacity: 1;
}

.confirmed-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 2rem;
    opacity: 0.5;
}

.empty-column {
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.5);
}
.history-card {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}
:deep(.v-data-table__wrapper) {
    background-color: transparent !important;
}
</style>
