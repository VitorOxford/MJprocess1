<template>
  <v-container fluid class="design-kanban-page">
    <v-toolbar color="transparent" class="mb-4 px-0">
      <v-toolbar-title class="font-weight-bold text-h4 d-flex align-center">
        <v-icon start size="36" color="primary">mdi-palette-swatch-outline</v-icon>
        Fluxo de Design
      </v-toolbar-title>
    </v-toolbar>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <div v-else class="kanban-board-container custom-scrollbar">
      <div class="kanban-board">
        <div v-for="(column, index) in columns" :key="column.id" class="kanban-column" :style="{ '--animation-delay': `${index * 0.2}s` }">
          <div class="column-header">
            <v-icon :color="column.color" class="mr-3">{{ column.icon }}</v-icon>
            <h3 class="column-title">{{ column.title }}</h3>
            <v-chip size="small" variant="tonal" class="ml-auto" :color="column.color">{{ column.items.length }}</v-chip>
          </div>

          <draggable
            :list="column.items"
            group="items"
            item-key="id"
            class="column-content custom-scrollbar"
            :disabled="column.id === 4"
            @end="onDragEnd"
          >
            <template #item="{ element: item }">
               <div :data-id="item.id" @mousemove="onCardMouseMove">
                  <v-card class="order-card my-2" variant="flat" @click="openModalForItem(item)">
                     <div class="card-border"></div>
                     <div class="card-shine"></div>
                     <v-card-text class="card-content">
                       <p class="font-weight-bold text-body-1">{{ item.order.customer_name }}</p>
                       <p class="text-caption text-medium-emphasis mt-1">Ref: {{ item.stamp_ref }}</p>
                       <v-divider class="my-2"></v-divider>
                       <v-chip size="small">{{ item.fabric_type }} - {{ Number(item.quantity_meters).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }}m</v-chip>
                     </v-card-text>
                  </v-card>
               </div>
            </template>
          </draggable>
           <div v-if="column.items.length === 0" class="empty-column">
              <v-icon size="48" class="mb-2 text-grey-darken-2">mdi-tray-arrow-down</v-icon>
              <span>Nenhum item aqui.</span>
          </div>
        </div>
      </div>
    </div>

    <LaunchDetailModal
      :show="showLaunchModal"
      :order="selectedOrder"
      @close="closeLaunchModal"
      @sendToSeller="openUploadModal"
      @releaseItem="handleReleaseItem"
      @itemUpdated="fetchDesignOrders"
    />
    <FileUploadModal
      :show="showUploadModal"
      :order="selectedOrder"
      :title="uploadModalTitle"
      @close="showUploadModal = false"
      @uploaded="handleUploadSuccess"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onActivated } from 'vue';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import draggable from 'vuedraggable';
import LaunchDetailModal from '@/components/LaunchDetailModal.vue';
import FileUploadModal from '@/components/FileUploadModal.vue';

// --- TIPAGEM ---
type OrderItem = {
    id: string;
    status: string;
    design_tag: 'Desenvolvimento' | 'Alteração' | 'Finalização' | 'Aprovado';
    order_id: string;
    order: Order;
    [key: string]: any
};
type Order = { id: string; status: string; is_launch: boolean; order_items: OrderItem[]; [key: string]: any };

// --- ESTADO ---
const loading = ref(true);
const allOrders = ref<Order[]>([]);
const userStore = useUserStore();
const showLaunchModal = ref(false);
const selectedOrder = ref<Order | null>(null);
const showUploadModal = ref(false);
const selectedItem = ref<OrderItem | null>(null);
const uploadModalTitle = ref('');

// --- LÓGICA DE DADOS ---
const fetchDesignOrders = async () => {
  loading.value = true;
  try {
    const designStatuses = [
        'design_pending',
        'customer_approval',
        'changes_requested',
        'approved_by_designer',
        'approved_by_seller'
    ];

    const { data, error } = await supabase.from('orders')
      .select(`
        id, customer_name, status, is_launch,
        created_by:profiles!created_by(full_name),
        order_items!inner(*)
      `)
      .in('order_items.status', designStatuses);

    if (error) throw error;
    allOrders.value = (data as any[]) || [];
  } finally {
    loading.value = false;
  }
};

const allItems = computed((): OrderItem[] => {
    return allOrders.value.flatMap(order =>
        order.order_items.map(item => ({
            ...item,
            order: order
        }))
    );
});


const developmentItems = computed(() => allItems.value.filter(item => item.status === 'design_pending' && item.design_tag === 'Desenvolvimento'));
const alterationItems = computed(() => allItems.value.filter(item => item.status === 'design_pending' && item.design_tag === 'Alteração'));
const finalizationItems = computed(() => allItems.value.filter(item => item.status === 'design_pending' && item.design_tag === 'Finalização'));

const approvedItems = computed(() => allItems.value.filter(item =>
    (item.status === 'design_pending' && item.design_tag === 'Aprovado') ||
    item.status === 'customer_approval' ||
    item.status === 'approved_by_seller'
));


const columns = computed(() => [
  { id: 1, title: 'Desenvolvimento', icon: 'mdi-lightbulb-on-outline', color: '#40c4ff', items: developmentItems.value },
  { id: 2, title: 'Alteração', icon: 'mdi-swap-horizontal-bold', color: '#ffab40', items: alterationItems.value },
  { id: 3, title: 'Finalização', icon: 'mdi-flag-checkered', color: '#26A69A', items: finalizationItems.value },
  { id: 4, title: 'Aprovados', icon: 'mdi-check-decagram', color: '#4CAF50', items: approvedItems.value },
]);

// --- MÉTODOS DE INTERAÇÃO ---

const onCardMouseMove = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  card.style.setProperty('--mouse-x', `${x}px`);
  card.style.setProperty('--mouse-y', `${y}px`);
};

const openModalForItem = (item: OrderItem) => {
  selectedOrder.value = item.order;
  showLaunchModal.value = true;
};

const closeLaunchModal = () => {
  showLaunchModal.value = false;
  selectedOrder.value = null;
};

const openUploadModal = (item: OrderItem) => {
    selectedItem.value = item;
    selectedOrder.value = allOrders.value.find(o => o.id === item.order_id) || null;
    uploadModalTitle.value = `Enviar Arte para "${item.stamp_ref}"`;
    showUploadModal.value = true;
};

const handleUploadSuccess = async (fileUrl: string) => {
    if (!selectedItem.value) return;
    await updateItemStatus(selectedItem.value, 'customer_approval', fileUrl);

    // *** NOVA LÓGICA DE NOTIFICAÇÃO ***
    const { error: notifyError } = await supabase.rpc('notify_seller_for_approval', {
        p_item_id: selectedItem.value.id,
        p_sender_id: userStore.profile?.id
    });
    if (notifyError) console.error("Erro ao notificar vendedor:", notifyError);
    // **********************************

    showUploadModal.value = false;
};

const updateItemStatus = async (item: OrderItem, newStatus: string, fileUrl?: string) => {
    try {
        const { error } = await supabase.rpc('update_order_item_status', { p_item_id: item.id, p_new_status: newStatus, p_final_art_url: fileUrl || null, p_profile_id: userStore.profile?.id });
        if (error) throw error;
        await fetchDesignOrders();
        if (selectedOrder.value) {
          const { data } = await supabase.from('orders').select(`*, created_by:profiles!created_by(full_name), order_items(*)`).eq('id', selectedOrder.value.id).single();
          selectedOrder.value = data;
        }
    } catch (err: any) { console.error("Erro ao atualizar status do item:", err); }
};

const removeItemFromLocalState = (itemId: string) => {
    let orderIndexToRemove = -1;
    allOrders.value.forEach((order, index) => {
        const itemIndex = order.order_items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            order.order_items.splice(itemIndex, 1);
        }
        if (order.order_items.length === 0) {
            orderIndexToRemove = index;
        }
    });
    if (orderIndexToRemove !== -1) {
        allOrders.value.splice(orderIndexToRemove, 1);
    }
};

const handleReleaseItem = async (item: OrderItem) => {
    try {
        const { error } = await supabase.rpc('schedule_item_for_production', {
            p_item_id: item.id,
            p_profile_id: userStore.profile?.id
        });
        if (error) throw error;
        removeItemFromLocalState(item.id);
        if (selectedOrder.value) {
            const itemIndex = selectedOrder.value.order_items.findIndex(i => i.id === item.id);
            if (itemIndex > -1) {
                selectedOrder.value.order_items.splice(itemIndex, 1);
                if (selectedOrder.value.order_items.length === 0) {
                    closeLaunchModal();
                }
            }
        }
    } catch(err: any) {
        console.error("Erro ao liberar item para produção:", err);
        alert(`Erro ao liberar item: ${err.message}`);
    }
};

const onDragEnd = async (event: any) => {
    // Lógica futura para drag-and-drop pode ser adicionada aqui
};

onActivated(fetchDesignOrders);
onMounted(fetchDesignOrders);
</script>

<style scoped lang="scss">
@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-8px); } 100% { transform: translateY(0px); } }
.design-kanban-page { position: relative; z-index: 1; display: flex; flex-direction: column; }
.kanban-board-container { width: 100%; overflow-x: auto; padding-bottom: 2rem; flex-grow: 1; }
.kanban-board { display: flex; gap: 2rem; min-width: fit-content; padding: 1rem; height: 100%; }
.kanban-column { width: 340px; flex-shrink: 0; background-color: rgba(25, 25, 30, 0.6); border-radius: 16px; display: flex; flex-direction: column; max-height: 100%; animation: float 8s ease-in-out infinite; transition: all 0.4s ease; border: 1px solid rgba(255, 255, 255, 0.1); backdrop-filter: blur(5px); }
.kanban-column:hover { transform: scale(1.03) translateY(-7px) !important; box-shadow: 0 25px 50px rgba(0,0,0,0.4); }
.column-header { padding: 1rem 1.25rem; display: flex; align-items: center; flex-shrink: 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); .column-title { font-size: 1.1rem; font-weight: bold; } }
.column-content { padding: 0.5rem 1rem 1rem 1rem; flex-grow: 1; min-height: 200px; overflow-y: auto; }
.order-card { cursor: pointer; background-color: rgba(35, 35, 45, 0.8); border-radius: 12px; position: relative; overflow: hidden; border: 1px solid transparent; transition: transform 0.2s ease-out; .card-content { z-index: 2; } .card-border { position: absolute; inset: 0; border-radius: inherit; background: radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.2), transparent 40%); opacity: 0; transition: opacity 0.4s; } &:hover .card-border { opacity: 1; } }
.empty-column { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; color: #616161; }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.2); border-radius: 3px; }
</style>
