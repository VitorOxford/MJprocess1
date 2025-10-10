<template>
  <v-container fluid class="approvals-page pa-md-6 pa-2">
    <v-toolbar color="transparent" class="mb-4 px-0">
      <v-toolbar-title class="font-weight-bold text-h4 d-flex align-center">
        <v-icon start size="36" color="primary">mdi-check-decagram-outline</v-icon>
        Central de Aprovações
      </v-toolbar-title>
    </v-toolbar>

    <v-tabs v-model="currentTab" color="primary" class="mb-6">
      <v-tab value="orders">
        <v-icon start>mdi-receipt-text-check-outline</v-icon> Pedidos de Venda
        <v-badge v-if="orderApprovals.length > 0" color="warning" :content="orderApprovals.length" inline class="ml-2"></v-badge>
      </v-tab>
      <v-tab value="developments">
        <v-icon start>mdi-palette-swatch-outline</v-icon> Desenvolvimentos Concluídos
        <v-badge v-if="developmentApprovals.length > 0" color="info" :content="developmentApprovals.length" inline class="ml-2"></v-badge>
      </v-tab>
    </v-tabs>

    <v-window v-model="currentTab">
      <v-window-item value="orders">
        <div v-if="loadingOrders" class="text-center py-10">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </div>
        <div v-else-if="orderApprovals.length === 0" class="empty-state">
          <v-icon size="60">mdi-emoticon-cool-outline</v-icon>
          <h3>Nenhum pedido aguardando sua aprovação.</h3>
        </div>
        <v-row v-else>
          <v-col v-for="order in orderApprovals" :key="order.id" cols="12" sm="6" md="4" lg="3">
            <v-card class="order-approval-card" variant="flat">
              <v-img :src="getArtPreview(order)" height="220" class="art-preview" cover>
                <div class="art-overlay d-flex align-end pa-3">
                  <h3 class="font-weight-bold text-shadow">{{ order.customer_name }}</h3>
                </div>
              </v-img>
              <v-card-text class="pb-1">
                <div class="info-line">
                  <v-icon size="small" class="mr-2 icon-color">mdi-alert-circle-outline</v-icon>
                  <span>{{ getPendingItemsCount(order) }} item(s) para aprovar</span>
                </div>
                <div class="info-line">
                  <v-icon size="small" class="mr-2 icon-color">mdi-account-edit-outline</v-icon>
                  <span>Arte por: {{ getDesignerName(order) }}</span>
                </div>
              </v-card-text>
              <v-card-actions class="pa-3">
                <v-btn
                  :to="{ name: 'ApproveOrder', params: { id: order.id } }"
                  color="green-lighten-1"
                  variant="tonal"
                  block
                  class="action-btn"
                >
                  Analisar e Decidir
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <v-window-item value="developments">
        <div v-if="loadingDevs" class="text-center py-10">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        <div v-else-if="developmentApprovals.length === 0" class="empty-state">
          <v-icon size="60">mdi-emoticon-happy-outline</v-icon>
          <h3>Nenhum desenvolvimento concluído para exibir.</h3>
        </div>
        <v-row v-else>
          <v-col v-for="item in developmentApprovals" :key="item.id" cols="12" md="6" lg="4">
            <v-card class="dev-approval-card" variant="flat">
              <v-img :src="item.final_art_url" height="220px" cover class="align-end text-white">
                <div class="card-overlay pa-3">
                  <v-chip size="small" color="white" variant="elevated" class="mb-2">{{ item.dev_code }}</v-chip>
                  <h3 class="font-weight-bold text-shadow">{{ item.new_stamp.name }}</h3>
                </div>
              </v-img>
              <v-card-text class="pb-1">
                  <div class="info-item">
                    <v-icon size="small" start class="icon-color">mdi-account-outline</v-icon>
                    <span>Para: {{ item.design_items[0]?.customer_name }}</span>
                     <v-tooltip v-if="item.design_items.length > 1" location="top" activator="parent">
                      E mais {{ item.design_items.length - 1 }} cliente(s)
                    </v-tooltip>
                  </div>
                  <div class="info-item">
                    <v-icon size="small" start class="icon-color">mdi-palette</v-icon>
                    <span>Por: {{ item.designer?.full_name || 'Designer' }}</span>
                  </div>
                  <div class="info-item">
                    <v-icon size="small" start class="icon-color">mdi-calendar-clock</v-icon>
                    <span>Concluído {{ formatDate(item.updated_at) }}</span>
                  </div>
              </v-card-text>
              <v-divider></v-divider>
              <v-card-actions class="pa-3">
                <v-btn variant="tonal" @click="openImage(item.final_art_url)">
                  <v-icon start>mdi-fullscreen</v-icon>
                  Ampliar Arte
                </v-btn>
                <v-spacer></v-spacer>
                  <v-tooltip location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn v-bind="props" color="success" variant="elevated" @click="approveForSale(item)">
                          <v-icon>mdi-check-circle-outline</v-icon>
                      </v-btn>
                    </template>
                    <span>Marcar como "Aprovado para Venda" no Catálogo</span>
                  </v-tooltip>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>
    </v-window>
    <ImageModal :show="showImageModal" :image-url="selectedImageUrl" @close="showImageModal = false" />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ImageModal from '@/components/ImageModal.vue';

type OrderItem = { id: string; status: string; stamp_image_url?: string; [key: string]: any; };
type Order = { id: string; customer_name: string; created_at: string; order_items: OrderItem[]; designer: { full_name: string } | null; };

const currentTab = ref('orders');
const userStore = useUserStore();
const loadingOrders = ref(true);
const loadingDevs = ref(true);
const orderApprovals = ref<Order[]>([]);
const developmentApprovals = ref<any[]>([]);
const showImageModal = ref(false);
const selectedImageUrl = ref('');

// =================================================================
// LÓGICA PARA BUSCAR PEDIDOS (CORRIGIDA)
// =================================================================
const fetchPendingOrders = async () => {
  if (!userStore.profile) return;
  loadingOrders.value = true;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_name, created_at, designer:designer_id(full_name), order_items(*)')
      .eq('order_items.status', 'customer_approval')
      .not('order_items', 'is', null)
      .order('created_at', { ascending: true });
    if (error) throw error;
    orderApprovals.value = (data as Order[]).map(order => ({
        ...order,
        order_items: order.order_items.filter(item => item.status === 'customer_approval')
    })).filter(order => order.order_items.length > 0);
  } catch (e) {
    console.error('Erro ao buscar pedidos para aprovação:', e);
  } finally {
    loadingOrders.value = false;
  }
};

// =================================================================
// LÓGICA CORRIGIDA E SIMPLIFICADA PARA BUSCAR DESENVOLVIMENTOS
// =================================================================
const fetchDevelopmentApprovals = async () => {
  if (!userStore.profile) return;
  loadingDevs.value = true;
  try {
    const { data, error } = await supabase
      .from('design_requests')
      .select(`
        *,
        new_stamp:new_stamp_id(*),
        designer:designer_id(full_name)
      `)
      .eq('status', 'pending_approval')
      .eq('created_by', userStore.profile.id); // Mantido o filtro para "created_by" aqui, pois faz sentido para desenvolvimentos criados pelo usuário logado que aguardam aprovação.
    if (error) throw error;
    developmentApprovals.value = data.map(item => ({
      ...item,
      design_items: typeof item.design_items === 'string' ? JSON.parse(item.design_items) : item.design_items
    }));
  } catch (err) {
    console.error("Erro ao buscar desenvolvimentos concluídos:", err);
  } finally {
    loadingDevs.value = false;
  }
};

// Ação de "Aprovar para Venda"
const approveForSale = async (item: any) => {
  try {
    await supabase.from('stamp_library').update({ is_approved_for_sale: true }).eq('id', item.new_stamp_id);
    await supabase.from('design_requests').update({ status: 'completed' }).eq('id', item.id);
    // TODO: Notificar o designer
    developmentApprovals.value = developmentApprovals.value.filter(d => d.id !== item.id);
  } catch (error) { console.error("Erro ao aprovar estampa para venda:", error); }
};

// FUNÇÕES AUXILIARES (do seu código original)
const getArtPreview = (order: Order): string => {
    const pendingItem = order.order_items.find(item => item.status === 'customer_approval');
    return pendingItem?.stamp_image_url || `https://drprfuinwglmzquqtqzq.supabase.co/storage/v1/object/public/media/placeholder-art.png`;
}
const getPendingItemsCount = (order: Order): number => {
    return order.order_items.length;
}
const getDesignerName = (order: Order): string => {
    return order.designer?.full_name || 'N/A';
}
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
};
const openImage = (url: string) => {
  selectedImageUrl.value = url;
  showImageModal.value = true;
};

onMounted(() => {
  if(userStore.isLoggedIn){
    fetchPendingOrders();
    fetchDevelopmentApprovals();
  }
});
</script>

<style scoped lang="scss">
.approvals-page { color: #e0e0e0; }
.empty-state { text-align: center; padding: 4rem; color: #757575; }

.order-approval-card {
  border-radius: 16px; background-color: rgba(30, 30, 35, 0.7);
  backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22);
    border-color: rgba(var(--v-theme-primary), 0.4);
  }
}
.art-preview { position: relative; }
.art-overlay, .card-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to top, rgba(0,0,0,0.8) 10%, rgba(0,0,0,0) 60%); }
.text-shadow { text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }

.info-line { display: flex; align-items: center; padding: 4px 0; font-size: 0.9rem; color: #E0E0E0; .icon-color { color: rgba(var(--v-theme-primary-rgb), 0.8); } }
.action-btn { transition: background-color 0.2s ease-in-out; }

// =================================================================
// ESTILOS DO CARD DE DESENVOLVIMENTO (ATUALIZADOS)
// =================================================================
.dev-approval-card {
  border-radius: 16px;
  background-color: rgba(30, 30, 35, 0.7); /* Fundo translúcido */
  backdrop-filter: blur(15px); /* Efeito de blur */
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.1); /* Borda sutil */
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;

  &:hover {
    transform: translateY(-8px); /* Eleva o card no hover */
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22); /* Sombra mais intensa */
    border-color: rgba(var(--v-theme-primary), 0.4); /* Borda com cor primária no hover */
  }

  .v-card-text {
    padding-top: 12px;
    padding-bottom: 12px;
  }
}

.info-item {
  display: flex;
  align-items: center;
  padding: 4px 0; /* Espaçamento mais consistente */
  font-size: 0.9rem;
  color: #E0E0E0; /* Cor do texto */
  .icon-color {
    color: rgba(var(--v-theme-primary-rgb), 0.8); /* Ícones com cor primária */
    margin-right: 8px; /* Espaçamento entre ícone e texto */
  }
}

// Estilos para o v-btn de ampliar arte
.dev-approval-card .v-card-actions .v-btn[variant="tonal"] {
  color: rgba(var(--v-theme-primary-rgb), 0.9);
  border-color: rgba(var(--v-theme-primary-rgb), 0.2);
  &:hover {
    background-color: rgba(var(--v-theme-primary-rgb), 0.1);
  }
}
</style>
