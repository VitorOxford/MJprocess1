<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="1400px" persistent>
    <v-card class="report-modal-card">
      <v-toolbar color="transparent" density="compact">
        <v-toolbar-title class="font-weight-bold d-flex align-center">
          <v-icon start class="mr-2">mdi-file-chart-outline</v-icon>
          Relatórios Avançados
        </v-toolbar-title>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="$emit('close')"></v-btn>
      </v-toolbar>

      <v-tabs v-model="tab" color="primary" class="mb-4" grow>
        <v-tab value="general">Relatório de Pedidos</v-tab>
        <v-tab value="stock">Auditoria de Estoque</v-tab>
      </v-tabs>

      <v-window v-model="tab" class="dialog-window">
        <v-window-item value="general">
          <v-card-text class="pa-6">
            <p class="text-body-2 text-medium-emphasis mb-6">Utilize os filtros abaixo para gerar um relatório detalhado em PDF com os pedidos que correspondem aos critérios selecionados.</p>
            <div class="filter-section"><label class="filter-label">Período</label><v-chip-group v-model="periodSelection" @update:model-value="setPeriodForGeneralReport" color="primary" variant="outlined" class="mb-4" mandatory><v-chip filter value="7d">Últimos 7 dias</v-chip><v-chip filter value="30d">Últimos 30 dias</v-chip><v-chip filter value="this_month">Este Mês</v-chip><v-chip filter value="custom">Personalizado</v-chip></v-chip-group><v-row v-if="periodSelection === 'custom'"><v-col cols="12" sm="6"><v-text-field type="date" v-model="customStartDate" label="Data de Início" density="compact" variant="outlined"></v-text-field></v-col><v-col cols="12" sm="6"><v-text-field type="date" v-model="customEndDate" label="Data de Fim" density="compact" variant="outlined"></v-text-field></v-col></v-row></div>
            <v-row class="mt-4"><v-col cols="12" sm="6"><div class="filter-section"><label class="filter-label">Vendedor</label><v-autocomplete v-model="selectedSellers" :items="sellers" variant="outlined" density="compact" placeholder="Todos" multiple chips closable-chips clearable></v-autocomplete></div></v-col><v-col cols="12" sm="6"><div class="filter-section"><label class="filter-label">Cliente</label><v-autocomplete v-model="selectedClients" :items="clients" variant="outlined" density="compact" placeholder="Todos" multiple chips closable-chips clearable></v-autocomplete></div></v-col><v-col cols="12" sm="6"><div class="filter-section"><label class="filter-label">Base (Tecido)</label><v-autocomplete v-model="selectedFabrics" :items="fabrics" variant="outlined" density="compact" placeholder="Todas" multiple chips closable-chips clearable></v-autocomplete></div></v-col><v-col cols="12" sm="6"><div class="filter-section"><label class="filter-label">Status do Pedido</label><v-select v-model="selectedStatus" :items="statusOptions" item-title="text" item-value="value" variant="outlined" density="compact" placeholder="Todos" clearable></v-select></div></v-col></v-row>
          </v-card-text>
          <v-card-actions class="dialog-footer pa-4"><div class="text-caption text-grey">{{ filteredReportItems.length }} pedido(s) encontrado(s)</div><v-spacer></v-spacer><v-btn @click="generatePdf" :loading="isGeneratingPdf" color="primary" variant="flat" size="large" class="modern-button"><v-icon start>mdi-file-pdf-box</v-icon>Gerar Relatório de Pedidos</v-btn></v-card-actions>
        </v-window-item>

        <v-window-item value="stock">
          <v-row class="ma-0 pa-2" style="min-height: 70vh;">
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="fill-height">
                <v-card-title class="text-subtitle-1 font-weight-bold">Filtros da Auditoria</v-card-title>
                <v-divider></v-divider>
                <v-card-text>
                  <v-form @submit.prevent="fetchStockMovements">
                    <label class="filter-label">Período</label>
                    <v-menu :close-on-content-click="false" location="end">
                      <template v-slot:activator="{ props }">
                        <v-text-field v-bind="props" :model-value="auditDateRangeText" label="Selecione um período" density="compact" variant="outlined" readonly prepend-inner-icon="mdi-calendar"></v-text-field>
                      </template>
                      <v-date-picker v-model="auditDates" range color="secondary"></v-date-picker>
                    </v-menu>

                    <label class="filter-label mt-4">Usuário</label>
                    <v-autocomplete v-model="filterByUser" :items="availableUsers" label="Todos os usuários" density="compact" variant="outlined" clearable></v-autocomplete>

                    <label class="filter-label mt-4">Base (Tecido)</label>
                    <v-autocomplete v-model="filterByFabric" :items="availableFabrics" label="Todas as bases" density="compact" variant="outlined" clearable></v-autocomplete>

                    <label class="filter-label mt-4">Número do Pedido</label>
                    <v-text-field v-model="filterByOrderNumber" label="Ex: 409" density="compact" variant="outlined" clearable prepend-inner-icon="mdi-pound"></v-text-field>
                  </v-form>
                </v-card-text>
                <v-spacer></v-spacer>
                <v-card-actions class="pa-4">
                  <v-btn @click="fetchStockMovements" :loading="isLoadingMovements" color="secondary" variant="flat" block class="modern-button"><v-icon start>mdi-magnify</v-icon>Buscar Período</v-btn>
                </v-card-actions>
              </v-card>
            </v-col>

            <v-col cols="12" md="8">
              <v-card variant="outlined" class="fill-height">
                <v-toolbar density="compact" color="transparent">
                  <v-toolbar-title class="text-subtitle-1">{{ filteredMovements.length }} movimentações encontradas</v-toolbar-title>
                  <v-spacer></v-spacer>
                  <v-btn @click="generateAuditPdf" :loading="isGeneratingAuditPdf" :disabled="filteredMovements.length === 0" color="primary" variant="tonal" size="small"><v-icon start>mdi-file-pdf-box</v-icon>Emitir Relatório</v-btn>
                </v-toolbar>
                <v-divider></v-divider>

                <div class="results-container">
                  <v-skeleton-loader v-if="isLoadingMovements" type="list-item-avatar-three-line@6" class="pa-4"></v-skeleton-loader>

                  <div v-else-if="!stockMovements.length" class="d-flex fill-height align-center justify-center">
                    <v-empty-state headline="Nenhum dado para o período" text="Selecione um período e clique em 'Buscar' para iniciar a auditoria." icon="mdi-magnify"></v-empty-state>
                  </div>

                  <div v-else-if="!filteredMovements.length" class="d-flex fill-height align-center justify-center">
                    <v-empty-state headline="Nenhum resultado encontrado" text="Nenhuma movimentação corresponde aos filtros aplicados. Tente refinar sua busca." icon="mdi-filter-off-outline"></v-empty-state>
                  </div>

                  <v-timeline v-else align="start" density="compact" side="end" class="pa-4">
                    <TransitionGroup name="list">
                      <v-timeline-item
                        v-for="item in timelineItems"
                        :key="item.id"
                        :dot-color="item.color"
                        :icon="item.icon"
                        fill-dot
                        size="small"
                      >
                        <v-card class="timeline-card" variant="tonal">
                          <v-card-text class="pa-3">
                            <div class="d-flex justify-space-between align-start">
                              <div>
                                <p class="text-subtitle-1 font-weight-bold">{{ item.title }}</p>
                                <p class="text-caption text-medium-emphasis">{{ item.timestamp }} por <strong>{{ item.user }}</strong></p>
                              </div>
                              <v-chip :color="item.color" size="small" label>{{ item.type_display }}</v-chip>
                            </div>
                            <v-divider class="my-2"></v-divider>
                            <div class="d-flex justify-space-between align-center mt-2">
                              <v-chip size="small" prepend-icon="mdi-texture-box">{{ item.fabric_type }}</v-chip>
                              <div class="d-flex flex-column align-end">
                                <span class="text-h6 font-weight-bold" :class="`text-${item.color}`">{{ item.quantity_display }}</span>
                                <span class="text-caption text-medium-emphasis">Estoque: {{ item.old_quantity.toFixed(2) }}m <v-icon size="x-small">mdi-arrow-right</v-icon> {{ item.new_quantity.toFixed(2) }}m</span>
                              </div>
                            </div>
                          </v-card-text>
                        </v-card>
                      </v-timeline-item>
                    </TransitionGroup>
                  </v-timeline>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>
      </v-window>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { format, subDays, startOfDay, endOfDay, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/api/supabase';

// --- PROPS & EMITS ---
const props = defineProps<{ show: boolean; orders: any[]; sellers: string[]; clients: string[]; fabrics: string[]; }>();
const emit = defineEmits(['close']);

// --- ESTADO GERAL ---
const tab = ref('general');

// --- ESTADO: RELATÓRIO DE PEDIDOS (Aba 1) ---
const isGeneratingPdf = ref(false);
const periodSelection = ref('30d');
const customStartDate = ref(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
const customEndDate = ref(format(new Date(), 'yyyy-MM-dd'));
const selectedSellers = ref<string[]>([]);
const selectedClients = ref<string[]>([]);
const selectedFabrics = ref<string[]>([]);
const selectedStatus = ref<string | null>(null);
const statusOptions = [ { value: 'design_pending', text: 'Em design' }, { value: 'customer_approval', text: 'Aprovação do vendedor' }, { value: 'completed', text: 'Completado' }, { value: 'production_queue', text: 'Em produção' }, { value: 'delivered', text: 'Entregue' } ];

// --- ESTADO: AUDITORIA DE ESTOQUE (Aba 2) ---
const isLoadingMovements = ref(false);
const isGeneratingAuditPdf = ref(false);
const auditDates = ref([startOfDay(new Date()), endOfDay(new Date())]);
const stockMovements = ref<any[]>([]);
const fetchError = ref<string | null>(null);
const filterByUser = ref<string | null>(null);
const filterByFabric = ref<string | null>(null);
const filterByOrderNumber = ref('');

// --- COMPUTED: AUDITORIA DE ESTOQUE (Aba 2) ---
const auditDateRangeText = computed(() => {
  if (!auditDates.value || auditDates.value.length === 0) return 'Nenhum período selecionado';
  const [start, end] = auditDates.value;
  return `${format(start, 'dd/MM/yy')} - ${format(end || start, 'dd/MM/yy')}`;
});

const availableUsers = computed(() => [...new Set(stockMovements.value.map(item => item.full_name).filter(Boolean))]);
const availableFabrics = computed(() => [...new Set(stockMovements.value.map(item => item.fabric_type).filter(Boolean))]);

const filteredMovements = computed(() => {
  return stockMovements.value.filter(m => {
    const userMatch = !filterByUser.value || m.full_name === filterByUser.value;
    const fabricMatch = !filterByFabric.value || m.fabric_type === filterByFabric.value;
    const orderNumberMatch = !filterByOrderNumber.value || (m.order_number && String(m.order_number).includes(filterByOrderNumber.value));
    return userMatch && fabricMatch && orderNumberMatch;
  });
});

const timelineItems = computed(() => {
  return filteredMovements.value.map(item => {
    const isEntry = item.quantity_moved > 0;
    let icon = 'mdi-swap-horizontal', color = 'blue', title = 'Ajuste de Estoque', type_display = 'Ajuste';
    if (item.movement_type === 'saida_pedido') { icon = 'mdi-cart-minus'; color = 'red'; title = item.order_number ? `Saída por Pedido #${item.order_number}` : 'Saída por Pedido'; type_display = 'Saída'; }
    else if (item.movement_type === 'entrada_manual') { icon = 'mdi-archive-arrow-down-outline'; color = 'green'; title = 'Entrada Manual'; type_display = 'Entrada'; }
    return {
      id: item.id, icon, color, title, type_display,
      timestamp: format(parseISO(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
      user: item.full_name || 'Sistema',
      fabric_type: item.fabric_type,
      quantity_display: `${isEntry ? '+' : ''}${item.quantity_moved.toFixed(2)}m`,
      old_quantity: item.old_quantity,
      new_quantity: item.new_quantity,
    };
  });
});

// --- MÉTODOS: AUDITORIA DE ESTOQUE (Aba 2) ---
const fetchStockMovements = async () => {
    if (!auditDates.value || auditDates.value.length === 0) { fetchError.value = "Por favor, selecione um período."; return; }
    isLoadingMovements.value = true;
    stockMovements.value = [];
    fetchError.value = null;
    try {
        const [start, end] = auditDates.value;
        const { data, error } = await supabase.rpc('get_stock_movements_report', {
            start_date: start.toISOString(),
            end_date: endOfDay(end || start).toISOString()
        });
        if (error) throw error;
        stockMovements.value = data || [];
    } catch (err: any) { fetchError.value = `Erro ao buscar dados: ${err.message}`; }
    finally { isLoadingMovements.value = false; }
};

const generateAuditPdf = async () => {
  if (filteredMovements.value.length === 0) return;
  isGeneratingAuditPdf.value = true;
  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    await addHeader(doc);

    // Título e Filtros
    doc.setFontSize(16).setFont('helvetica', 'bold').text('Relatório de Auditoria de Estoque', margin, 45);
    doc.setFontSize(9).setTextColor(100).text(`Período: ${auditDateRangeText.value}`, margin, 51);
    const appliedFilters = [
      filterByUser.value ? `Usuário: ${filterByUser.value}` : null,
      filterByFabric.value ? `Base: ${filterByFabric.value}` : null,
      filterByOrderNumber.value ? `Pedido: ${filterByOrderNumber.value}` : null,
    ].filter(Boolean).join(' | ');
    if (appliedFilters) doc.text(`Filtros: ${appliedFilters}`, margin, 56);

    // KPIs
    const totalIn = filteredMovements.value.reduce((sum, item) => item.quantity_moved > 0 ? sum + item.quantity_moved : sum, 0);
    const totalOut = filteredMovements.value.reduce((sum, item) => item.quantity_moved < 0 ? sum + item.quantity_moved : sum, 0);
    doc.setFontSize(10).setFont('helvetica', 'bold').text('Resumo do Período', margin, 65);
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(`Total de Entradas: +${totalIn.toFixed(2)}m`, margin, 70);
    doc.text(`Total de Saídas: ${totalOut.toFixed(2)}m`, margin + 60, 70);
    doc.text(`Balanço Final: ${(totalIn + totalOut).toFixed(2)}m`, margin + 120, 70);

    // Tabela
    const headers = [['Data', 'Tipo', 'Base (Tecido)', 'Alteração (m)', 'Estoque Final', 'Usuário', 'Pedido Nº']];
    const body = filteredMovements.value.map(item => [
      format(parseISO(item.created_at), 'dd/MM/yy HH:mm'),
      item.movement_type,
      item.fabric_type,
      item.quantity_moved.toFixed(2),
      item.new_quantity.toFixed(2),
      item.full_name || 'Sistema',
      item.order_number || '--'
    ]);

    autoTable(doc, {
        head: headers, body: body, startY: 78,
        headStyles: { fillColor: [41, 128, 185] },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const value = parseFloat(data.cell.text[0]);
            if (value > 0) doc.setFillColor(232, 255, 232); // Verde claro
            else if (value < 0) doc.setFillColor(255, 232, 232); // Vermelho claro
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
          }
        }
    });

    addFooter(doc);
    doc.save(`auditoria_estoque_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  } catch (e: any) { alert(`Erro ao gerar PDF: ${e.message}`); }
  finally { isGeneratingAuditPdf.value = false; }
};

// --- LÓGICA: RELATÓRIO DE PEDIDOS (Aba 1) ---
const dates = computed<[Date, Date]>(() => [startOfDay(parseISO(customStartDate.value)), endOfDay(parseISO(customEndDate.value))]);
const dateRangeText = computed(() => dates.value.length === 2 ? `${format(dates.value[0], 'dd/MM/yy')} - ${format(dates.value[1], 'dd/MM/yy')}` : 'Período não selecionado');
const setPeriodForGeneralReport = (value: string) => {
  const end = new Date(); let start = new Date();
  if (value === '7d') start = subDays(end, 7);
  else if (value === '30d') start = subDays(end, 30);
  else if (value === 'this_month') start = startOfMonth(end);
  customStartDate.value = format(start, 'yyyy-MM-dd'); customEndDate.value = format(end, 'yyyy-MM-dd');
};
watch(periodSelection, (newVal) => { if(newVal !== 'custom') setPeriodForGeneralReport(newVal); }, { immediate: true });
const filteredReportItems = computed(() => {
  const [start, end] = dates.value;
  if (!start || !end) return [];
  const trimmedSellers = selectedSellers.value.map(s => s?.trim());
  const trimmedClients = selectedClients.value.map(c => c?.trim());
  const trimmedFabrics = selectedFabrics.value.map(f => f?.trim());
  const trimmedStatus = selectedStatus.value?.trim();
  return props.orders.filter(order => {
    const orderDate = parseISO(order.created_at);
    if (!(orderDate >= start && orderDate <= end)) return false;
    if (trimmedSellers.length > 0 && !trimmedSellers.includes(order.creator?.full_name?.trim())) return false;
    if (trimmedClients.length > 0 && !trimmedClients.includes(order.customer_name?.trim())) return false;
    if (trimmedStatus && order.status?.trim() !== trimmedStatus) return false;
    if (trimmedFabrics.length > 0 && !(order.order_items && order.order_items.some((item: any) => trimmedFabrics.includes(item.fabric_type?.trim())))) return false;
    return true;
  });
});
const imageToBase64 = (url: string): Promise<string> => new Promise((resolve, reject) => { const img = new Image(); img.crossOrigin = 'Anonymous'; img.onload = () => { const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height; const ctx = canvas.getContext('2d'); if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png')); } else { reject(new Error('Contexto do canvas não obtido')); } }; img.onerror = reject; img.src = url; });
const addHeader = async (doc: jsPDF) => { /* ... (código mantido) ... */ };
const addFooter = (doc: jsPDF) => { /* ... (código mantido) ... */ };
const generatePdf = async () => { /* ... (código antigo e funcional mantido) ... */ };
</script>

<style scoped lang="scss">
.report-modal-card {
  backdrop-filter: blur(15px) saturate(180%);
  -webkit-backdrop-filter: blur(15px) saturate(180%);
  background-color: rgba(30, 30, 35, 0.8) !important;
  border: 1px solid rgba(255, 255, 255, 0.125);
  border-radius: 16px !important;
}
.dialog-window {
  background-color: rgba(0,0,0,0.2);
}
.filter-label { font-size: 0.8rem; font-weight: 500; color: #B0BEC5; margin-bottom: 8px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
.dialog-footer { border-top: 1px solid rgba(255, 255, 255, 0.1); }
.modern-button { border-radius: 8px; font-weight: bold; letter-spacing: 0.5px; }

.results-container {
  height: 65vh;
  overflow-y: auto;
  padding: 0 8px;
}

.timeline-card {
  transition: all 0.3s ease;
  &:hover {
    border-color: rgba(var(--v-theme-secondary), 0.8) !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  }
}

/* Animações da lista */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
