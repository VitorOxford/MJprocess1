<template>
  <v-container fluid class="kanban-page-container">
    <v-toolbar color="transparent" class="mb-2 px-0">
      <v-toolbar-title class="font-weight-bold text-h5 d-flex align-center">
        <v-icon start size="32">mdi-view-dashboard-variant-outline</v-icon>
        Kanban de Produção
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-text-field
        v-model="search"
        variant="solo-filled"
        flat
        density="compact"
        label="Buscar por Pedido, Cliente, Vendedor ou Ref..."
        prepend-inner-icon="mdi-magnify"
        hide-details
        style="max-width: 400px;"
        clearable
      ></v-text-field>
    </v-toolbar>

     <div class="d-flex align-center justify-space-between mb-4 px-1">
        <div class="d-flex align-center">
            <v-btn icon="mdi-chevron-left" variant="text" @click="previousWeek"></v-btn>
            <div class="week-indicator mx-2 text-center">
              <div class="font-weight-bold">{{ weekRangeText }}</div>
            </div>
            <v-btn icon="mdi-chevron-right" variant="text" @click="nextWeek"></v-btn>
        </div>
        <div class="d-flex align-center ga-4">
          <div class="d-flex align-center text-caption"><v-sheet height="10" width="10" color="cyan" rounded class="mr-2"></v-sheet>Máquina MESA</div>
          <div class="d-flex align-center text-caption"><v-sheet height="10" width="10" color="amber" rounded class="mr-2"></v-sheet>Máquina CORRIDA</div>
        </div>
      </div>

    <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <div v-else class="kanban-board-container">
      <div class="kanban-board">
        <div v-for="day in weekDays" :key="day.date.toISOString()" class="kanban-column">
          <div class="column-header">
            <h4 class="font-weight-bold">{{ day.name }}</h4>
            <p class="text-caption text-grey">{{ getShortDate(day.date) }}</p>
            <v-progress-linear
              :model-value="(getDayProduction(day.date).total / getDailyLimit(day.date)) * 100"
              :color="isDayOverloaded(day.date) ? 'error' : 'primary'"
              height="6" rounded class="my-2"
            ></v-progress-linear>
            <v-chip size="small" variant="tonal">{{ formatMeters(getDayProduction(day.date).total) }}m / {{ formatMeters(getDailyLimit(day.date)) }}m</v-chip>
            <div class="limits-breakdown mt-2">
              <div class="limit-row">
                  <span class="text-caption">Mesa:</span>
                  <span class="text-caption font-weight-medium" :class="{'text-error': getDayProduction(day.date).mesa > dailyLimits.mesa}">
                      {{ formatMeters(getDayProduction(day.date).mesa) }}m
                  </span>
              </div>
              <div class="limit-row">
                  <span class="text-caption">Corrida:</span>
                  <span class="text-caption font-weight-medium" :class="{'text-error': getDayProduction(day.date).corrida > dailyLimits.corrida}">
                      {{ formatMeters(getDayProduction(day.date).corrida) }}m
                  </span>
              </div>
            </div>
          </div>
          <draggable
            :list="day.items"
            group="items"
            item-key="id"
            class="column-content custom-scrollbar"
            :data-date="day.date.toISOString().split('T')[0]"
            @end="onDragEnd"
            :disabled="!userStore.isAdmin"
          >
            <template #item="{ element: item }">
              <v-card
                class="order-card my-2"
                variant="flat"
                :data-id="item.id"
                :data-order-id="item.order_id"
              >
                <div class="card-border" :style="{'background-color': getMachineTypeForFabric(item.fabric_type) === 'MESA' ? 'var(--v-theme-cyan)' : 'var(--v-theme-amber)'}"></div>
                <v-card-text class="pa-3 pb-1" @click="openDetailModal(item.order_id, item.id)">
                    <p class="font-weight-bold text-body-1 text-truncate">{{ item.customer_name }}</p>
                    <p class="text-caption text-medium-emphasis">#{{ String(item.order_number).padStart(4, '0') }} / {{ item.stamp_ref }}</p>
                    <v-divider class="my-2"></v-divider>
                    <div class="d-flex justify-space-between align-center">
                        <v-chip size="x-small" :color="statusColorMap[item.status]" label variant="tonal" class="font-weight-bold">{{ statusDisplayMap[item.status] }}</v-chip>
                        <v-chip size="x-small" color="white" variant="flat" class="font-weight-bold">{{ formatMeters(item.quantity_meters) }}m</v-chip>
                    </div>
                </v-card-text>

                <v-card-actions v-if="userStore.isAdmin" class="pa-1 justify-center">
                    <v-btn color="info" variant="text" size="small" @click.stop="generatePdf(item)">
                        <v-icon start>mdi-file-pdf-box</v-icon>
                        Gerar OP
                    </v-btn>
                    <v-btn color="primary" variant="text" size="small" @click.stop="openFastTrackModal(item)">
                        <v-icon start>mdi-rocket-launch-outline</v-icon>
                        Adiantar
                    </v-btn>
                </v-card-actions>
                </v-card>
            </template>
          </draggable>
        </div>
      </div>
    </div>

    <OrderDetailModal
      :show="showDetailModal"
      :order-id="selectedOrderId"
      :item-id="selectedItemId"
      @close="closeDetailModal"
    />

    <v-dialog v-model="showFastTrackModal" max-width="500px" persistent>
        <v-card class="glassmorphism-card-dialog">
            <v-card-title class="dialog-header">
                <span class="text-h5">Adiantar Item?</span>
            </v-card-title>
            <v-card-text class="py-4">
                <p>
                    Tem certeza que deseja adiantar o item <strong>{{ selectedItemForFastTrack?.stamp_ref }}</strong> do pedido de <strong>{{ selectedItemForFastTrack?.customer_name }}</strong>?
                </p>
                <p class="mt-2 text-medium-emphasis">
                    Esta ação irá mover o item diretamente para o status 'Concluído'.
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
import { format, startOfWeek, addDays, subDays, isSameDay, parseISO, endOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import draggable from 'vuedraggable';
import { useUserStore } from '@/stores/user';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ProductionItem = {
  id: string; // item id
  order_id: string;
  order_number: number;
  customer_name: string;
  creator_name: string;
  fabric_type: string;
  stamp_ref: string;
  quantity_meters: number;
  status: string;
  scheduled_date: string;
  stamp_image_url?: string;
  production_start_date?: Date;
  unit_of_measure: 'metro' | 'kg' | null;
  quantity_unit: number | null;
  created_at: string;
  order_items: any[]; // Adicionado para ter o total de itens do pedido pai
};

const userStore = useUserStore();
const loading = ref(true);
const search = ref('');
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const selectedItemId = ref<string | null>(null);
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }));
const allProductionItems = ref<ProductionItem[]>([]);

const showFastTrackModal = ref(false);
const isFastTracking = ref(false);
const selectedItemForFastTrack = ref<ProductionItem | null>(null);

const dailyLimits = { mesa: 4000, corrida: 10000, overall: 14000, saturday: 5000 };
const fabricMachineMap: Record<string, 'MESA' | 'CORRIDA'> = {
  'Creponado': 'MESA', 'Tule': 'MESA', 'Fluity': 'MESA', 'Canelado': 'MESA', 'Suplex': 'MESA', 'Chiffon': 'MESA', 'Liganet': 'MESA',
  'Crepinho': 'CORRIDA', 'Twill Fly': 'CORRIDA', 'Toque de seda': 'CORRIDA', 'Corta-Vento': 'CORRIDA', 'Tactel': 'CORRIDA', 'Alfaiataria': 'CORRIDA'
};
const getMachineTypeForFabric = (fabric: string): 'MESA' | 'CORRIDA' => fabricMachineMap[fabric] || 'CORRIDA';

const statusDisplayMap: Record<string, string> = {
    production_queue: 'Na Fila', in_printing: 'Impressão', in_cutting: 'Corte', completed: 'Concluído'
};
const statusColorMap: Record<string, string> = {
    production_queue: 'grey', in_printing: 'info', in_cutting: 'warning', completed: 'success'
};

// **INÍCIO DA CORREÇÃO**
// Funções helper para cálculo de data, replicadas do Delivery.vue para garantir consistência
const addBusinessDays = (startDate: Date, days: number): Date => {
  const newDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < days) {
    newDate.setDate(newDate.getDate() + 1);
    if (newDate.getDay() !== 0) { // Não conta domingos
      addedDays++;
    }
  }
  return newDate;
};

const getNextDeliveryDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    while (true) {
        const dayOfWeek = newDate.getDay();
        if ([2, 4, 6].includes(dayOfWeek)) { // Terça, Quinta, Sábado
            return newDate;
        }
        newDate.setDate(newDate.getDate() + 1);
    }
};
// **FIM DA CORREÇÃO**


const weekRangeText = computed(() => `${format(currentWeekStart.value, 'dd MMM', { locale: ptBR })} - ${format(endOfWeek(currentWeekStart.value, { weekStartsOn: 1 }), 'dd MMM', { locale: ptBR })}`);
const nextWeek = () => { currentWeekStart.value = addDays(currentWeekStart.value, 7); };
const previousWeek = () => { currentWeekStart.value = subDays(currentWeekStart.value, 7); };
const getShortDate = (date: Date) => format(date, 'dd/MM');
const formatMeters = (meters: number) => Number(meters || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const getDailyLimit = (date: Date) => getDay(date) === 6 ? dailyLimits.saturday : dailyLimits.overall;
const isDayOverloaded = (date: Date) => {
    const prod = getDayProduction(date);
    return prod.total > getDailyLimit(date) || prod.mesa > dailyLimits.mesa || prod.corrida > dailyLimits.corrida;
}

const getProductionStartDate = (scheduledDateStr: string): Date => {
    const scheduledDate = parseISO(scheduledDateStr);
    let startDate = addDays(scheduledDate, 1);
    if (getDay(startDate) === 0) startDate = addDays(startDate, 1);
    return startDate;
};

const itemsWithStartDate = computed(() => {
    return allProductionItems.value.map(item => ({
        ...item,
        production_start_date: getProductionStartDate(item.scheduled_date)
    }));
});

const filteredItems = computed(() => {
    if (!search.value) return itemsWithStartDate.value;
    const query = search.value.toLowerCase();
    return itemsWithStartDate.value.filter(item =>
        item.customer_name.toLowerCase().includes(query) ||
        (item.creator_name && item.creator_name.toLowerCase().includes(query)) ||
        item.stamp_ref.toLowerCase().includes(query) ||
        String(item.order_number).includes(query)
    );
});

const weekDays = computed(() => {
    return Array.from({ length: 6 }, (_, i) => {
        const date = addDays(currentWeekStart.value, i);
        return {
            date,
            name: format(date, 'EEEE', { locale: ptBR }).split('-')[0],
            items: getItemsForDay(date)
        };
    });
});

const getItemsForDay = (date: Date) => {
    return filteredItems.value.filter(item =>
        item.production_start_date && isSameDay(item.production_start_date, date)
    );
};

const getDayProduction = (date: Date) => {
    const items = getItemsForDay(date);
    const mesa = items.filter(i => getMachineTypeForFabric(i.fabric_type) === 'MESA').reduce((sum, i) => sum + i.quantity_meters, 0);
    const corrida = items.filter(i => getMachineTypeForFabric(i.fabric_type) === 'CORRIDA').reduce((sum, i) => sum + i.quantity_meters, 0);
    return { mesa, corrida, total: mesa + corrida };
};

const openDetailModal = (orderId: string, itemId: string) => {
    selectedOrderId.value = orderId;
    selectedItemId.value = itemId;
    showDetailModal.value = true;
};
const closeDetailModal = () => { showDetailModal.value = false; };

const onDragEnd = async (event: any) => {
    const { item, to } = event;
    const itemId = item.dataset.id;
    const orderId = item.dataset.orderId;
    const newProductionStartDateStr = to.dataset.date;
    if (!itemId || !orderId || !newProductionStartDateStr) return;

    let newScheduledDate = subDays(parseISO(newProductionStartDateStr), 1);
    if (getDay(newScheduledDate) === 0) {
        newScheduledDate = subDays(newScheduledDate, 1);
    }
    const newScheduledDateStr = format(newScheduledDate, 'yyyy-MM-dd');

    const draggedItem = allProductionItems.value.find(i => i.id === itemId);
    if (draggedItem) {
        draggedItem.scheduled_date = newScheduledDateStr;
    }

    try {
        const { error } = await supabase
            .from('production_schedule')
            .update({ scheduled_date: newScheduledDateStr })
            .eq('order_id', orderId)
            .eq('order_item_id', itemId);
        if (error) throw error;
    } catch (err) {
        console.error("Erro ao reagendar:", err);
        fetchInProductionItems();
    }
};

const openFastTrackModal = (item: ProductionItem) => {
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
        await fetchInProductionItems();
        closeFastTrackModal();
    } catch (err: any) {
        console.error("Erro ao adiantar item:", err);
    } finally {
        isFastTracking.value = false;
    }
};

const fetchInProductionItems = async () => {
  loading.value = true;
  try {
    const productionStatuses = ['production_queue', 'in_printing', 'in_cutting', 'completed'];

    const { data, error } = await supabase
      .from('production_schedule')
      .select(`
        scheduled_date,
        order:orders!inner(id, customer_name, order_number, is_launch, details, status, quantity_meters, created_at, creator:created_by(full_name), order_items(id)),
        item:order_items!inner(id, status, quantity_meters, fabric_type, stamp_ref, stamp_image_url, unit_of_measure, quantity_unit)
      `)
      .in('item.status', productionStatuses);

    if (error) throw error;

    const formattedItems: ProductionItem[] = [];
    (data || []).forEach(entry => {
        if (entry.order.is_launch) {
            if (entry.item && productionStatuses.includes(entry.item.status)) {
                formattedItems.push({
                    id: entry.item.id, order_id: entry.order.id, order_number: entry.order.order_number,
                    customer_name: entry.order.customer_name, creator_name: entry.order.creator.full_name,
                    fabric_type: entry.item.fabric_type, stamp_ref: entry.item.stamp_ref,
                    quantity_meters: entry.item.quantity_meters, status: entry.item.status,
                    scheduled_date: entry.scheduled_date, stamp_image_url: entry.item.stamp_image_url,
                    unit_of_measure: entry.item.unit_of_measure, quantity_unit: entry.item.quantity_unit,
                    created_at: entry.order.created_at,
                    order_items: entry.order.order_items,
                });
            }
        }
    });

    allProductionItems.value = formattedItems;
  } catch (err) {
    console.error('Erro ao buscar itens em produção:', err);
  } finally {
    loading.value = false;
  }
};

const imageToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if(ctx) {
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              reject(new Error('Could not get canvas context'));
            }
        };
        img.onerror = reject;
        img.src = url;
    });
};

const generatePdf = async (item: ProductionItem) => {
  try {
    // 1. Gera o número da OP
    const { data: opNumber, error: rpcError } = await supabase.rpc('generate_op_number', { p_item_id: item.id });
    if (rpcError) throw rpcError;

    // 2. Busca a data de agendamento definitiva do banco
    const { data: schedule, error: scheduleError } = await supabase
      .from('production_schedule')
      .select('scheduled_date')
      .eq('order_item_id', item.id)
      .single();
    if (scheduleError) throw scheduleError;
    if (!schedule) throw new Error('Agendamento do item não encontrado.');

    // 3. Calcula a previsão de entrega USANDO A MESMA LÓGICA DO DELIVERY.VUE
    const completionDate = addBusinessDays(parseISO(schedule.scheduled_date), 3);
    const forecastDate = getNextDeliveryDay(completionDate);

    // 4. Prepara dados para o PDF
    const formattedOpNumber = String(opNumber).padStart(4, '0');
    const formattedForecastDate = format(forecastDate, 'dd/MM/yyyy', { locale: ptBR });
    const formattedOrderNumber = String(item.order_number).padStart(4, '0');

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    const [logoBase64, artBase64] = await Promise.all([
      imageToBase64('https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Sem_nome_1080_x_800_px_1080_x_500_px_1080_x_400_px_1000_x_380_px_da020cf2-2bb9-4dac-8dd3-4548cfd2e5ae.png?v=1756811713'),
      imageToBase64(item.stamp_image_url || '')
    ]);

    // 5. Constrói o PDF (estrutura completa restaurada)
    const logoProps = doc.getImageProperties(logoBase64);
    const logoWidth = 50;
    const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
    doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text([
      "MR JACKY - 20.631.721/0001-07",
      "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000",
      "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com"
    ], pageWidth - 15, 15, { align: 'right' });

    const itemIndex = item.order_items.findIndex(oi => oi.id === item.id) + 1;
    const totalItems = item.order_items.length;
    const itemSubtitle = `Item ${itemIndex} de ${totalItems}`;

    doc.setFontSize(18); doc.setTextColor(0); doc.text(`OP #${formattedOpNumber}`, 15, 45);
    doc.setFontSize(12); doc.text(`Pedido #${formattedOrderNumber}`, pageWidth - 15, 45, { align: 'right' });
    doc.setFontSize(10); doc.setTextColor(100); doc.text(itemSubtitle, pageWidth - 15, 51, { align: 'right' });
    doc.setLineWidth(0.5); doc.line(15, 55, pageWidth - 15, 55);

    autoTable(doc, {
        startY: 60,
        head: [['CLIENTE', 'VENDEDOR', 'EMISSÃO', 'PREVISÃO DE ENTREGA']],
        body: [[
            item.customer_name,
            item.creator_name || 'N/A',
            format(new Date(item.created_at), 'dd/MM/yyyy'),
            formattedForecastDate
        ]],
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
    });

    let quantityDisplay = `${item.quantity_meters.toLocaleString('pt-BR')}m`;
    if (item.unit_of_measure === 'kg') {
      const originalKg = item.quantity_unit?.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) || 'N/A';
      quantityDisplay = `${originalKg}kg (Rendimento: ~${item.quantity_meters.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}m)`;
    }

    autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['PRODUTO (BASE)', 'SERVIÇO (ESTAMPA)', 'QUANTIDADE']],
        body: [[ item.fabric_type, item.stamp_ref, quantityDisplay ]],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
    });

    const artStartY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('ARTE APROVADA', 15, artStartY);

    const artY = artStartY + 5;
    const maxImgWidth = pageWidth - 30;
    const maxImgHeight = pageHeight - artY - 25;
    const imgProps = doc.getImageProperties(artBase64);
    const ratio = Math.min(maxImgWidth / imgProps.width, maxImgHeight / imgProps.height);
    const imgWidth = imgProps.width * ratio;
    const imgHeight = imgProps.height * ratio;
    const imgXCentered = (pageWidth - imgWidth) / 2;

    doc.setDrawColor(180, 180, 180).setLineWidth(0.5).rect(imgXCentered - 1, artY - 1, imgWidth + 2, imgHeight + 2, 'S');
    doc.addImage(artBase64, 'PNG', imgXCentered, artY, imgWidth, imgHeight);

    const footerY = pageHeight - 15;
    doc.setFontSize(9).setTextColor(150).text('OP gerada com MJProcess', pageWidth / 2, footerY, { align: 'center' });

    doc.save(`OP-${formattedOpNumber}-${item.customer_name}-${item.stamp_ref}.pdf`);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert("Não foi possível gerar o PDF. Verifique se as imagens estão acessíveis e tente novamente.");
  }
};


onMounted(fetchInProductionItems);
</script>

<style scoped lang="scss">
.kanban-page-container {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
}
.week-indicator { min-width: 150px; }

.kanban-board-container {
  flex-grow: 1;
  overflow: hidden;
  padding-bottom: 8px;
}
.kanban-board {
  display: flex;
  gap: 1rem;
  height: 100%;
  overflow-x: auto;
  padding-bottom: 16px;
}
.kanban-column {
  min-width: 280px;
  max-width: 320px;
  width: 100%;
  flex: 1 1 0px;
  display: flex;
  flex-direction: column;
  background-color: rgba(30,30,35,0.7);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 100%;
}
.column-header {
  text-align: center;
  padding: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  text-transform: capitalize;
}
.limits-breakdown {
  width: 100%;
  padding: 4px 8px 0 8px;
  font-size: 0.75rem;
}
.limit-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #B0BEC5;
}
.column-content {
  padding: 8px;
  overflow-y: auto;
  flex-grow: 1;
  min-height: 0;
}
.order-card {
  background-color: rgba(45, 45, 55, 0.9);
  cursor: grab;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;

  &:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 6px 20px rgba(0,0,0,0.4) !important;
  }
  &:active {
    cursor: grabbing;
  }
}
.card-border {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
}
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
.glassmorphism-card-dialog {
  backdrop-filter: blur(20px) !important;
  background-color: rgba(30, 30, 30, 0.85) !important;
  border-radius: 12px !important;
}
.dialog-header, .dialog-footer {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.dialog-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
