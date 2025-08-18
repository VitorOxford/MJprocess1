<template>
  <v-container fluid class="delivery-container pa-md-6 pa-4">
    <v-toolbar color="transparent" class="mb-6">
      <v-toolbar-title class="font-weight-bold text-h5">
        <v-icon start size="x-large" class="mr-2">mdi-truck-delivery-outline</v-icon>
        Agenda de Entregas
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <div class="d-flex align-center">
        <v-btn icon="mdi-chevron-left" variant="text" @click="previousWeek"></v-btn>
        <div class="week-indicator mx-2 text-center" style="min-width: 180px;">
          <div class="font-weight-bold">{{ weekRangeText }}</div>
        </div>
        <v-btn icon="mdi-chevron-right" variant="text" @click="nextWeek"></v-btn>
      </div>
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
              <p class="text-caption text-grey">{{ toBeScheduledOrders.length }} pedido(s)</p>
            </div>
          </div>
          <draggable
            :list="toBeScheduledOrders"
            group="orders"
            item-key="id"
            class="column-content pa-3"
            ghost-class="ghost-card-placeholder"
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
                    <div class="text-info ml-auto" v-if="order.status !== 'completed'">
                      <v-icon size="x-small">mdi-clock-end</v-icon>
                      Finaliza em {{ formatDate(order.completion_date, 'dd/MM') }}
                    </div>
                    <div class="text-success ml-auto" v-else>
                      <v-icon size="x-small">mdi-check-decagram-outline</v-icon>
                      Pronto em {{ formatDate(order.completion_date, 'dd/MM') }}
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </template>
          </draggable>
        </div>

        <div v-for="day in weekDeliveryDays" :key="day.date.toISOString()" class="delivery-column">
          <div class="column-header">
            <v-icon class="header-icon">mdi-calendar-blank-outline</v-icon>
            <div>
              <h3 class="column-title text-h6">{{ day.name }}</h3>
              <p class="text-caption text-grey">{{ formatDate(day.date, 'dd/MM') }}</p>
            </div>
          </div>
          <draggable
            :list="day.orders"
            group="orders"
            item-key="id"
            class="column-content pa-3"
            :data-date="day.date.toISOString().split('T')[0]"
            ghost-class="ghost-card-placeholder"
            @end="onDragEnd"
            :disabled="isPast(day.date) && !userStore.isAdmin"
          >
            <template #item="{ element: order }">
               <v-card
                  class="order-card mb-4"
                  :class="{ 'ghost': order.status !== 'completed', 'confirmed': order.isConfirmed, 'past-delivery': isPast(day.date) }"
                  elevation="4"
                  @click="openDetailModal(order.id)"
                  :data-id="order.id"
                  :draggable="order.status === 'completed' && (!isPast(day.date) || userStore.isAdmin)"
                >
                  <v-icon v-if="order.isConfirmed" class="confirmed-icon" color="success">mdi-check-circle</v-icon>
                  <v-icon v-if="isPast(day.date) && order.isConfirmed" class="confirmed-icon" style="opacity: 0.6">mdi-lock</v-icon>
                  <v-card-text>
                      <div class="d-flex align-center justify-space-between mb-2">
                          <p class="font-weight-bold text-subtitle-1">{{ order.customer_name }}</p>
                          <v-chip size="small" variant="tonal" color="grey-lighten-1">{{ order.id.substring(0, 8) }}</v-chip>
                      </div>
                      <p class="info-line"><v-icon size="small">mdi-layers-triple-outline</v-icon> {{ order.details.fabric_type }}</p>
                      <p class="info-line"><v-icon size="small">mdi-ruler-square</v-icon> {{ order.quantity_meters }}m</p>
                  </v-card-text>
                <v-fade-transition>
                  <v-card-actions class="actions-overlay" v-if="!isPast(day.date) && order.status === 'completed' && !order.isConfirmed">
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
                  <v-card-actions class="actions-overlay" v-else-if="userStore.isAdmin && order.isConfirmed">
                     <v-tooltip text="Reverter Entrega (Admin)" location="top">
                        <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" icon="mdi-undo-variant" color="warning" variant="flat" size="small" @click.stop="rejectDelivery(order)"></v-btn>
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
            Histórico de Entregas Recentes (Últimos 30 dias)
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
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/api/supabase';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import draggable from 'vuedraggable';
import { useUserStore } from '@/stores/user';
import {
  format, addDays, startOfToday, getDay, isSameDay, parseISO, isBefore, startOfWeek, endOfWeek, subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Types
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

// Estado
const userStore = useUserStore();
const loading = ref(true);
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const allScheduledOrders = ref<Order[]>([]);
const toBeScheduledOrders = ref<Order[]>([]);
const deliveredOrders = ref<Order[]>([]);
const currentDeliveryWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }));

const historyHeaders = [
  { title: 'Cliente', key: 'customer_name' },
  { title: 'Data da Entrega', key: 'actual_delivery_date' },
  { title: 'Tecido', key: 'details.fabric_type' },
  { title: 'Metragem', key: 'quantity_meters' },
  { title: 'Vendedor', key: 'creator.full_name' },
];

// Lógica de Datas e Navegação
const isPast = (date: Date): boolean => isBefore(date, startOfToday());
const nextWeek = () => { currentDeliveryWeekStart.value = addDays(currentDeliveryWeekStart.value, 7); };
const previousWeek = () => { currentDeliveryWeekStart.value = subDays(currentDeliveryWeekStart.value, 7); };

const weekRangeText = computed(() => {
    const start = currentDeliveryWeekStart.value;
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return `${format(start, 'dd MMM', { locale: ptBR })} - ${format(end, 'dd MMM', { locale: ptBR })}`;
});

const weekDeliveryDays = computed(() => {
    const weekStart = currentDeliveryWeekStart.value;
    const daysOfWeekToDisplay = [
        { name: 'Terça-feira', dayOfWeek: 2 },
        { name: 'Quinta-feira', dayOfWeek: 4 },
        { name: 'Sábado', dayOfWeek: 6 },
    ];

    return daysOfWeekToDisplay.map(dayInfo => {
        let currentDateInWeek = weekStart;
        while (getDay(currentDateInWeek) !== dayInfo.dayOfWeek) {
            currentDateInWeek = addDays(currentDateInWeek, 1);
        }
        return {
            name: dayInfo.name,
            date: currentDateInWeek,
            orders: allScheduledOrders.value.filter(order =>
                order.actual_delivery_date && isSameDay(order.actual_delivery_date, currentDateInWeek)
            )
        };
    });
});

function addBusinessDays(date: Date, days: number): Date {
  const newDate = new Date(date);
  let addedDays = 0;
  const targetDays = Math.abs(days);
  const step = days > 0 ? 1 : -1;

  while (addedDays < targetDays) {
    newDate.setDate(newDate.getDate() + step);
    const dayOfWeek = newDate.getDay(); // Domingo = 0
    if (dayOfWeek !== 0) { // Não conta domingos
      addedDays++;
    }
  }
  return newDate;
}

const calculateInitialDeliveryDate = (completionDate: Date): Date => {
    let deliveryDate = addDays(new Date(completionDate), 1);
    const deliveryDaysOfWeek = [2, 4, 6]; // Terça, Quinta, Sábado
    while (!deliveryDaysOfWeek.includes(getDay(deliveryDate))) {
        deliveryDate = addDays(deliveryDate, 1);
    }
    return deliveryDate;
}

// Funções de Manipulação de Pedidos
const processAndDistributeOrders = (orders: Order[]) => {
  const scheduled: Order[] = [];
  const notScheduled: Order[] = [];
  const history: Order[] = [];
  const thirtyDaysAgo = subDays(startOfToday(), 30);

  orders.forEach(order => {
    order.completion_date = addBusinessDays(parseISO(order.production_date), 3);
    order.isConfirmed = !!order.delivery_confirmed_at;

    const deliveryDate = order.actual_delivery_date
      ? parseISO(order.actual_delivery_date as any)
      : calculateInitialDeliveryDate(order.completion_date);
    order.actual_delivery_date = deliveryDate;

    if (order.status === 'completed' && !order.actual_delivery_date) {
        notScheduled.push(order);
    } else {
        scheduled.push(order);
    }

    if (order.isConfirmed) {
        history.push(order);
    }
  });

  allScheduledOrders.value = scheduled;
  toBeScheduledOrders.value = notScheduled;
  deliveredOrders.value = history.filter(o => o.isConfirmed && isBefore(o.actual_delivery_date!, startOfToday())).sort((a, b) => (b.actual_delivery_date?.getTime() || 0) - (a.actual_delivery_date?.getTime() || 0));
};

const onDragEnd = async (event: any) => {
    const { item, to } = event;
    const orderId = item.dataset.id;
    const newDateStr = to.dataset.date;
    const toStatus = to.dataset.status;

    if (!orderId || !userStore.profile) return;

    const order = allScheduledOrders.value.find(o => o.id === orderId) || toBeScheduledOrders.value.find(o => o.id === orderId);
    if (order && order.status !== 'completed') {
        fetchScheduledOrders();
        return;
    }

    let newDate: string | null = null;
    if (toStatus !== 'to-be-scheduled' && newDateStr) {
        newDate = newDateStr;
    }

    try {
        const { error: updateError } = await supabase
            .from('production_schedule')
            .update({ actual_delivery_date: newDate })
            .eq('order_id', orderId);

        if (updateError) throw updateError;

        const description = newDate
            ? `Entrega reagendada para ${format(parseISO(newDate), 'dd/MM/yyyy', { locale: ptBR })}.`
            : 'Agendamento de entrega removido. Pedido retornado para a fila "Aguardando Envio".';

        const { error: logError } = await supabase.from('order_logs').insert({
            order_id: orderId,
            profile_id: userStore.profile.id,
            log_type: 'STATUS_CHANGE',
            description: description,
        });

        if (logError) throw logError;

    } catch (err: any) {
        console.error('Erro ao reagendar entrega:', err.message);
    } finally {
        await fetchScheduledOrders();
    }
}

const confirmDelivery = async (order: Order) => {
  if (!userStore.profile) return;
  try {
    await supabase
      .from('production_schedule')
      .update({ delivery_confirmed_at: new Date().toISOString() })
      .eq('order_id', order.id);

    const deliveryDateFormatted = order.actual_delivery_date ? formatDate(order.actual_delivery_date, 'dd/MM/yyyy') : 'data agendada';

    await supabase.from('order_logs').insert({
        order_id: order.id,
        profile_id: userStore.profile.id,
        log_type: 'STATUS_CHANGE',
        description: `Entrega confirmada para ${deliveryDateFormatted}.`
    });

    const orderInList = allScheduledOrders.value.find(o => o.id === order.id);
    if(orderInList) orderInList.isConfirmed = true;

  } catch (err: any) {
    console.error('Erro ao confirmar entrega:', err.message);
  }
};

const rejectDelivery = async (order: Order) => {
    if (!userStore.profile) return;
    try {
        await supabase
            .from('production_schedule')
            .update({ delivery_confirmed_at: null, actual_delivery_date: null })
            .eq('order_id', order.id);

        await supabase.from('order_logs').insert({
            order_id: order.id,
            profile_id: userStore.profile.id,
            log_type: 'STATUS_CHANGE',
            description: 'Agendamento de entrega revertido. Pedido retornou para a fila de agendamento.'
        });

        // Manually update local state for immediate feedback
        const index = allScheduledOrders.value.findIndex(o => o.id === order.id);
        if (index > -1) {
            const revertedOrder = allScheduledOrders.value.splice(index, 1)[0];
            revertedOrder.isConfirmed = false;
            revertedOrder.actual_delivery_date = null;
            toBeScheduledOrders.value.push(revertedOrder);
        }
        const historyIndex = deliveredOrders.value.findIndex(o => o.id === order.id);
        if (historyIndex > -1) {
            deliveredOrders.value.splice(historyIndex, 1);
        }

    } catch (err: any) {
        console.error('Erro ao cancelar entrega:', err.message);
        await fetchScheduledOrders(); // Refetch on error
    }
};

const openDetailModal = (orderId: string) => {
  selectedOrderId.value = orderId;
  showDetailModal.value = true;
};

const formatDate = (date: Date | string | undefined | null, formatString: string) => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  return format(dateObj, formatString, { locale: ptBR });
};

const fetchScheduledOrders = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, quantity_meters, status, production_date, details, creator:created_by(full_name), production_schedule!inner(delivery_confirmed_at, actual_delivery_date)')
      .in('status', ['completed', 'in_printing', 'in_cutting']);

    if (error) throw error;

    const formattedData = data?.map((order: any) => ({
      ...order,
      actual_delivery_date: order.production_schedule[0]?.actual_delivery_date,
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
  max-height: calc(100vh - 280px);
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
  position: relative;
  background-color: rgba(45, 45, 55, 0.9);
  transition: all 0.2s ease-in-out;
  border: 1px solid transparent;

  &.ghost {
    background-color: transparent;
    border: 2px dashed rgba(255, 255, 255, 0.3);
    box-shadow: none;
    cursor: not-allowed;
  }

  &:not(.ghost) {
    cursor: grab;
    &:hover {
      transform: translateY(-4px);
      border-color: rgba(var(--v-theme-primary), 0.5);
    }
    &:active {
      cursor: grabbing;
      transform: scale(0.98);
    }
  }

  &.confirmed {
    background-color: rgba(30, 60, 40, 0.8);
    cursor: default;
  }

  &.past-delivery {
    cursor: default;
    opacity: 0.7;
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

.ghost-card-placeholder {
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

.order-card:not(.past-delivery):not(.ghost):hover .actions-overlay {
  opacity: 1;
}

.order-card.past-delivery:not(.ghost):hover .actions-overlay {
  opacity: 1;
}

.confirmed-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 2rem;
    opacity: 0.5;
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
