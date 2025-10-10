<template>
  <v-dialog :model-value="show" @update:model-value="$emit('close')" max-width="1200px" persistent scrollable>
    <v-card class="release-modal-card">
      <div class="modal-header text-center pa-4">
        <div>
          <h2 class="text-h5 font-weight-bold">Detalhes do Pedido</h2>
          <p class="text-body-2 text-medium-emphasis">
            Acompanhe os itens e libere para a produção
          </p>
        </div>
        <div class="header-actions">
           <v-btn
              icon
              variant="tonal"
              color="white"
              @click="generateOrderSummaryPdf"
              :loading="isGeneratingPdf"
              :disabled="loadingItems"
              class="mr-2"
            >
              <v-icon>mdi-file-pdf-box</v-icon>
              <v-tooltip activator="parent" location="bottom">Gerar Resumo do Pedido (PDF)</v-tooltip>
            </v-btn>
            <v-btn icon="mdi-close" variant="tonal" color="white" @click="$emit('close')"></v-btn>
        </div>
      </div>

      <v-card-text v-if="order" class="pa-md-6 pa-4">
        <v-card class="order-info-card mb-6" variant="outlined">
            <div class="d-flex justify-space-between align-center">
                 <div>
                    <div class="text-caption text-grey">CLIENTE</div>
                    <div class="text-h6 font-weight-bold">{{ order.customer_name }}</div>
                 </div>
                 <v-divider vertical class="mx-4"></v-divider>
                 <div class="text-right">
                    <div class="text-caption text-grey">VENDEDOR</div>
                    <div class="text-h6 font-weight-medium">{{ order.creator_name }}</div>
                 </div>
            </div>
        </v-card>

        <div v-if="loadingItems" class="text-center py-16">
          <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
        </div>

        <div v-else class="item-list-container">
          <v-card v-for="item in localItems" :key="item.id" class="item-card mb-4" variant="flat">
            <div class="d-flex">
              <v-img
                :src="item.stamp_image_url"
                class="item-thumbnail"
                aspect-ratio="1"
                cover
              ></v-img>

              <div class="item-content">
                <div class="item-info">
                  <h4 class="text-body-1 font-weight-bold">{{ item.stamp_ref }}</h4>
                  <p class="text-body-2 text-medium-emphasis">
                    {{ item.fabric_type }} - <strong>{{ formatMeters(item.quantity_meters) }}m</strong>
                  </p>
                </div>

                <div class="item-actions">
                    <v-chip
                        :color="statusInfo(item).color"
                        :prepend-icon="statusInfo(item).icon"
                        size="small"
                        :variant="item.has_insufficient_stock ? 'flat' : 'tonal'"
                        label
                        class="status-chip"
                    >
                        {{ statusInfo(item).text }}
                    </v-chip>

                    <v-tooltip v-if="item.is_op_generated" text="Gerar PDF da OP" location="top">
                       <template #activator="{ props }">
                         <v-btn v-bind="props" icon="mdi-file-document-outline" color="info" variant="text" size="small" @click="generateOpPdf(item)"></v-btn>
                       </template>
                    </v-tooltip>

                    <v-btn
                        v-if="canReleaseItem(item)"
                        :color="item.has_insufficient_stock ? 'warning' : 'primary'"
                        variant="flat"
                        @click="releaseItemForProduction(item)"
                        :loading="releasing[item.id]"
                        :disabled="item.has_insufficient_stock && !userStore.isAdmin"
                        class="release-button"
                    >
                        <v-icon start>{{ item.has_insufficient_stock ? 'mdi-shield-check-outline' : 'mdi-send-check-outline' }}</v-icon>
                        {{ item.has_insufficient_stock ? 'Forçar Liberação' : 'Liberar' }}
                    </v-btn>
                </div>
              </div>
            </div>
            <v-alert
              v-if="item.has_insufficient_stock"
              type="warning"
              variant="text"
              density="compact"
              class="mt-2 mx-2 mb-2"
              icon="mdi-alert-circle-outline"
            >
              Item sem estoque. Liberação bloqueada para operadores.
            </v-alert>
          </v-card>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, reactive } from "vue";
import { supabase } from "@/api/supabase";
import { useUserStore } from "@/stores/user";
// ===== CORREÇÃO (1/3): Importar a store do dashboard =====
import { useDashboardStore } from "@/stores/dashboard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const props = defineProps<{
  show: boolean;
  order: any | null;
}>();
const emit = defineEmits(["close", "update-items"]);

const userStore = useUserStore();
// ===== CORREÇÃO (2/3): Inicializar a store do dashboard =====
const dashboardStore = useDashboardStore();
const releasing = reactive<Record<string, boolean>>({});
const localItems = ref<any[]>([]);
const loadingItems = ref(false);
const fullOrderDetails = ref<any | null>(null);
const isGeneratingPdf = ref(false);

const statusMap: Record<string, { text: string; color: string; hex: string, icon: string; }> = {
    production_queue: { text: 'Na Fila', color: 'grey', hex: '#9E9E9E', icon: 'mdi-timer-sand' },
    completed: { text: 'Concluído', color: 'success', hex: '#4CAF50', icon: 'mdi-check-circle' },
    in_printing: { text: 'Em Produção', color: 'primary', hex: '#2196F3', icon: 'mdi-cog-sync' },
    in_cutting: { text: 'Em Produção', color: 'primary', hex: '#2196F3', icon: 'mdi-cog-sync' },
    customer_approval: { text: 'Aprovação Vendedor', color: 'orange', hex: '#FB8C00', icon: 'mdi-account-clock' },
    changes_requested: { text: 'Alteração Solicitada', color: 'error', hex: '#F44336', icon: 'mdi-alert-circle' },
    approved_by_seller: { text: 'Aprovado', color: 'green-lighten-1', hex: '#66BB6A', icon: 'mdi-check' },
    design_pending: { text: 'Em Design', color: 'blue-grey', hex: '#607D8B', icon: 'mdi-palette' },
    pending_stock: { text: 'Aguardando Estoque', color: 'warning', hex: '#FFB300', icon: 'mdi-package-variant-remove'}
};

const designTagMap: Record<string, { color: string, hex: string }> = {
    'Desenvolvimento': { color: 'info', hex: '#03A9F4' },
    'Alteração': { color: 'warning', hex: '#FFB300' },
    'Finalização': { color: 'teal', hex: '#009688' },
    'Aprovado': { color: 'success', hex: '#4CAF50' }
};

const statusInfo = (item: any) => {
    if (item.has_insufficient_stock) {
        return {
            text: 'Aguardando Estoque',
            color: 'warning',
            hex: '#FFB300',
            icon: 'mdi-package-variant-remove'
        };
    }
    if (item.status === 'design_pending' && item.design_tag) {
        const tagInfo = designTagMap[item.design_tag];
        if (tagInfo) {
            return {
                text: item.design_tag,
                color: tagInfo.color,
                hex: tagInfo.hex,
                icon: 'mdi-palette'
            };
        }
    }
    return statusMap[item.status] || { text: item.status, color: 'default', hex: '#9E9E9E', icon: 'mdi-help-circle' };
};

const fetchFullOrderDetails = async (orderId: string) => {
  loadingItems.value = true;
  localItems.value = [];
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*, created_by:profiles!created_by(full_name), order_items(*, has_insufficient_stock)")
      .eq("id", orderId)
      .single();

    if (error) throw error;
    fullOrderDetails.value = data;
    localItems.value = data.order_items.sort((a: any, b: any) => a.id.localeCompare(b.id));

  } catch (err) {
    console.error("Erro ao buscar detalhes completos do pedido:", err);
  } finally {
    loadingItems.value = false;
  }
};

watch(
  () => props.show,
  (newVal) => {
    if (newVal && props.order) {
      fetchFullOrderDetails(props.order.id);
    } else {
      localItems.value = [];
      fullOrderDetails.value = null;
    }
  },
  { immediate: true }
);

const canReleaseItem = (item: any) => {
  return item.status === "production_queue";
};

const releaseItemForProduction = async (item: any) => {
  let confirmationText = `Tem certeza que deseja liberar o item "${item.stamp_ref}" para a produção? A data de início será resetada para HOJE.`;

  if (item.has_insufficient_stock && userStore.isAdmin) {
      confirmationText = `ATENÇÃO, ADMINISTRADOR!\n\nEste item NÃO possui estoque suficiente.\n\nTem certeza que deseja FORÇAR a liberação do item "${item.stamp_ref}" para a produção?`;
  }

  if (!confirm(confirmationText)) return;

  releasing[item.id] = true;
  try {
    const { error: rpcError } = await supabase.rpc(
      "release_item_to_production_v2",
      {
        p_item_id: item.id,
      }
    );

    if (rpcError) throw rpcError;

    const foundItem = localItems.value.find((i) => i.id === item.id);
    if (foundItem) {
      foundItem.status = "in_printing";
      foundItem.has_insufficient_stock = false;
    }

    emit("update-items");

    // ===== CORREÇÃO (3/3): Atualizar os dados do Kanban de Produção =====
    await dashboardStore.fetchProductionSchedule();

  } catch (err: any) {
    console.error("Erro ao liberar item para produção:", err);
    alert(`Falha ao liberar o item: ${err.message}`);
  } finally {
    releasing[item.id] = false;
  }
};

const formatMeters = (meters: number) =>
  Number(meters || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });

const imageToBase64 = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        reject(new Error("Contexto do canvas não obtido"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });

const generateOrderSummaryPdf = async () => {
    if (!fullOrderDetails.value) {
        alert("Aguarde os detalhes do pedido serem carregados.");
        return;
    }
    isGeneratingPdf.value = true;
    try {
        const order = fullOrderDetails.value;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        const logoUrl = 'https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Sem_nome_1080_x_800_px_1080_x_500_px_1080_x_400_px_1000_x_380_px_da020cf2-2bb9-4dac-8dd3-4548cfd2e5ae.png?v=1756811713';
        const logoBase64 = await imageToBase64(logoUrl);
        const logoProps = doc.getImageProperties(logoBase64);
        const logoWidth = 50;
        const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
        doc.addImage(logoBase64, 'PNG', 15, 12, logoWidth, logoHeight);

        doc.setFontSize(9); doc.setTextColor(100);
        doc.text(["MR JACKY - 20.631.721/0001-07", "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000", "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com"], pageWidth - 15, 15, { align: 'right' });

        doc.setFontSize(18).setTextColor(0).text(`Resumo do Pedido #${String(order.order_number).padStart(4, '0')}`, 15, 45);
        doc.setLineWidth(0.5).line(15, 50, pageWidth - 15, 50);

        autoTable(doc, {
            startY: 55,
            body: [
                ['Cliente', order.customer_name],
                ['Vendedor', order.created_by?.full_name || 'N/A'],
                ['Data do Lançamento', format(parseISO(order.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })],
                ['Faturamento', order.billed_at ? `Faturado em ${format(parseISO(order.billed_at), 'dd/MM/yyyy')}` : 'Aguardando Faturamento'],
            ],
            theme: 'striped', styles: { fontSize: 9 }, bodyStyles: { cellWidth: 'wrap' }, columnStyles: { 0: { fontStyle: 'bold' } },
        });

        const tableBody = await Promise.all(order.order_items.map(async (item: any) => {
            let opText = 'Não Liberada';
            if (item.is_op_generated) {
                const { data: opNumber, error } = await supabase.rpc('generate_op_number', { p_item_id: item.id });
                if (error) {
                    console.error(`Erro ao buscar OP para item ${item.id}:`, error);
                    opText = 'Erro';
                } else {
                    opText = `#${String(opNumber).padStart(4, '0')}`;
                }
            }
            return [
                item.stamp_ref,
                item.fabric_type,
                `${formatMeters(item.quantity_meters)}m`,
                statusInfo(item).text,
                opText,
            ];
        }));

        doc.setFontSize(12).setFont('helvetica', 'bold').text('Itens do Pedido', 15, (doc as any).lastAutoTable.finalY + 15);

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 18,
            head: [['Estampa (Ref.)', 'Produto (Base)', 'Qtd.', 'Status', 'OP']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
            columnStyles: { 3: { cellWidth: 35 } },
            willDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) {
                    const item = order.order_items[data.row.index];
                    const sInfo = statusInfo(item);
                    const color = sInfo.hex.match(/\w\w/g)?.map((x) => parseInt(x, 16));
                    if (color) {
                       doc.setFillColor(color[0], color[1], color[2]);
                       doc.setTextColor(255, 255, 255);
                    }
                }
            },
        });

        const allStatusObjects = { ...statusMap, ...Object.fromEntries(Object.entries(designTagMap).map(([key, value]) => [key, { ...value, text: key }])) };
        const legendData = Object.values(allStatusObjects)
            .filter((v, i, a) => a.findIndex(t => t.hex === v.hex) === i)
            .map(s => ({ text: s.text, color: s.hex.match(/\w\w/g)?.map((x) => parseInt(x, 16)) }));

        doc.setFontSize(10).setFont('helvetica', 'bold').text('Legenda de Status', 15, (doc as any).lastAutoTable.finalY + 10);
        let startY = (doc as any).lastAutoTable.finalY + 15;
        legendData.forEach((legend) => {
            if (legend.color) {
                doc.setFillColor(legend.color[0], legend.color[1], legend.color[2]);
                doc.rect(15, startY - 2.5, 3, 3, 'F');
                doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(0,0,0);
                doc.text(legend.text, 20, startY);
                startY += 5;
            }
        });

        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(9).setTextColor(150).text('Gerado com MJProcess', pageWidth / 2, pageHeight - 10, { align: 'center' });

        doc.save(`Resumo_Pedido_${String(order.order_number).padStart(4, '0')}.pdf`);

    } catch (error) {
        console.error("Erro ao gerar PDF de resumo:", error);
        alert("Ocorreu um erro ao gerar o PDF. Verifique o console para mais detalhes.");
    } finally {
        isGeneratingPdf.value = false;
    }
};


const addBusinessDays = (startDate: Date, days: number): Date => {
  const newDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < days) {
    newDate.setDate(newDate.getDate() + 1);
    if (newDate.getDay() !== 0) addedDays++;
  }
  return newDate;
};

const getNextDeliveryDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + 1);
  while (true) {
    if ([2, 4, 6].includes(newDate.getDay())) return newDate;
    newDate.setDate(newDate.getDate() + 1);
  }
};

const generateOpPdf = async (item: any) => {
  const parentOrder = fullOrderDetails.value;
  if (!parentOrder) {
    alert("Os detalhes completos do pedido ainda estão carregando. Tente novamente em um instante.");
    return;
  }

  try {
    const { data: opNumber, error: rpcError } = await supabase.rpc("generate_op_number", { p_item_id: item.id });
    if (rpcError) throw rpcError;

    const { data: schedule, error: scheduleError } = await supabase
      .from("production_schedule")
      .select("scheduled_date")
      .eq("order_item_id", item.id)
      .single();
    if (scheduleError || !schedule) throw new Error("Agendamento do item não encontrado.");

    const hasStockIssues = parentOrder.order_items.some((i: any) => i.has_insufficient_stock || i.status === 'pending_stock');
    const extraDays = hasStockIssues ? 2 : 0;

    const completionDate = addBusinessDays(parseISO(schedule.scheduled_date), 3 + extraDays);
    const forecastDate = getNextDeliveryDay(completionDate);
    const formattedOpNumber = String(opNumber).padStart(4, "0");
    const formattedForecastDate = format(forecastDate, "dd/MM/yyyy", { locale: ptBR });
    const formattedOrderNumber = String(parentOrder.order_number).padStart(4, "0");

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    const [logoBase64, artBase64] = await Promise.all([
      imageToBase64("https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Sem_nome_1080_x_800_px_1080_x_500_px_1080_x_400_px_1000_x_380_px_da020cf2-2bb9-4dac-8dd3-4548cfd2e5ae.png?v=1756811713"),
      imageToBase64(item.stamp_image_url || ""),
    ]);

    const logoProps = doc.getImageProperties(logoBase64);
    const logoWidth = 50;
    const logoHeight = (logoProps.height * logoWidth) / logoProps.width;
    doc.addImage(logoBase64, "PNG", 15, 12, logoWidth, logoHeight);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      [
        "MR JACKY - 20.631.721/0001-07",
        "RUA LUIZ MONTANHAN, 1302 TIRO DE GUERRA - TIETE - SP CEP: 18.532-000",
        "Fone/Celular: (15) 99847-8789 | E-mail: mrjackyfinanceiro@gmail.com",
      ],
      pageWidth - 15,
      15,
      { align: "right" }
    );

    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(`OP #${formattedOpNumber}`, 15, 45);
    doc.setFontSize(12);
    doc.text(`Pedido #${formattedOrderNumber}`, pageWidth - 15, 45, { align: "right" });
    doc.setLineWidth(0.5);
    doc.line(15, 50, pageWidth - 15, 50);

    autoTable(doc, {
      startY: 55,
      head: [["CLIENTE", "VENDEDOR", "EMISSÃO", "PREVISÃO DE ENTREGA"]],
      body: [
        [
          parentOrder.customer_name,
          parentOrder.created_by?.full_name || "N/A",
          format(new Date(parentOrder.created_at), "dd/MM/yyyy", { locale: ptBR }),
          formattedForecastDate,
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["PRODUTO (BASE)", "SERVIÇO (ESTAMPA)", "QUANTIDADE"]],
      body: [[item.fabric_type, item.stamp_ref, `${item.quantity_meters}m`]],
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
    });

    const artStartY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ARTE APROVADA", 15, artStartY);
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(100);
    doc.text(`Cliente: ${parentOrder.customer_name}`, 15, artStartY + 5);


    const artY = artStartY + 10;
    const maxImgWidth = pageWidth - 30;
    const maxImgHeight = pageHeight - artY - 25;
    const imgProps = doc.getImageProperties(artBase64);
    const ratio = Math.min(
      maxImgWidth / imgProps.width,
      maxImgHeight / imgProps.height
    );
    const imgWidth = imgProps.width * ratio;
    const imgHeight = imgProps.height * ratio;
    const imgXCentered = (pageWidth - imgWidth) / 2;

    doc
      .setDrawColor(180, 180, 180)
      .setLineWidth(0.5)
      .rect(imgXCentered - 1, artY - 1, imgWidth + 2, imgHeight + 2, "S");
    doc.addImage(artBase64, "PNG", imgXCentered, artY, imgWidth, imgHeight);

    const footerY = pageHeight - 15;
    doc
      .setFontSize(9)
      .setTextColor(150)
      .text("OP gerada com MJProcess", pageWidth / 2, footerY, {
        align: "center",
      });

    doc.save(
      `OP-${formattedOpNumber}-${parentOrder.customer_name}-${item.stamp_ref}.pdf`
    );
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    alert(
      "Não foi possível gerar o PDF. Verifique se as imagens estão acessíveis e tente novamente."
    );
  }
};
</script>

<style scoped lang="scss">
.release-modal-card {
  backdrop-filter: blur(25px) saturate(150%);
  -webkit-backdrop-filter: blur(25px) saturate(150%);
  background-color: rgba(30, 30, 35, 0.85) !important;
  border-radius: 16px !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header {
  position: relative;
  border-bottom: 1px solid rgba(255,255,255,0.1);

  .header-actions {
    position: absolute;
    top: 50%;
    right: 16px;
    transform: translateY(-50%);
  }
}

.order-info-card {
  padding: 16px;
  background-color: rgba(0,0,0,0.2);
  border-radius: 12px;
  border-color: rgba(255,255,255,0.1) !important;
}

.item-list-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item-card {
  background-color: rgba(255,255,255,0.05);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(255,255,255,0.08);
  }
}

.item-thumbnail {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  flex-shrink: 0;
}

.item-content {
  display: flex;
  align-items: center;
  flex-grow: 1;
  padding: 16px;
  gap: 16px;
}

.item-info {
  flex-grow: 1;
}

.item-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  min-width: 280px;
}

.status-chip {
  min-width: 150px;
  justify-content: center;
}

.release-button {
  border-radius: 8px;
}
</style>
