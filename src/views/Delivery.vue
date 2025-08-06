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

    <div v-else class="delivery-board">
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
        >
          <template #item="{ element: order }">
            <v-card class="order-card mb-4" elevation="4">
              <v-card-text>
                <div class="d-flex align-center justify-space-between mb-2">
                  <p class="font-weight-bold text-subtitle-1">{{ order.customer_name }}</p>
                  <v-chip size="small" variant="tonal" color="grey-lighten-1">{{ order.id.substring(0, 8) }}</v-chip>
                </div>
                <p class="info-line"><v-icon size="small">mdi-layers-triple-outline</v-icon> {{ order.details.fabric_type }}</p>
                <p class="info-line"><v-icon size="small">mdi-ruler-square</v-icon> {{ order.quantity_meters }}m</p>

                <v-divider class="my-3"></v-divider>

                <div class="d-flex justify-space-between align-center text-caption">
                   <div v-if="order.suggested_delivery_date" class="text-amber">
                    <v-icon size="x-small">mdi-undo-variant</v-icon>
                    Sugerido: {{ formatDate(order.suggested_delivery_date, 'dd/MM') }}
                  </div>
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
          ghost-class="ghost-card"
        >
          <template #item="{ element: order }">
            <v-card class="order-card mb-4" elevation="4" :class="{ 'confirmed': order.isConfirmed }">
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
                <v-card-actions v-if="!order.isConfirmed" class="actions-overlay">
                  <v-tooltip text="Rejeitar" location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn v-bind="props" icon="mdi-close" color="error" variant="flat" size="small" @click="rejectDelivery(order, day)"></v-btn>
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Confirmar Entrega" location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn v-bind="props" icon="mdi-check" color="success" variant="flat" size="small" @click="confirmDelivery(order)"></v-btn>
                    </template>
                  </v-tooltip>
                </v-card-actions>
              </v-fade-transition>
            </v-card>
          </template>
        </draggable>
      </div>
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
import {
  format, addDays, startOfToday, getDay, nextTuesday,
  nextThursday, nextSaturday, isSameDay, parseISO, isAfter
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
  suggested_delivery_date?: Date | null;
  isConfirmed?: boolean;
};

type DeliveryDay = {
  name: string;
  date: Date;
  orders: Order[];
};

// Estado
const loading = ref(true);
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const toBeScheduledOrders = ref<Order[]>([]);
const deliveryDays = reactive<DeliveryDay[]>([]);

// Lógica de Datas e Inicialização
const today = startOfToday();
const getNextDeliveryDay = (date: Date, dayOfWeek: number) => {
  let result = dayOfWeek === 2 ? nextTuesday(date) : dayOfWeek === 4 ? nextThursday(date) : nextSaturday(date);
  if (getDay(date) === dayOfWeek && isAfter(date, addDays(today,-1))) {
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

// Funções de Manipulação de Pedidos
const processAndDistributeOrders = (orders: Order[]) => {
  const readyForScheduling: Order[] = [];
  deliveryDays.forEach(day => day.orders = []); // Limpa as colunas

  orders.forEach(order => {
    const productionStartDate = parseISO(order.production_date);
    const completionDate = addDays(productionStartDate, 3);
    order.completion_date = completionDate;

    if (isAfter(today, completionDate) || isSameDay(today, completionDate)) {
      let deliveryDate = new Date(completionDate);
      const deliveryDaysOfWeek = [2, 4, 6];
      while (!deliveryDaysOfWeek.includes(getDay(deliveryDate))) {
          deliveryDate = addDays(deliveryDate, 1);
      }
      order.suggested_delivery_date = deliveryDate;

      const targetDay = deliveryDays.find(d => isSameDay(d.date, deliveryDate));
      if (targetDay) {
        targetDay.orders.push({ ...order, isConfirmed: false });
      } else {
        readyForScheduling.push(order);
      }
    }
  });
  toBeScheduledOrders.value = readyForScheduling;
};

const confirmDelivery = (order: Order) => {
  order.isConfirmed = true;
  // TODO: Salvar no Supabase
  console.log(`Pedido ${order.id} confirmado para entrega.`);
};

const rejectDelivery = (order: Order, fromDay: DeliveryDay) => {
  fromDay.orders = fromDay.orders.filter(o => o.id !== order.id);
  toBeScheduledOrders.value.unshift({ ...order, isConfirmed: false }); // Adiciona no topo
  // TODO: Limpar data de entrega no Supabase
  console.log(`Pedido ${order.id} rejeitado. Voltando para a fila.`);
};


// Funções Auxiliares e de UI
const openDetailModal = (orderId: string) => {
  selectedOrderId.value = orderId;
  showDetailModal.value = true;
};

const formatDate = (date: Date | undefined, formatString: string) => {
  if (!date) return '';
  return format(date, formatString, { locale: ptBR });
};

// Busca de Dados
const fetchScheduledOrders = async () => {
  loading.value = true;
  initializeDeliveryDays();
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, quantity_meters, status, production_date, details')
      .not('production_date', 'is', null)
      .in('status', ['production_queue', 'in_printing', 'in_cutting', 'completed']);

    if (error) throw error;
    processAndDistributeOrders(data || []);
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
</style>
