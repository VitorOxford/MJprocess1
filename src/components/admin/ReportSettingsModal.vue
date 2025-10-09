<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="900px" persistent>
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

      <v-window v-model="tab">
        <v-window-item value="general">
          <v-card-text class="pa-6">
            <p class="text-body-2 text-medium-emphasis mb-6">
              Utilize os filtros abaixo para gerar um relatório detalhado em PDF com os pedidos que correspondem aos critérios selecionados.
            </p>

            <div class="filter-section">
              <label class="filter-label">Período</label>
                <v-chip-group
                  v-model="periodSelection"
                  @update:model-value="setPeriod"
                  color="primary"
                  variant="outlined"
                  class="mb-4"
                  mandatory
                >
                  <v-chip filter value="7d">Últimos 7 dias</v-chip>
                  <v-chip filter value="30d">Últimos 30 dias</v-chip>
                  <v-chip filter value="this_month">Este Mês</v-chip>
                  <v-chip filter value="custom">Personalizado</v-chip>
                </v-chip-group>
                <v-row v-if="periodSelection === 'custom'">
                  <v-col cols="12" sm="6">
                      <v-text-field type="date" v-model="customStartDate" label="Data de Início" density="compact" variant="outlined"></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="6">
                      <v-text-field type="date" v-model="customEndDate" label="Data de Fim" density="compact" variant="outlined"></v-text-field>
                  </v-col>
                </v-row>
            </div>

            <v-row class="mt-4">
              <v-col cols="12" sm="6">
                <div class="filter-section">
                  <label class="filter-label">Vendedor</label>
                  <v-autocomplete
                    v-model="selectedSellers"
                    :items="sellers"
                    variant="outlined"
                    density="compact"
                    placeholder="Todos"
                    multiple
                    chips
                    closable-chips
                    clearable
                  ></v-autocomplete>
                </div>
              </v-col>
              <v-col cols="12" sm="6">
                  <div class="filter-section">
                  <label class="filter-label">Cliente</label>
                  <v-autocomplete
                    v-model="selectedClients"
                    :items="clients"
                    variant="outlined"
                    density="compact"
                    placeholder="Todos"
                    multiple
                    chips
                    closable-chips
                    clearable
                  ></v-autocomplete>
                </div>
              </v-col>
                <v-col cols="12" sm="6">
                  <div class="filter-section">
                  <label class="filter-label">Base (Tecido)</label>
                  <v-autocomplete
                    v-model="selectedFabrics"
                    :items="fabrics"
                    variant="outlined"
                    density="compact"
                    placeholder="Todas"
                    multiple
                    chips
                    closable-chips
                    clearable
                  ></v-autocomplete>
                </div>
              </v-col>
                <v-col cols="12" sm="6">
                  <div class="filter-section">
                  <label class="filter-label">Status do Pedido</label>
                    <v-select
                    v-model="selectedStatus"
                    :items="statusOptions"
                    item-title="text"
                    item-value="value"
                    variant="outlined"
                    density="compact"
                    placeholder="Todos"
                    clearable
                    ></v-select>
                </div>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions class="dialog-footer pa-4">
            <div class="text-caption text-grey">
              {{ filteredReportItems.length }} pedido(s) encontrado(s)
            </div>
            <v-spacer></v-spacer>
            <v-btn
              @click="generatePdf"
              :loading="isGeneratingPdf"
              color="primary"
              variant="flat"
              size="large"
              class="modern-button"
            >
              <v-icon start>mdi-file-pdf-box</v-icon>
              Gerar Relatório de Pedidos
            </v-btn>
          </v-card-actions>
        </v-window-item>

        <v-window-item value="stock">
          <v-card-text class="pa-6">
              <p class="text-body-2 text-medium-emphasis mb-6">
                  Selecione o período desejado para gerar um relatório com todas as movimentações de estoque registradas.
              </p>
              <v-row align="center">
                  <v-col cols="12" sm="5">
                      <v-text-field type="datetime-local" v-model="reportStartDate" label="Data de Início" density="compact" variant="outlined" hide-details></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="5">
                      <v-text-field type="datetime-local" v-model="reportEndDate" label="Data de Fim" density="compact" variant="outlined" hide-details></v-text-field>
                  </v-col>
                  <v-col cols="12" sm="2">
                      <v-btn @click="generateMovementReport" :loading="isLoadingMovements" color="primary" variant="flat" block class="modern-button">
                          <v-icon start>mdi-magnify</v-icon>
                          Gerar
                      </v-btn>
                  </v-col>
              </v-row>

              <v-divider class="my-6"></v-divider>

              <div v-if="isLoadingMovements" class="text-center py-8">
                  <v-progress-circular indeterminate color="primary"></v-progress-circular>
                  <p class="mt-2">Buscando movimentações...</p>
              </div>
              <div v-else-if="fetchError" class="text-center text-red-lighten-1 py-8">
                  <v-icon size="48">mdi-alert-circle-outline</v-icon>
                  <p class="mt-2">{{ fetchError }}</p>
              </div>
              <div v-else>
                  <v-data-table
                    :headers="movementsHeaders"
                    :items="stockMovements"
                    density="compact"
                    class="elevation-1"
                    :items-per-page="10"
                    :items-per-page-options="[10, 25, 50, -1]"
                    no-data-text="Nenhuma movimentação encontrada para o período selecionado."
                  >
                    <template #item.created_at="{ value }">{{ formatDateTime(value) }}</template>
                    <template #item.quantity_moved="{ item }">
                      <v-chip :color="item.quantity_moved > 0 ? 'success' : 'error'" size="small" variant="tonal">
                        <v-icon start size="small">{{ item.quantity_moved > 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}</v-icon>
                        {{ item.quantity_moved > 0 ? '+' : '' }}{{ item.quantity_moved.toFixed(2) }}m
                      </v-chip>
                    </template>
                    <template #item.full_name="{ value }">{{ value || 'Sistema / Gatilho' }}</template>
                    <template #item.order_number="{ value }">
                      <span v-if="value">Pedido #{{ value }}</span>
                      <span v-else>--</span>
                    </template>
                     <template #item.quantities="{ item }">
                      <div class="d-flex flex-column text-end">
                        <span class="text-caption text-grey">{{ item.old_quantity.toFixed(2) }}m</span>
                        <v-icon small class="my-n1">mdi-arrow-down-thin</v-icon>
                        <span class="font-weight-bold">{{ item.new_quantity.toFixed(2) }}m</span>
                      </div>
                    </template>
                  </v-data-table>
              </div>
          </v-card-text>
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
import { Chart } from 'chart.js/auto';
import { supabase } from '@/api/supabase';

// --- PROPS & EMITS ---
const props = defineProps<{
  show: boolean;
  orders: any[];
  sellers: string[];
  clients: string[];
  fabrics: string[];
}>();
const emit = defineEmits(['close']);

// --- ESTADO GERAL ---
const tab = ref('general');

// --- ESTADO PARA RELATÓRIO DE PEDIDOS (Aba 1) ---
const isGeneratingPdf = ref(false);
const periodSelection = ref('30d');
const customStartDate = ref(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
const customEndDate = ref(format(new Date(), 'yyyy-MM-dd'));
const selectedSellers = ref<string[]>([]);
const selectedClients = ref<string[]>([]);
const selectedFabrics = ref<string[]>([]);
const selectedStatus = ref<string | null>(null);
const statusOptions = [
  { value: 'design_pending', text: 'Em design' },
  { value: 'customer_approval', text: 'Aprovação do vendedor' },
  { value: 'completed', text: 'Completado' },
  { value: 'production_queue', text: 'Em produção' },
  { value: 'delivered', text: 'Entregue' }
];

// --- ESTADO PARA AUDITORIA DE ESTOQUE (Aba 2) ---
const isLoadingMovements = ref(false);
const reportStartDate = ref(format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm"));
const reportEndDate = ref(format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm"));
const stockMovements = ref<any[]>([]);
const fetchError = ref<string | null>(null);

const movementsHeaders = [
    { title: 'Data e Hora', key: 'created_at', width: '170px' },
    { title: 'Tecido', key: 'fabric_type' },
    { title: 'Movimentação', key: 'quantity_moved', align: 'center' },
    { title: 'Usuário', key: 'full_name' },
    { title: 'Tipo', key: 'movement_type' },
    { title: 'Pedido Associado', key: 'order_number' },
    { title: 'Estoque (Antigo -> Novo)', key: 'quantities', align: 'end' },
];

// --- FUNÇÕES E COMPUTED GERAIS ---
const dates = computed<[Date, Date]>(() => {
    return [startOfDay(parseISO(customStartDate.value)), endOfDay(parseISO(customEndDate.value))];
});

const dateRangeText = computed(() => {
    if (dates.value && dates.value.length === 2) {
        return `${format(dates.value[0], 'dd/MM/yy', { locale: ptBR })} - ${format(dates.value[1], 'dd/MM/yy', { locale: ptBR })}`;
    }
    return 'Período não selecionado';
});

const formatDateTime = (dateString: string) => format(parseISO(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });

// --- LÓGICA PARA AUDITORIA DE ESTOQUE (Aba 2) ---
const generateMovementReport = async () => {
    if (!reportStartDate.value || !reportEndDate.value) {
        fetchError.value = "Por favor, preencha as datas de início e fim.";
        return;
    }
    isLoadingMovements.value = true;
    stockMovements.value = [];
    fetchError.value = null;

    try {
        const { data, error } = await supabase.rpc('get_stock_movements_report', {
            start_date: new Date(reportStartDate.value).toISOString(),
            end_date: new Date(reportEndDate.value).toISOString()
        });

        if (error) throw error;
        stockMovements.value = data || [];
    } catch (err: any) {
        console.error("Erro ao buscar movimentações de estoque via RPC:", err);
        fetchError.value = `Erro ao buscar dados: ${err.message}`;
    } finally {
        isLoadingMovements.value = false;
    }
};

// --- LÓGICA PARA RELATÓRIO DE PEDIDOS (Aba 1) ---
const setPeriod = (value: string) => {
  const end = new Date();
  let start = new Date();
  if (value === '7d') {
    start = subDays(end, 7);
  } else if (value === '30d') {
    start = subDays(end, 30);
  } else if (value === 'this_month') {
    start = startOfMonth(end);
  }
  customStartDate.value = format(start, 'yyyy-MM-dd');
  customEndDate.value = format(end, 'yyyy-MM-dd');
};

watch(periodSelection, (newVal) => {
    if(newVal !== 'custom') setPeriod(newVal);
}, { immediate: true });

const filteredReportItems = computed(() => {
  const [start, end] = dates.value;
  if (!start || !end) return [];

  const trimmedSellers = selectedSellers.value.map(s => s?.trim());
  const trimmedClients = selectedClients.value.map(c => c?.trim());
  const trimmedFabrics = selectedFabrics.value.map(f => f?.trim());
  const trimmedStatus = selectedStatus.value?.trim();

  return props.orders.filter(order => {
    const orderDate = parseISO(order.created_at);
    const dateMatch = orderDate >= start && orderDate <= end;
    if (!dateMatch) return false;

    const sellerMatch = trimmedSellers.length === 0 || trimmedSellers.includes(order.creator?.full_name?.trim());
    const clientMatch = trimmedClients.length === 0 || trimmedClients.includes(order.customer_name?.trim());
    const statusMatch = !trimmedStatus || order.status?.trim() === trimmedStatus;

    const fabricMatch = trimmedFabrics.length === 0 ||
      (order.order_items && order.order_items.some((item: any) =>
        trimmedFabrics.includes(item.fabric_type?.trim())
      ));

    return sellerMatch && clientMatch && statusMatch && fabricMatch;
  });
});

// --- GERAÇÃO DE PDF (Aba 1) ---
const imageToBase64 = (urlOrFile: string | File): Promise<string> => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    } else {
      reject(new Error('Canvas context not available'));
    }
  };
  img.onerror = reject;
  if (typeof urlOrFile === 'string') {
    img.src = urlOrFile;
  } else {
    img.src = URL.createObjectURL(urlOrFile);
  }
});

const addHeader = async (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.width;
    try {
        const logoUrl = 'https://sgspnoxsqdwbdqsvjdei.supabase.co/storage/v1/object/public/media/logo-mj-dark.png';
        const logoBase64 = await imageToBase64(logoUrl);
        const logoProps = doc.getImageProperties(logoBase64);
        const logoWidth = 40;
        const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
        doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight);
    } catch (e) {
        console.error("Não foi possível carregar o logo para o PDF", e);
    }
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text([
      "MR JACKY - 20.631.721/0001-07",
      "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000",
      "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com"
    ], pageWidth - 15, 15, { align: 'right' });
    doc.setLineWidth(0.5);
    doc.line(15, 35, pageWidth - 15, 35);
};

const addFooter = (doc: jsPDF) => {
    const pageCount = (doc as any).internal.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8).setTextColor(150);
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Gerado com MJProcess em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 15, pageHeight - 10);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
    }
};

const generateChartAsImage = async (chartConfig: any): Promise<string> => {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = chartConfig.width || 400;
    offscreenCanvas.height = chartConfig.height || 200;
    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) return '';

    return new Promise(resolve => {
        new Chart(ctx, {
            ...chartConfig.config,
            options: {
                ...chartConfig.config.options,
                animation: false,
                plugins: {
                    ...chartConfig.config.options?.plugins,
                    beforeDraw: (chart: any) => {
                        const ctx = chart.canvas.getContext('2d');
                        if (ctx) {
                            ctx.save();
                            ctx.globalCompositeOperation = 'destination-over';
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, chart.width, chart.height);
                            ctx.restore();
                        }
                    }
                }
            }
        });
        setTimeout(() => {
            resolve(offscreenCanvas.toDataURL('image/png'));
        }, 300);
    });
};

const generatePdf = async () => {
  const items = filteredReportItems.value;
  if (items.length === 0) {
    alert("Nenhum pedido encontrado para os filtros selecionados.");
    return;
  }
  isGeneratingPdf.value = true;

  try {
    let totalRevenue = 0;
    let totalMeters = 0;
    const clientSales: { [key: string]: { meters: number, revenue: number } } = {};
    const sellerSales: { [key: string]: { meters: number, revenue: number } } = {};

    items.forEach(order => {
      const orderRevenue = order.total_value || 0;
      totalRevenue += orderRevenue;
      const orderMeters = order.order_items.reduce((sum: number, item: any) => sum + (item.quantity_meters || 0), 0);
      totalMeters += orderMeters;

      const clientName = order.customer_name?.trim() || 'Desconhecido';
      if (!clientSales[clientName]) clientSales[clientName] = { meters: 0, revenue: 0 };
      clientSales[clientName].meters += orderMeters;
      clientSales[clientName].revenue += orderRevenue;

      const sellerName = order.creator?.full_name?.trim() || 'N/A';
      if (!sellerSales[sellerName]) sellerSales[sellerName] = { meters: 0, revenue: 0 };
      sellerSales[sellerName].meters += orderMeters;
      sellerSales[sellerName].revenue += orderRevenue;
    });

    const findTopEntry = (sales: { [key: string]: { meters: number, revenue: number } }, metric: 'meters' | 'revenue') => {
      return Object.entries(sales).reduce((top, [name, values]) =>
        values[metric] > top[1] ? [name, values[metric]] : top,
        ["Nenhum", 0]
      );
    };

    const [topClient] = findTopEntry(clientSales, 'revenue');
    const [topSeller] = findTopEntry(sellerSales, 'revenue');

    const topSellersData = Object.entries(sellerSales).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 8);
    const topClientsData = Object.entries(clientSales).sort(([, a], [, b]) => b.revenue - a.revenue).slice(0, 8);

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    await addHeader(doc);

    doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(0, 0, 0);
    doc.text('Relatório Detalhado de Pedidos', margin, 45);
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(80, 80, 80);
    doc.text(`Período: ${dateRangeText.value}`, margin, 51);

    const kpiY = 58;
    const kpiWidth = (pageWidth - (margin * 2) - (10 * 3)) / 4;

    const drawKpi = (x: number, title: string, value: string) => {
      doc.setFillColor(245, 248, 250);
      doc.roundedRect(x, kpiY, kpiWidth, 22, 3, 3, 'F');
      doc.setFontSize(8).setTextColor(100).text(title, x + 5, kpiY + 7);
      const truncatedValue = value.length > 25 ? value.substring(0, 22) + '...' : value;
      doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(0).text(truncatedValue, x + 5, kpiY + 16);
    };

    drawKpi(margin, 'Faturamento Total', `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    drawKpi(margin + kpiWidth + 10, 'Metragem Total', `${totalMeters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}m`);
    drawKpi(margin + (kpiWidth + 10) * 2, 'Principal Cliente', topClient);
    drawKpi(margin + (kpiWidth + 10) * 3, 'Principal Vendedor', topSeller);

    const headers = [['Nº', 'Cliente', 'Vendedor', 'Data', 'Itens', 'Metragem (m)', 'Valor Total']];
    const body = items.map(order => [
      `#${String(order.order_number || 0).padStart(4, '0')}`,
      order.customer_name,
      order.creator?.full_name || 'N/A',
      format(parseISO(order.created_at), 'dd/MM/yy'),
      order.order_items.length,
      order.order_items.reduce((sum: number, item: any) => sum + (item.quantity_meters || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }),
      (order.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ]);

    autoTable(doc, {
        head: headers,
        body: body,
        startY: kpiY + 32,
        margin: { left: margin, right: margin },
        headStyles: { fillColor: [41, 128, 185], fontSize: 9 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            4: { halign: 'center' },
            5: { halign: 'right' },
            6: { halign: 'right' }
        }
    });

    addFooter(doc);

    if (items.length > 1) {
        doc.addPage('landscape');
        await addHeader(doc);
        doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(0, 0, 0);
        doc.text('Análise Gráfica do Período', margin, 45);

        const chartY = 55;
        const chartHeight = 110;
        const chartWidth = (pageWidth - margin * 2 - 15) / 2;

        const sellerChartImg = await generateChartAsImage({
            width: chartWidth * 4, height: chartHeight * 4,
            config: {
                type: 'bar',
                data: {
                    labels: topSellersData.map(([name]) => name.split(' ')[0]),
                    datasets: [{
                        label: 'Faturamento',
                        data: topSellersData.map(([, values]) => values.revenue),
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: { x: { ticks: { font: { size: 24 } } }, y: { ticks: { font: { size: 24 } } } }
                }
            }
        });
        doc.setFontSize(11).setFont('helvetica', 'bold').text('Top Vendedores (Faturamento)', margin, chartY);
        doc.addImage(sellerChartImg, 'PNG', margin, chartY + 5, chartWidth, chartHeight);

        const clientChartImg = await generateChartAsImage({
            width: (chartWidth * 4) * 0.7, height: chartHeight * 4,
            config: {
                type: 'pie',
                data: {
                    labels: topClientsData.map(([name]) => name.length > 15 ? name.substring(0, 12) + '...' : name),
                    datasets: [{
                        data: topClientsData.map(([, values]) => values.revenue),
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: { font: { size: 24 } }
                        }
                    }
                }
            }
        });
        doc.setFontSize(11).setFont('helvetica', 'bold').text('Top Clientes (Faturamento)', margin + chartWidth + 15, chartY);
        doc.addImage(clientChartImg, 'PNG', margin + chartWidth + 15, chartY + 5, chartWidth, chartHeight);

        addFooter(doc);
    }

    doc.save(`relatorio_avancado_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

  } catch(e) {
    console.error("Erro ao gerar PDF: ", e);
    alert(`Ocorreu um erro ao gerar o PDF: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    isGeneratingPdf.value = false;
  }
};
</script>

<style scoped lang="scss">
.report-modal-card {
  backdrop-filter: blur(25px) saturate(150%);
  -webkit-backdrop-filter: blur(25px) saturate(150%);
  background-color: rgba(30, 30, 35, 0.85) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.filter-section {
  margin-bottom: 1rem;
}

.filter-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #B0BEC5;
  margin-bottom: 8px;
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dialog-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  align-items: center;
}

.modern-button {
  border-radius: 8px;
  font-weight: bold;
  letter-spacing: 0.5px;
}
</style>
