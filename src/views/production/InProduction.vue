<template>
  <v-container fluid class="pa-md-8 pa-2 fill-height">
    <v-card class="glassmorphism-card mx-auto my-auto pa-2 pa-md-4">
      <v-toolbar color="transparent" class="mb-4 header-toolbar">
        <v-toolbar-title class="font-weight-bold header-title d-flex align-center">
          <v-icon start size="32">mdi-cog-sync-outline</v-icon>
          Kanban de Produção
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn
          icon="mdi-refresh"
          variant="text"
          @click="forceRefresh"
          :loading="loading"
          :disabled="loading"
        >
          <v-tooltip activator="parent" location="bottom">Atualizar Kanban</v-tooltip>
        </v-btn>
        </v-toolbar>

      <div class="d-flex flex-column flex-sm-row justify-space-between align-center ga-4 px-4 pb-4">
        <div class="d-flex align-center">
          <v-btn icon="mdi-chevron-left" variant="text" @click="previousWeek"></v-btn>
          <div class="week-indicator mx-2 text-center">
            <div class="font-weight-bold">{{ weekRangeText }}</div>
          </div>
          <v-btn icon="mdi-chevron-right" variant="text" @click="nextWeek"></v-btn>
        </div>
        <v-spacer class="d-none d-sm-block"></v-spacer>
        <v-text-field
          v-model="search"
          variant="solo-filled"
          flat
          density="compact"
          label="Buscar por Pedido, Cliente..."
          prepend-inner-icon="mdi-magnify"
          hide-details
          class="w-100"
          style="max-width: 300px;"
          clearable
        ></v-text-field>
      </div>

      <div v-if="loading" class="d-flex justify-center align-center fill-height">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <div v-else class="kanban-container d-flex">
        <div v-for="day in weekDays" :key="day.date.toISOString()" class="kanban-column">
          <div class="column-header-kanban">
            <div class="d-flex align-center justify-space-between w-100 mb-2">
                <div class="text-center flex-grow-1">
                    <h4 class="font-weight-bold">{{ day.name }}</h4>
                    <p class="text-caption text-grey">{{ getShortDate(day.date) }}</p>
                </div>
                <v-tooltip text="Gerar PDF do Dia" location="top">
                    <template v-slot:activator="{ props }">
                    <v-btn
                        v-bind="props"
                        v-if="day.items.length > 0"
                        :disabled="getDayProgress(day.date)?.generating"
                        :loading="getDayProgress(day.date)?.generating"
                        icon="mdi-file-pdf-box"
                        variant="text"
                        color="red-lighten-2"
                        size="small"
                        @click="generateDailyPdf(day)"
                    ></v-btn>
                    </template>
                </v-tooltip>
            </div>
             <div v-if="getDayProgress(day.date)?.generating" class="progress-container px-2">
                <span class="text-caption">
                    Gerando {{ getDayProgress(day.date)?.current }} / {{ getDayProgress(day.date)?.total }}
                </span>
                <v-progress-linear
                    :model-value="((getDayProgress(day.date)?.current || 0) / (getDayProgress(day.date)?.total || 1)) * 100"
                    color="primary"
                    height="6"
                    rounded
                    class="mt-1"
                ></v-progress-linear>
            </div>

            <v-chip size="small" variant="tonal" color="primary" class="mb-2">
              {{ formatMeters(getDayProduction(day.date).total) }}m / {{ formatMeters(getDailyLimit(day.date)) }}m
            </v-chip>
            <div class="limits-breakdown">
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
            class="kanban-content pa-2"
            :data-date="day.date.toISOString().split('T')[0]"
            @end="onDragEnd"
          >
            <template #item="{ element: item }">
              <v-card
                :data-id="item.id"
                class="order-card-kanban my-2"
                variant="flat"
                @mousemove="onCardMouseMove"
                @contextmenu.prevent
              >
                <div class="card-actions-menu">
                    <v-menu location="start" transition="slide-x-transition">
                        <template v-slot:activator="{ props }">
                            <v-btn icon="mdi-dots-vertical" v-bind="props" variant="text" size="small" @click.stop></v-btn>
                        </template>
                        <v-list density="compact" class="menu-list-styling" elevation="10">
                            <v-list-item prepend-icon="mdi-arrow-left-bold" @click="moveItem(item, -7)">
                                <v-list-item-title>Semana Anterior</v-list-item-title>
                            </v-list-item>
                            <v-list-item prepend-icon="mdi-arrow-right-bold" @click="moveItem(item, 7)">
                                <v-list-item-title>Próxima Semana</v-list-item-title>
                            </v-list-item>
                        </v-list>
                    </v-menu>
                </div>

                <v-card-text class="pa-3 d-flex flex-column" @click="openDetailModal(item.order_id, item.id)">
                  <div class="card-border-machine" :style="{'background-color': getMachineTypeForFabric(item.fabric_type) === 'MESA' ? 'var(--v-theme-cyan)' : 'var(--v-theme-amber)'}"></div>
                  <div>
                    <p class="customer-title text-truncate mb-1">{{ item.customer_name }}</p>
                  </div>
                  <div class="d-flex justify-space-between align-center mb-1">
                    <p class="text-caption text-medium-emphasis">#{{ String(item.order_number).padStart(4, '0') }} / {{ item.stamp_ref }}</p>
                    <v-chip size="x-small" :color="statusColorMap[item.status]" label variant="tonal" class="font-weight-bold status-chip">{{ statusDisplayMap[item.status] }}</v-chip>
                  </div>
                  <v-divider class="my-2"></v-divider>
                  <div class="d-flex justify-space-between align-center">
                    <span class="text-caption font-weight-bold text-truncate">{{ item.creator_name }}</span>
                    <v-chip size="x-small" color="white" variant="flat" class="font-weight-bold meters-chip">
                      {{ formatMeters(item.quantity_meters) }}m
                    </v-chip>
                  </div>
                </v-card-text>
              </v-card>
            </template>
            <template #footer>
                <p v-if="day.items.length === 0" class="text-caption text-grey text-center mt-4">Nenhum item para este dia.</p>
            </template>
          </draggable>
        </div>
      </div>

      <OrderDetailModal
        :show="showDetailModal"
        :order-id="selectedOrderId"
        :item-id="selectedItemId"
        @close="closeDetailModal"
      />
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onActivated } from 'vue';
import { supabase } from '@/api/supabase';
import { format, startOfWeek, addDays, subDays, isSameDay, parseISO, endOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useUserStore } from '@/stores/user';
import { useDashboardStore } from '@/stores/dashboard';
import { storeToRefs } from 'pinia';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import draggable from 'vuedraggable';

type ProductionItem = {
  id: string; order_id: string; order_number: number; customer_name: string;
  creator_name: string; fabric_type: string; stamp_ref: string; quantity_meters: number;
  status: string; scheduled_date: string; created_at: string;
  production_start_date?: Date;
  stamp_image_url?: string;
};

const userStore = useUserStore();
const dashboardStore = useDashboardStore();
const { productionScheduleItems, loading } = storeToRefs(dashboardStore);

const search = ref('');
const currentWeekStart = ref(startOfWeek(new Date(), { weekStartsOn: 1 }));

const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const selectedItemId = ref<string | null>(null);

const pdfProgress = ref<Record<string, {
  generating: boolean;
  current: number;
  total: number;
}>>({});

const dailyLimits = { mesa: 4000, corrida: 10000, overall: 14000, saturday: 5000 };

const fabricMachineMap: Record<string, 'MESA' | 'CORRIDA'> = {
  'tecido creponado': 'MESA', 'malha tulle': 'MESA', 'malha fluity': 'MESA', 'malha canelada': 'MESA', 'malha suplex': 'MESA', 'tecido chiffon': 'MESA', 'malha liganet': 'MESA',
  'tecido crepinho': 'CORRIDA', 'tecido twill fly': 'CORRIDA', 'tecido toque de seda': 'CORRIDA', 'tecido corta-vento': 'CORRIDA', 'tecido tactel': 'CORRIDA', 'tecido alfaiataria': 'CORRIDA'
};

const getMachineTypeForFabric = (fabric: string): 'MESA' | 'CORRIDA' => {
  const normalizedFabric = fabric?.trim().toLowerCase() || '';
  return fabricMachineMap[normalizedFabric] || 'CORRIDA';
};

const statusDisplayMap: Record<string, string> = {
    in_printing: 'Impressão', in_cutting: 'Corte'
};
const statusColorMap: Record<string, string> = {
    in_printing: 'info', in_cutting: 'warning'
};

const addBusinessDays = (startDate: Date, days: number): Date => {
  const newDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < days) {
    newDate.setDate(newDate.getDate() + 1);
    if (newDate.getDay() !== 0) {
      addedDays++;
    }
  }
  return newDate;
};

const getNextDeliveryDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    while (true) {
        const dayOfWeek = getDay(newDate);
        if ([2, 4, 6].includes(dayOfWeek)) {
            return newDate;
        }
        newDate.setDate(newDate.getDate() + 1);
    }
};

const itemsWithStartDate = computed(() => {
    const activeProductionStatuses = ['in_printing', 'in_cutting'];
    return productionScheduleItems.value
        .filter(p => activeProductionStatuses.includes(p.item.status))
        .map(p => ({
            ...p.item,
            order_id: p.order.id,
            order_number: p.order.order_number,
            customer_name: p.order.customer_name,
            creator_name: p.order.creator?.full_name || 'N/A',
            id: p.item.id,
            scheduled_date: p.scheduled_date,
            production_start_date: parseISO(p.scheduled_date),
            stamp_image_url: p.item.stamp_image_url
        }));
});

const filteredItems = computed(() => {
    if (!search.value) return itemsWithStartDate.value;
    const query = search.value.toLowerCase();
    return itemsWithStartDate.value.filter(item =>
        item.customer_name.toLowerCase().includes(query) ||
        (item.creator_name && item.creator_name.toLowerCase().includes(query)) ||
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

const getDayProgress = (date: Date) => {
  const dateKey = format(date, 'yyyy-MM-dd');
  return pdfProgress.value[dateKey];
};

const onDragEnd = async (event: any) => {
    const { item, to } = event;
    const itemId = item.dataset.id;
    const newDate = to.dataset.date;
    if (!itemId || !newDate) return;
    await rescheduleItem(itemId, newDate);
};

const onCardMouseMove = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  card.style.setProperty('--mouse-x', `${x}px`);
  card.style.setProperty('--mouse-y', `${y}px`);
};

const openDetailModal = (orderId: string, itemId: string) => {
    selectedOrderId.value = orderId;
    selectedItemId.value = itemId;
    showDetailModal.value = true;
};

const imageToBase64 = (url: string): Promise<string> => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        } else {
            reject(new Error('Contexto do canvas não obtido'));
        }
    };
    img.onerror = reject;
    img.src = url;
});

const generateDailyPdf = async (day: { date: Date; items: ProductionItem[] }) => {
  const dateKey = format(day.date, "yyyy-MM-dd");
  pdfProgress.value[dateKey] = { generating: true, current: 0, total: day.items.length };

  try {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Cabeçalho Padrão
    try {
        const logoUrl = 'https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Sem_nome_1080_x_800_px_1080_x_500_px_1080_x_400_px_1000_x_380_px_da020cf2-2bb9-4dac-8dd3-4548cfd2e5ae.png?v=1756811713';
        const logoBase64 = await imageToBase64(logoUrl);
        const logoProps = doc.getImageProperties(logoBase64);
        const logoWidth = 50;
        const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
        doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight);
    } catch (e) {
        console.error("ERRO: Não foi possível carregar o logo para o PDF", e);
    }

    // Informações da Empresa
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text([
      "MR JACKY - 20.631.721/0001-07",
      "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000",
      "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com"
    ], pageWidth - 15, 15, { align: 'right' });

    const formattedDate = format(day.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(0);
    doc.text('Relatório Diário de Produção', pageWidth / 2, 40, { align: 'center' });
    doc.setFontSize(11).setFont('helvetica', 'normal');
    doc.text(formattedDate, pageWidth / 2, 48, { align: 'center' });

    const groupedByOrder = day.items.reduce((acc, item) => {
        const orderId = item.order_number;
        if (!acc[orderId]) acc[orderId] = [];
        acc[orderId].push(item);
        return acc;
    }, {} as Record<string, ProductionItem[]>);

    const colorPalette = [
        [207, 216, 220], [179, 229, 252], [188, 239, 192], [255, 224, 178],
        [225, 190, 231], [178, 235, 242], [255, 249, 196], [255, 205, 210],
        [209, 196, 233], [197, 225, 165], [174, 214, 241], [249, 206, 238]
    ];
    const orderColors: Record<string, number[]> = {};
    const legendData: { text: string; color: number[] }[] = [];
    let colorIndex = 0;

    const tableBody = [];
    for (const orderNumber in groupedByOrder) {
        const items = groupedByOrder[orderNumber];
        const color = colorPalette[colorIndex % colorPalette.length];
        orderColors[orderNumber] = color;
        legendData.push({ text: `#${String(orderNumber).padStart(4, '0')} - ${items[0].customer_name}`, color });
        colorIndex++;

        for (const item of items) {
            pdfProgress.value[dateKey].current++;
            await new Promise(resolve => setTimeout(resolve, 10));
            const { data: opNumber } = await supabase.rpc('generate_op_number', { p_item_id: item.id });
            const completionDate = addBusinessDays(parseISO(item.scheduled_date), 3);
            const forecastDate = getNextDeliveryDay(completionDate);
            const formattedForecastDate = format(forecastDate, 'dd/MM/yyyy', { locale: ptBR });
            tableBody.push({
                orderNumber,
                cells: [`#${String(item.order_number).padStart(4, '0')}`, `#${String(opNumber).padStart(4, '0')}`, item.customer_name, item.creator_name, item.stamp_ref, item.fabric_type, `${formatMeters(item.quantity_meters)}m`, formattedForecastDate, '']
            });
        }
    }

    let startY = 55;
    if (legendData.length > 0) {
        doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(40, 40, 40).text('Legenda de Pedidos', 14, startY);
        startY += 5;
        let currentX = 15;
        legendData.forEach((legend) => {
            const textWidth = doc.getTextWidth(legend.text) + 7; // Add padding
            if (currentX + 5 + textWidth > pageWidth - 15) { // Check if it overflows
                startY += 6; // Move to next line
                currentX = 15; // Reset X position
            }
            doc.setFillColor(legend.color[0], legend.color[1], legend.color[2]);
            doc.rect(currentX, startY - 3.5, 4, 4, 'F');
            doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(50, 50, 50);
            doc.text(legend.text, currentX + 6, startY);
            currentX += 5 + textWidth + 4; // spacing between items
        });
        startY += 8; // Margin after legend
    }

    autoTable(doc, {
      startY: startY,
      head: [['Ped.', 'OP', 'Cliente', 'Vend.', 'Ref.', 'Tecido', 'Qtd.', 'Entrega', 'OK']],
      body: tableBody.map(row => row.cells),
      theme: 'grid',
      willDrawCell: (data) => {
         if (data.section === 'body' && tableBody[data.row.index]) {
              const rowOrderNumber = tableBody[data.row.index].orderNumber;
              const color = orderColors[rowOrderNumber];
              if (color) {
                  doc.setFillColor(color[0], color[1], color[2]);
              }
          }
      },
      columnStyles: {
        0: { cellWidth: 12 }, 1: { cellWidth: 12 }, 2: { cellWidth: 35 }, 3: { cellWidth: 25 },
        4: { cellWidth: 30 }, 5: { cellWidth: 25 }, 6: { cellWidth: 12, halign: 'right' },
        7: { cellWidth: 18 }, 8: { cellWidth: 10, halign: 'center' }
      },
      headStyles: { fillColor: [41, 128, 185], valign: 'middle', textColor: [255, 255, 255] },
      bodyStyles: { valign: 'middle', fontSize: 8, textColor: [0, 0, 0] },
    });

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9).setTextColor(150);
        doc.text('Gerado com MJProcess', pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
    }

    doc.save(`Producao_${format(day.date, 'yyyy-MM-dd')}.pdf`);
  } catch(error) {
      console.error("ERRO GERAL na geração do PDF:", error);
      alert("Ocorreu um erro inesperado ao gerar o PDF. Verifique o console para mais detalhes.")
  } finally {
    pdfProgress.value[dateKey].generating = false;
  }
};

const closeDetailModal = () => { showDetailModal.value = false; };

const weekRangeText = computed(() => `${format(currentWeekStart.value, 'dd MMM', { locale: ptBR })} - ${format(endOfWeek(currentWeekStart.value, { weekStartsOn: 1 }), 'dd MMM', { locale: ptBR })}`);
const nextWeek = () => { currentWeekStart.value = addDays(currentWeekStart.value, 7); };
const previousWeek = () => { currentWeekStart.value = subDays(currentWeekStart.value, 7); };
const getShortDate = (date: Date) => format(date, 'dd/MM');
const formatMeters = (meters: number) => Number(meters || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const getDailyLimit = (date: Date) => getDay(date) === 6 ? dailyLimits.saturday : dailyLimits.overall;
const getDayProduction = (date: Date) => {
    const items = getItemsForDay(date);
    const mesa = items.filter(i => getMachineTypeForFabric(i.fabric_type) === 'MESA').reduce((sum, i) => sum + i.quantity_meters, 0);
    const corrida = items.filter(i => getMachineTypeForFabric(i.fabric_type) === 'CORRIDA').reduce((sum, i) => sum + i.quantity_meters, 0);
    return { mesa, corrida, total: mesa + corrida };
};

const moveItem = async (item: ProductionItem, days: number) => {
  const newDate = addDays(parseISO(item.scheduled_date), days);
  await rescheduleItem(item.id, format(newDate, 'yyyy-MM-dd'));
};

const rescheduleItem = async (itemId: string, newDate: string) => {
  try {
    const { error } = await supabase.rpc('reschedule_production_item', {
      p_item_id: itemId,
      p_new_date: newDate,
    });
    if (error) throw error;
    await dashboardStore.fetchProductionSchedule();
  } catch (err) {
    console.error('Erro ao mover item:', err);
    alert('Falha ao mover o item.');
    await dashboardStore.fetchProductionSchedule();
  }
};

// ===== INÍCIO DA CORREÇÃO: Função para forçar a atualização =====
const forceRefresh = async () => {
  await dashboardStore.fetchProductionSchedule();
};
// ===== FIM DA CORREÇÃO =====

onActivated(async () => {
  await dashboardStore.fetchProductionSchedule();
});

onMounted(async () => {
  await dashboardStore.fetchProductionSchedule();
});
</script>

<style scoped lang="scss">
.kanban-page-container {
  height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
}

.week-indicator { min-width: 150px; }
.kanban-container {
  overflow-x: auto;
  flex-grow: 1;
  padding: 8px;
  gap: 16px;
  display: flex;
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
  padding: 12px 12px 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}
.kanban-content {
  overflow-y: auto;
  flex-grow: 1;
  min-height: 200px;
}
.order-card-kanban {
  position: relative;
  background-color: rgba(50, 50, 60, 0.9);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: 120px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.3s ease;

  &:active {
    cursor: grabbing;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
  }
}
.customer-title {
  font-size: 1rem;
  font-weight: 600;
  max-width: calc(100% - 30px);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #fff;
  letter-spacing: 0.01em;
}
.status-chip { margin-left: 8px; }
.meters-chip { margin-left: 8px; background-color: rgba(255, 255, 255, 0.8) !important; color: #1E1E1E !important; }
.card-border-machine {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  z-index: 3;
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

.card-actions-menu {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 10;
}

.menu-list-styling {
  background-color: rgba(45, 45, 50, 0.9) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px !important;

  :deep(.v-list-item) {
    .v-list-item-title {
      font-size: 0.9rem;
      font-weight: 500;
    }
    .v-icon {
      opacity: 0.8;
    }
    &:hover {
      background-color: rgba(var(--v-theme-primary), 0.15) !important;
    }
  }
}

.progress-container {
    height: 30px;
    margin-bottom: 8px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
</style>
