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
                color="info"
                @click="openQueueModal('design')"
            >
                <v-card-text class="d-flex align-center">
                    <v-icon size="40" class="mr-4">mdi-palette-outline</v-icon>
                    <div>
                        <div class="text-h6 font-weight-bold">{{ ghostItems.length }} Item(s)</div>
                        <div class="text-subtitle-1">Em Design (Fantasmas)</div>
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
                :model-value="(getDayProduction(day.date) / getDailyLimit(day.date)) * 100"
                :color="isDayOverloaded(day.date) ? 'error' : 'primary'"
                height="6"
                rounded
                class="my-2"
              ></v-progress-linear>
              <v-chip size="small" variant="tonal">{{ getDayProduction(day.date).toLocaleString('pt-BR') }}m / {{ getDailyLimit(day.date).toLocaleString('pt-BR') }}m</v-chip>
            </div>
            <div class="kanban-content pa-2">
              <v-card v-for="item in getScheduledItemsForDay(day.date)" :key="item.id" class="order-card-kanban my-2">
                <v-card-text class="pa-2 d-flex flex-column" @click="openDetailModal(item.order_id, item.id)">
                    <p class="font-weight-bold text-body-2 text-truncate">{{ item.order.customer_name }}</p>
                    <p class="text-caption text-grey-lighten-1 mt-1">{{ item.fabric_type }} - {{ item.stamp_ref }}</p>
                    <v-spacer></v-spacer>
                    <div class="d-flex justify-space-between align-center mt-2">
                      <p class="text-caption text-grey">{{ item.order.creator?.full_name || 'N/A' }}</p>
                      <v-chip size="x-small" :color="getMachineTypeForFabric(item.fabric_type) === 'MESA' ? 'cyan' : 'amber'" variant="flat">{{ item.quantity_meters.toLocaleString('pt-BR') }}m</v-chip>
                    </div>
                </v-card-text>
                 <v-card-actions v-if="userStore.isAdmin" class="pa-1 justify-center">
                    <v-btn color="primary" variant="tonal" size="small" @click="openFastTrackModal(item)">
                        <v-icon start>mdi-rocket-launch-outline</v-icon>
                        Adiantar Entrega
                    </v-btn>
                </v-card-actions>
              </v-card>

              <v-card v-for="ghost in getGhostItemsForDay(day.date)" :key="ghost.id" class="order-card-kanban ghost-card my-2" @click="openDetailModal(ghost.order_id, ghost.id)">
                <v-card-text class="pa-2 d-flex flex-column">
                    <p class="font-weight-bold text-body-2 text-truncate">{{ ghost.order.customer_name }}</p>
                     <p class="text-caption text-grey-lighten-1 mt-1">{{ ghost.stamp_ref }}</p>
                    <v-spacer></v-spacer>
                    <div class="d-flex justify-space-between align-center mt-2">
                      <p class="text-caption text-grey">{{ ghost.order.creator?.full_name || 'N/A' }}</p>
                       <v-chip size="x-small" color="purple" variant="flat">{{ ghost.quantity_meters.toLocaleString('pt-BR') }}m</v-chip>
                    </div>
                </v-card-text>
              </v-card>
               <p v-if="getScheduledItemsForDay(day.date).length === 0 && getGhostItemsForDay(day.date).length === 0" class="text-caption text-grey text-center mt-4">Nenhum pedido para este dia.</p>
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
                      :model-value="(getDayProduction(day.date) / getDailyLimit(day.date)) * 100"
                      :color="isDayOverloaded(day.date) ? 'error' : 'primary'"
                      height="6"
                      rounded
                      class="my-2"
                    ></v-progress-linear>
                    <div class="text-center">
                        <v-chip size="small" variant="tonal">{{ getDayProduction(day.date).toLocaleString('pt-BR') }}m / {{ getDailyLimit(day.date).toLocaleString('pt-BR') }}m</v-chip>
                    </div>
                </div>
              </div>
              <div v-if="getScheduledItemsForDay(day.date).length > 0 || getGhostItemsForDay(day.date).length > 0" class="mt-4">
                <v-card v-for="item in getScheduledItemsForDay(day.date)" :key="`mobile-order-${item.id}`" class="order-card-vertical mb-3" variant="flat">
                  <v-list-item lines="three" @click="openDetailModal(item.order_id, item.id)">
                    <v-list-item-title class="font-weight-bold text-body-1">{{ item.order.customer_name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ item.fabric_type }} - {{ item.stamp_ref }} <br>
                      <div class="d-flex justify-space-between align-center mt-1">
                        <span class="text-grey-lighten-2">Por: {{ item.order.creator?.full_name || 'N/A' }}</span>
                      </div>
                    </v-list-item-subtitle>
                    <template v-slot:append>
                      <div class="text-right">
                        <v-chip :color="getMachineTypeForFabric(item.fabric_type) === 'MESA' ? 'cyan' : 'amber'" variant="flat" class="mb-1">{{ item.quantity_meters.toLocaleString('pt-BR') }}m</v-chip>
                      </div>
                    </template>
                  </v-list-item>
                </v-card>
                 <v-card v-for="ghost in getGhostItemsForDay(day.date)" :key="`mobile-ghost-${ghost.id}`" class="order-card-vertical ghost-card mb-3" variant="flat" @click="openDetailModal(ghost.order_id, ghost.id)">
                   <v-list-item lines="three">
                    <v-list-item-title class="font-weight-bold text-body-1">{{ ghost.order.customer_name }}</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ ghost.stamp_ref }} <br>
                      <span class="text-grey-lighten-2">Por: {{ ghost.order.creator?.full_name || 'N/A' }}</span>
                    </v-list-item-subtitle>
                    <template v-slot:append>
                      <div class="text-right">
                        <v-chip color="purple" variant="flat" class="mb-1">{{ ghost.quantity_meters.toLocaleString('pt-BR') }}m</v-chip>
                      </div>
                    </template>
                  </v-list-item>
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

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrderId" :item-id="selectedItemId" @close="showDetailModal = false" @generatePdf="generatePdf"/>

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
                <span class="text-h5">Adiantar Item?</span>
            </v-card-title>
            <v-card-text class="py-4">
                <p>
                    Tem certeza que deseja adiantar o item <strong>{{ selectedItemForFastTrack?.stamp_ref }}</strong> do pedido de <strong>{{ selectedItemForFastTrack?.order.customer_name }}</strong>?
                </p>
                <p class="mt-2 text-medium-emphasis">
                    Esta ação irá mover o item diretamente para o status 'Concluído'. Se todos os outros itens do pedido também estiverem concluídos, o pedido será movido para a fila de entrega.
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
import { ref, onMounted, computed, onActivated } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { format, startOfWeek, addDays, subDays, isSameDay, parseISO, endOfWeek, getDay, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type OrderItem = {
  id: string; fabric_type: string; stamp_ref: string; quantity_meters: number;
  stamp_image_url: string; status: string; is_op_generated: boolean; order_id: string;
};

type Order = {
  id: string; customer_name: string; status: string; created_at: string;
  quantity_meters: number; is_launch: boolean;
  order_number: number;
  details: { fabric_type: string; stamp_details: string; } | null;
  creator?: { full_name: string; };
  order_items: OrderItem[];
};

type ScheduleEntry = {
    id: number;
    scheduled_date: string;
    quantity_meters: number;
    order_id: string;
    order_item_id: string;
    orders: Order;
}

type ScheduledItem = {
    id: string;
    order_id: string;
    scheduled_date: string;
    quantity_meters: number;
    fabric_type: string;
    stamp_ref: string;
    order: Order;
}

type GhostItem = {
    id: string;
    order_id: string;
    quantity_meters: number;
    stamp_ref: string;
    display_date: Date;
    order: Order;
}

const userStore = useUserStore();
const allOrders = ref<Order[]>([]);
const scheduleEntries = ref<ScheduleEntry[]>([]);
const loading = ref(true);
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }));
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const selectedItemId = ref<string | null>(null);
const showQueueModal = ref(false);
const modalTitle = ref('');
const modalOrders = ref<Order[]>([]);
const searchQuery = ref('');
const showFastTrackModal = ref(false);
const isFastTracking = ref(false);
const selectedItemForFastTrack = ref<ScheduledItem | null>(null);

const modalHeaders = [
    { title: 'Cliente', key: 'customer_name' },
    { title: 'Vendedor', key: 'creator.full_name' },
    { title: 'Tecido', key: 'details.fabric_type' },
    { title: 'Metragem', key: 'quantity_meters' },
    { title: 'Criado em', key: 'created_at' },
];

const statusDisplayMap: Record<string, string> = {
    design_pending: 'No Design',
    customer_approval: 'Aprovação Vendedor',
    approved_by_designer: 'Aprovado (Designer)',
    approved_by_seller: 'Aprovado (Vendedor)',
    production_queue: 'Fila de Produção',
    in_printing: 'Em Impressão',
    in_cutting: 'Em Corte',
    completed: 'Finalizado',
    pending_stock: 'Aguardando Estoque'
};


const ordersPendingStock = computed(() => allOrders.value.filter(o => o.status === 'pending_stock'));
const ordersPendingSchedule = computed(() => allOrders.value.filter(o => o.status === 'production_queue' && !scheduleEntries.value.some(se => se.order_id === o.id)));
const designAndApprovalStatuses = ['design_pending', 'customer_approval', 'changes_requested', 'approved_by_designer', 'approved_by_seller', 'finalizing'];
const ordersInDesign = computed(() => allOrders.value.filter(o => designAndApprovalStatuses.includes(o.status)));
const totalMetersPendingSchedule = computed(() => ordersPendingSchedule.value.reduce((sum, order) => sum + order.quantity_meters, 0));


const ghostItems = computed((): GhostItem[] => {
    const items: GhostItem[] = [];
    ordersInDesign.value.forEach(order => {
        if(order.is_launch){
            order.order_items.forEach(item => {
                if (designAndApprovalStatuses.includes(item.status)) {
                    const createdAt = parseISO(order.created_at);
                    const today = startOfToday();
                    let displayDate = createdAt;
                    if (isBefore(createdAt, today)) {
                        displayDate = today;
                    }
                    items.push({
                        id: item.id,
                        order_id: order.id,
                        quantity_meters: item.quantity_meters,
                        stamp_ref: item.stamp_ref,
                        display_date: displayDate,
                        order: order
                    })
                }
            })
        }
    });
    return items;
});


const filteredGhostItems = computed(() => {
    if (!searchQuery.value) return ghostItems.value;
    const query = searchQuery.value.toLowerCase();
    return ghostItems.value.filter(ghost =>
        ghost.order.customer_name?.toLowerCase().includes(query) ||
        ghost.order.creator?.full_name?.toLowerCase().includes(query)
    );
});

const scheduledItems = computed((): ScheduledItem[] => {
    return filteredScheduleEntries.value.map(entry => {
        const order = entry.orders;
        const item = order.order_items.find(i => i.id === entry.order_item_id);
        return {
            id: item?.id || order.id,
            order_id: order.id,
            scheduled_date: entry.scheduled_date,
            quantity_meters: entry.quantity_meters,
            fabric_type: item?.fabric_type || order.details?.fabric_type || 'N/A',
            stamp_ref: item?.stamp_ref || 'Item Único',
            order: order
        };
    });
});

const getScheduledItemsForDay = (date: Date) => {
    return scheduledItems.value.filter(item => isSameDay(parseISO(item.scheduled_date), date));
};
const getDayProduction = (date: Date) => {
    return getScheduledItemsForDay(date).reduce((sum, item) => sum + item.quantity_meters, 0);
};

const filteredScheduleEntries = computed(() => {
    if (!searchQuery.value) return scheduleEntries.value;
    const query = searchQuery.value.toLowerCase();
    return scheduleEntries.value.filter(entry =>
        entry.orders.customer_name?.toLowerCase().includes(query) ||
        entry.orders.creator?.full_name?.toLowerCase().includes(query)
    );
});

const weekDays = computed(() => Array.from({ length: 6 }, (_, i) => ({ date: addDays(currentWeekStart.value, i), name: format(addDays(currentWeekStart.value, i), 'EEEE', { locale: ptBR }) })));
const weekRangeText = computed(() => `${format(currentWeekStart.value, 'dd MMM', { locale: ptBR })} - ${format(endOfWeek(currentWeekStart.value, { weekStartsOn: 1 }), 'dd MMM', { locale: ptBR })}`);
const isCurrentWeek = computed(() => isSameDay(startOfWeek(new Date(), { weekStartsOn: 1 }), currentWeekStart.value));

const nextWeek = () => { currentWeekStart.value = addDays(currentWeekStart.value, 7); };
const previousWeek = () => { currentWeekStart.value = subDays(currentWeekStart.value, 7); };
const getDailyLimit = (date: Date): number => getDay(date) === 6 ? 5000 : 14000;

const fabricMachineMap: Record<string, 'MESA' | 'CORRIDA'> = { 'Creponado': 'MESA', 'Tule': 'MESA', 'Fluity': 'MESA', 'Canelado': 'MESA', 'Suplex': 'MESA', 'Chiffon': 'MESA', 'Liganet': 'MESA', 'Crepinho': 'CORRIDA', 'Twill Fly': 'CORRIDA', 'Toque de seda': 'CORRIDA', 'Corta-Vento': 'CORRIDA', 'Tactel': 'CORRIDA', 'Alfaiataria': 'CORRIDA' };
const getMachineTypeForFabric = (fabric: string): 'MESA' | 'CORRIDA' => fabricMachineMap[fabric] || 'CORRIDA';

const getGhostItemsForDay = (date: Date) => {
    return filteredGhostItems.value.filter(ghost => isSameDay(ghost.display_date, date));
};

const isDayOverloaded = (date: Date) => getDayProduction(date) > getDailyLimit(date);

const openDetailModal = (orderId: string, itemId: string | null = null) => {
    selectedOrderId.value = orderId;
    selectedItemId.value = itemId;
    showDetailModal.value = true;
};

const openQueueModal = (queueType: 'stock' | 'schedule' | 'design') => {
    if (queueType === 'stock') {
        modalTitle.value = 'Pedidos Aguardando Matéria-Prima';
        modalOrders.value = ordersPendingStock.value;
    } else if (queueType === 'schedule') {
        modalTitle.value = 'Pedidos Aguardando Agendamento';
        modalOrders.value = ordersPendingSchedule.value;
    } else {
        modalTitle.value = 'Lançamentos em Design';
        modalOrders.value = ordersInDesign.value;
    }
    showQueueModal.value = true;
};

const openFastTrackModal = (item: ScheduledItem) => {
    selectedItemForFastTrack.value = item;
    showFastTrackModal.value = true;
};

const closeFastTrackModal = () => {
    showFastTrackModal.value = false;
    selectedItemForFastTrack.value = null;
};

const confirmFastTrack = async () => {
    if (!selectedItemForFastTrack.value || !userStore.profile?.id) return;
    isFastTracking.value = true;
    try {
        const { error } = await supabase.rpc('adiantar_item_producao', {
            p_item_id: selectedItemForFastTrack.value.id,
            p_admin_id: userStore.profile.id
        });
        if (error) throw error;
        await fetchAllData();
        closeFastTrackModal();
    } catch (err: any) {
        console.error("Erro ao adiantar item:", err);
    } finally {
        isFastTracking.value = false;
    }
};

const fetchAllData = async () => {
  loading.value = true;
  try {
    const [ordersResponse, scheduleResponse] = await Promise.all([
      supabase
        .from('orders')
        .select(`*, creator:profiles!created_by(full_name), order_items(*)`),
      supabase
        .from('production_schedule')
        .select(`*, orders:order_id (*, creator:profiles!created_by(full_name), order_items(*))`)
        .gte('scheduled_date', format(subDays(new Date(), 90), 'yyyy-MM-dd'))
    ]);

    if (ordersResponse.error) throw ordersResponse.error;
    if (scheduleResponse.error) throw scheduleResponse.error;

    allOrders.value = ordersResponse.data || [];
    scheduleEntries.value = scheduleResponse.data.map(entry => ({ ...entry, orders: entry.orders as Order })) || [];

  } catch (err: any) {
    console.error('Erro ao buscar dados da agenda:', err);
  } finally {
    loading.value = false;
  }
};

const getShortDate = (date: Date) => format(date, 'dd/MM');
const formatDate = (dateString: string) => format(new Date(dateString), "dd/MM/yy 'às' HH:mm", { locale: ptBR });

const imageToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = reject;
        img.src = url;
    });
};


const generatePdf = async (item: OrderItem) => {
  const parentOrder = allOrders.value.find(o => o.id === item.order_id);

  if (!parentOrder) {
      alert("Erro: não foi possível encontrar os dados do pedido principal para gerar o PDF.");
      return;
  }
   try {
    const { data: opNumber, error: rpcError } = await supabase.rpc('generate_op_number', {
        p_item_id: item.id
    });
    if (rpcError) throw rpcError;

    const today = new Date().toISOString().split('T')[0];
    const { data: forecastDate, error: forecastError } = await supabase.rpc('calculate_delivery_forecast', {
        p_op_date: today
    });
    if (forecastError) throw forecastError;

    const formattedOpNumber = String(opNumber).padStart(4, '0');
    const formattedForecastDate = format(new Date(forecastDate), 'dd/MM/yyyy', { locale: ptBR });
    const formattedOrderNumber = String(parentOrder.order_number).padStart(4, '0');

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

    const logoUrl = 'https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Sem_nome_1080_x_800_px_1080_x_500_px_1080_x_400_px_1000_x_380_px_da020cf2-2bb9-4dac-8dd3-4548cfd2e5ae.png?v=1756811713';
    const [logoBase64, artBase64] = await Promise.all([
      imageToBase64(logoUrl),
      imageToBase64(item.stamp_image_url)
    ]);

    const logoProps = doc.getImageProperties(logoBase64);
    const logoWidth = 50;
    const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
    doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight);

    doc.setFontSize(9);
    doc.setTextColor(100);
    const companyInfo = [
      "MR JACKY - 20.631.721/0001-07",
      "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000",
      "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com"
    ];
    doc.text(companyInfo, pageWidth - 15, 15, { align: 'right' });

    const opTitle = `OP #${formattedOpNumber}`;
    const orderTitle = `Pedido #${formattedOrderNumber}`;
    const itemIndex = parentOrder.order_items.findIndex(oi => oi.id === item.id) + 1;
    const totalItems = parentOrder.order_items.length;
    const itemSubtitle = `Item ${itemIndex} de ${totalItems}`;

    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(opTitle, 15, 45);

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(orderTitle, pageWidth - 15, 45, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(itemSubtitle, pageWidth - 15, 51, { align: 'right' });

    doc.setLineWidth(0.5);
    doc.line(15, 55, pageWidth - 15, 55);

    autoTable(doc, {
        startY: 60,
        head: [['CLIENTE', 'VENDEDOR', 'EMISSÃO', 'PREVISÃO DE ENTREGA']],
        body: [[
            parentOrder.customer_name,
            parentOrder.creator?.full_name || 'N/A',
            format(new Date(), 'dd/MM/yyyy'),
            formattedForecastDate
        ]],
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
    });

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['PRODUTO (BASE)', 'SERVIÇO (ESTAMPA)', 'QUANTIDADE (MT)']],
        body: [[
            item.fabric_type,
            item.stamp_ref,
            item.quantity_meters.toLocaleString('pt-BR') + 'm'
        ]],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
    });

    let lastY = (doc as any).lastAutoTable.finalY;

    const artStartY = lastY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('ARTE APROVADA', 15, artStartY);

    const artX = 15;
    const artY = artStartY + 5;

    const maxImgWidth = pageWidth - (artX * 2);
    const maxImgHeight = pageHeight - artStartY - 45;

    const imgProps = doc.getImageProperties(artBase64);
    const ratio = Math.min(maxImgWidth / imgProps.width, maxImgHeight / imgProps.height);
    const imgWidth = imgProps.width * ratio;
    const imgHeight = imgProps.height * ratio;

    const imgXCentered = (pageWidth - imgWidth) / 2;

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.rect(imgXCentered - 1, artY - 1, imgWidth + 2, imgHeight + 2, 'S');

    doc.addImage(artBase64, 'PNG', imgXCentered, artY, imgWidth, imgHeight);

    const footerY = pageHeight - 15;
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('OP gerada com MJProcess', pageWidth / 2, footerY, { align: 'center' });

    doc.save(`OP-${formattedOpNumber}-${parentOrder.customer_name}-${item.stamp_ref}.pdf`);

  } catch (error: any) {
    console.error("Erro ao gerar PDF:", error);
    alert("Não foi possível gerar o PDF. Verifique se as imagens estão acessíveis e tente novamente.");
  }
};


onActivated(fetchAllData);
onMounted(fetchAllData);
</script>

<style scoped lang="scss">
@keyframes pulsing-glow {
  0% { color: #ffd700; text-shadow: 0 0 4px #ffd700, 0 0 8px #ffc400; }
  50% { color: #ffec8b; text-shadow: 0 0 8px #ffec8b, 0 0 16px #ffd700; }
  100% { color: #ffd700; text-shadow: 0 0 4px #ffd700, 0 0 8px #ffc400; }
}
.pulsing-icon { animation: pulsing-glow 2s linear infinite; }
.order-card-kanban .v-card-text { cursor: pointer; display: flex; flex-direction: column; flex-grow: 1; }
.order-card-vertical .v-list-item-subtitle { line-height: 1.4; }
.glassmorphism-card { backdrop-filter: blur(15px); background-color: rgba(25, 25, 30, 0.75); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; height: calc(100vh - 32px); max-height: 95vh; display: flex; flex-direction: column; }
.header-toolbar .header-title { font-size: 1.5rem; }
.week-indicator { min-width: 150px; }
.queue-card { flex: 1; cursor: pointer; transition: all 0.2s ease-in-out; &:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); } }
.kanban-container { overflow-x: auto; flex-grow: 1; padding: 8px; gap: 16px; }
.kanban-column { flex: 1 1 0px; min-width: 280px; max-width: 320px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; height: 100%; display: flex; flex-direction: column; background-color: rgba(255,255,255,0.05); }
.column-header-kanban { text-align: center; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); flex-shrink: 0; }
.kanban-content { overflow-y: auto; flex-grow: 1; }
.order-card-kanban { background-color: rgba(50, 50, 60, 0.9); cursor: pointer; display: flex; flex-direction: column; min-height: 120px; &:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important; } }
.ghost-card { opacity: 0.6; border: 2px dashed rgba(255, 255, 255, 0.4); background-color: rgba(80, 80, 90, 0.5); &:hover { opacity: 1; background-color: rgba(80, 80, 90, 0.8); } }
.vertical-list-container { padding: 16px; overflow-y: auto; flex-grow: 1; }
.vertical-day-header { padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); display: flex; flex-direction: column; align-items: center; h3 { font-size: 1.25rem; font-weight: 700; } span { opacity: 0.8; } }
.order-card-vertical { background-color: rgba(45, 45, 55, 0.9) !important; border: 1px solid rgba(255, 255, 255, 0.1); position: relative; }
.clickable-link { cursor: pointer; color: #4dd0e1; text-decoration: none; &:hover { text-decoration: underline; } }
.dialog-header, .dialog-footer { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
.dialog-footer { border-top: 1px solid rgba(255, 255, 255, 0.1); }
</style>
