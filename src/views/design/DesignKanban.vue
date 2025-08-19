<template>
  <v-container fluid class="design-kanban-page">
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <v-toolbar color="transparent" class="mb-4 px-0">
      <v-toolbar-title class="font-weight-bold text-h4 d-flex align-center">
        <v-icon start size="36" color="primary">mdi-palette-swatch-outline</v-icon>
        Fluxo de Design
      </v-toolbar-title>
    </v-toolbar>

    <div class="kanban-board-container custom-scrollbar">
      <div class="kanban-board">
        <draggable
            v-model="columns"
            group="columns"
            item-key="id"
            class="d-flex"
            handle=".column-header"
          >
          <template #item="{ element: column, index }">
            <div class="kanban-column" :style="{ '--animation-delay': `${index * 0.2}s` }">
              <div class="column-header">
                <v-icon :color="column.color" class="mr-3">{{ column.icon }}</v-icon>
                <h3 class="column-title">{{ column.title }}</h3>
                <v-chip size="small" variant="tonal" class="ml-auto" :color="column.color">{{ getColumnOrders(column.statuses).length }}</v-chip>
              </div>

              <draggable
                :list="getColumnOrders(column.statuses)"
                group="orders"
                item-key="id"
                class="column-content custom-scrollbar"
                :data-status="column.statuses[0]"
                @start="onDragStart"
                @end="onDragEnd"
                :ghost-class="`ghost-card`"
                drag-class="dragging-card"
              >
                <template #item="{ element: order }">
                   <div :data-id="order.id" @mousemove="onCardMouseMove">
                      <v-card class="order-card my-2" variant="flat">
                         <div class="card-border"></div>
                         <div class="card-shine"></div>
                         <v-card-text @click="openDetailModal(order.id)" class="card-content">
                           <div class="d-flex justify-space-between align-center">
                              <p class="font-weight-bold text-body-1">{{ order.customer_name }}</p>
                              <v-chip size="x-small" :color="getStatusColor(order.status)" variant="flat" label>{{ statusDisplayMap[order.status] }}</v-chip>
                           </div>
                           <p class="text-caption text-medium-emphasis mt-1">
                              {{ order.details.fabric_type }} - {{ order.quantity_meters }}m
                           </p>
                           <v-divider class="my-2"></v-divider>

                           <p v-if="order.status === 'changes_requested'" class="text-caption text-red-lighten-2 text-truncate font-italic d-flex align-center">
                             <v-icon size="small" start>mdi-comment-alert-outline</v-icon>
                             Alteração: {{ getLatestChangeComment(order) }}
                           </p>
                           <p v-else class="text-caption text-medium-emphasis text-truncate">{{ order.details.stamp_details }}</p>

                         </v-card-text>

                         <v-card-actions v-if="['finalizing', 'customer_approval'].includes(order.status)" class="pa-2">
                           <v-spacer></v-spacer>
                           <v-btn
                             size="small"
                             variant="tonal"
                             color="cyan-accent-3"
                             @click.stop="openUploadModalForOrder(order)"
                             class="upload-btn"
                           >
                             <v-icon start size="small">mdi-upload-outline</v-icon>
                             Anexar Arte
                           </v-btn>
                         </v-card-actions>
                      </v-card>
                   </div>
                </template>
              </draggable>

              <div v-if="getColumnOrders(column.statuses).length === 0 && !loading" class="empty-column">
                  <v-icon size="48" class="mb-2 text-grey-darken-2">mdi-tray-arrow-down</v-icon>
                  <span>Nenhum pedido aqui.</span>
              </div>
            </div>
          </template>
        </draggable>
      </div>
    </div>

     <div v-if="loading" class="text-center py-16">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-4">Buscando pedidos...</p>
     </div>

    <OrderDetailModal :show="showDetailModal" :order-id="selectedOrderId" @close="showDetailModal = false" />
    <FileUploadModal :show="showUploadModal" :order="selectedOrder" :title="uploadModalTitle" @close="showUploadModal = false" @uploaded="handleUploadSuccess" />

  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { supabase } from '@/api/supabase';
import draggable from 'vuedraggable';
import OrderDetailModal from '@/components/OrderDetailModal.vue';
import FileUploadModal from '@/components/FileUploadModal.vue';
import { useUserStore } from '@/stores/user';
import type { RealtimeChannel } from '@supabase/supabase-js';

// --- LÓGICA DE PARTÍCULAS ---
const particleCanvas = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let isDragging = false;
let animationFrameId: number;

class Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  life: number;
  maxLife: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * 2 - 1;
    this.color = color;
    this.maxLife = Math.random() * 50 + 30;
    this.life = this.maxLife;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life -= 1;
    if (this.size > 0.1) this.size -= 0.05;
  }

  draw() {
    if (ctx) {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.life / this.maxLife;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function initParticles(e: MouseEvent) {
    if (!isDragging || !particleCanvas.value) return;
    const rect = particleCanvas.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = 0; i < 2; i++) {
        particles.push(new Particle(x, y, `hsla(${Math.random() * 60 + 200}, 100%, 70%, 1)`));
    }
}

function animateParticles() {
  if (ctx && particleCanvas.value) {
    ctx.clearRect(0, 0, particleCanvas.value.width, particleCanvas.value.height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
      if (particles[i].life < 0) {
        particles.splice(i, 1);
        i--;
      }
    }
  }
  animationFrameId = requestAnimationFrame(animateParticles);
}

// --- FIM DA LÓGICA DE PARTÍCULAS ---

type DesignStatus = 'design_pending' | 'in_design' | 'changes_requested' | 'finalizing' | 'customer_approval';
type Order = {
  id: string;
  customer_name: string;
  quantity_meters: number;
  status: DesignStatus;
  created_by: string;
  details: {
    stamp_details: string;
    fabric_type: string;
    final_art_url?: string;
  };
  order_logs?: { description: string, created_at: string }[];
};

const orders = ref<Order[]>([]);
const loading = ref(true);
const userStore = useUserStore();
const showDetailModal = ref(false);
const selectedOrderId = ref<string | null>(null);
const showUploadModal = ref(false);
const selectedOrder = ref<Order | null>(null);
const uploadModalTitle = ref('');
const ordersListener = ref<RealtimeChannel | null>(null);

const columns = ref([
  { id: 1, title: 'Fila de Espera', icon: 'mdi-clock-outline', color: '#90a4ae', statuses: ['design_pending'] },
  { id: 2, title: 'Em Desenvolvimento', icon: 'mdi-pencil-ruler', color: '#40c4ff', statuses: ['in_design'] },
  { id: 3, title: 'Alteração Solicitada', icon: 'mdi-alert-circle-outline', color: '#ff5252', statuses: ['changes_requested'] },
  { id: 4, title: 'Finalização', icon: 'mdi-star-outline', color: '#e040fb', statuses: ['finalizing'] },
  { id: 5, title: 'Aprovação Pendente', icon: 'mdi-send-check-outline', color: '#ffab40', statuses: ['customer_approval'] },
]);

const onDragStart = () => {
  isDragging = true;
  document.addEventListener('mousemove', initParticles);
};

const onDragEnd = async (event: any) => {
    isDragging = false;
    document.removeEventListener('mousemove', initParticles);

    const { item, to } = event;
    const orderId = item.dataset?.id;
    const newStatus = to.getAttribute('data-status') as DesignStatus;

    if (!orderId || !newStatus) return;

    const order = orders.value.find(o => o.id === orderId);
    if (!order || order.status === newStatus) return;

    await updateOrderStatus(order.id, newStatus, order);
};

const onCardMouseMove = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  card.style.setProperty('--mouse-x', `${x}px`);
  card.style.setProperty('--mouse-y', `${y}px`);
};

const statusDisplayMap: Record<DesignStatus, string> = {
    design_pending: 'Na Fila', in_design: 'Em Design', changes_requested: 'Alteração',
    finalizing: 'Finalizando', customer_approval: 'Aprovação'
};
const getColumnOrders = (statuses: DesignStatus[]) => {
    return orders.value.filter(order => statuses.includes(order.status));
};
const getStatusColor = (status: DesignStatus) => columns.value.find(c => c.statuses.includes(status))?.color || 'grey';
const openDetailModal = (orderId: string) => {
    selectedOrderId.value = orderId;
    showDetailModal.value = true;
};
const openUploadModalForOrder = (order: Order) => {
  selectedOrder.value = order;
  uploadModalTitle.value = `Anexar Arte para "${order.customer_name}"`;
  showUploadModal.value = true;
};
const handleUploadSuccess = async (fileUrl: string) => {
    if (!selectedOrder.value) return;
    const success = await updateOrderStatus(selectedOrder.value.id, selectedOrder.value.status, selectedOrder.value, fileUrl);
    if (success) {
      const orderIndex = orders.value.findIndex(o => o.id === selectedOrder.value?.id);
      if(orderIndex !== -1 && orders.value[orderIndex].details) {
          orders.value[orderIndex].details.final_art_url = fileUrl;
      }
    }
    showUploadModal.value = false;
    selectedOrder.value = null;
};
const getLatestChangeComment = (order: Order): string => {
  if (order.order_logs && order.order_logs.length > 0) {
    const latestLog = order.order_logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    return latestLog.description;
  }
  return 'Detalhes da alteração não encontrados.';
};
const updateOrderStatus = async (orderId: string, newStatus: DesignStatus, order: Order, fileUrl?: string): Promise<boolean> => {
  try {
    if (!userStore.profile) return false;
    let updateData: any = { status: newStatus, designer_id: userStore.profile.id };
    if (fileUrl) {
        updateData.details = { ...order.details, final_art_url: fileUrl };
    }
    const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
    if (error) throw error;
    const statusText = statusDisplayMap[newStatus] || newStatus;
    const logDescription = `Status alterado para "${statusText}" pelo designer.`;
    await supabase.from('order_logs').insert({ order_id: orderId, profile_id: userStore.profile.id, log_type: 'STATUS_CHANGE', description: logDescription });
    const orderIndex = orders.value.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
        orders.value[orderIndex].status = newStatus;
        if (fileUrl && orders.value[orderIndex].details) {
            orders.value[orderIndex].details.final_art_url = fileUrl;
        }
    }
    if (newStatus === 'customer_approval') {
        await notifyStakeholders(order, fileUrl);
    }
    return true;
  } catch (err) {
    return false;
  }
};
const notifyStakeholders = async (order: Order, fileUrl?: string) => {
    if (!userStore.profile) return;
    try {
        const { data: usersToNotify, error: fetchUsersError } = await supabase.from('profiles').select('id').in('role', ['vendedor', 'admin']);
        if (fetchUsersError) throw fetchUsersError;
        if (!usersToNotify || usersToNotify.length === 0) return;
        let content = `A arte para o pedido de "${order.customer_name}" está pronta para aprovação.`;
        if (fileUrl) content += ` Uma nova versão do arquivo foi anexada.`;
        const notifications = usersToNotify.map(user => ({ recipient_id: user.id, sender_id: userStore.profile!.id, content: content, redirect_url: `/pedidos/${order.id}/aprovar` }));
        const { error: notificationError } = await supabase.from('notifications').insert(notifications);
        if (notificationError) throw notificationError;
    } catch (error) {
    }
};
const fetchOrdersForDesign = async () => {
  loading.value = true;
  try {
    const relevantStatuses = columns.value.flatMap(c => c.statuses);
    const { data, error } = await supabase.from('orders').select('*, order_logs(created_at, description)').in('status', relevantStatuses);
    if (error) throw error;
    orders.value = data as Order[];
  } catch (err) {
  } finally {
    loading.value = false;
  }
};
const setupOrdersListener = () => {
    ordersListener.value = supabase
        .channel('public:orders:design-kanban')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            fetchOrdersForDesign();
        })
        .subscribe();
}

onMounted(async () => {
  if (!userStore.profile) {
    await userStore.fetchSession();
  }
  fetchOrdersForDesign();
  setupOrdersListener();

  if (particleCanvas.value) {
    ctx = particleCanvas.value.getContext('2d');
    particleCanvas.value.width = window.innerWidth;
    particleCanvas.value.height = window.innerHeight;
    animateParticles();
  }
});

onUnmounted(() => {
    if (ordersListener.value) {
        supabase.removeChannel(ordersListener.value);
    }
    cancelAnimationFrame(animationFrameId);
    document.removeEventListener('mousemove', initParticles);
});
</script>

<style scoped lang="scss">
@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
}
@keyframes pulse-glow {
  0% { border-color: rgba(var(--v-theme-primary-rgb), 0.5); box-shadow: 0 0 10px rgba(var(--v-theme-primary-rgb), 0.3); }
  50% { border-color: rgba(var(--v-theme-primary-rgb), 1); box-shadow: 0 0 20px 5px rgba(var(--v-theme-primary-rgb), 0.5); }
  100% { border-color: rgba(var(--v-theme-primary-rgb), 0.5); box-shadow: 0 0 10px rgba(var(--v-theme-primary-rgb), 0.3); }
}

.particle-canvas {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: 0;
  pointer-events: none;
}

.design-kanban-page {
  padding: 1rem 2rem;
  position: relative;
  z-index: 1;
}

.kanban-board-container {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 2rem;
}

.kanban-board {
  display: flex;
  gap: 2rem;
  min-width: fit-content;
  padding: 1rem;
}

.kanban-column {
  width: 340px;
  flex-shrink: 0;
  background-color: rgba(25, 25, 30, 0.6);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 220px);
  animation: float 8s ease-in-out infinite;
  animation-delay: var(--animation-delay, 0s);
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(5px);

  &:hover {
    transform: scale(1.03) translateY(-7px) !important;
    box-shadow: 0 25px 50px rgba(0,0,0,0.4);
  }
}

.column-header {
  padding: 1rem 1.25rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  cursor: grab;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  .column-title { font-size: 1.1rem; font-weight: bold; }
}

.column-content {
  padding: 0.5rem 1rem 1rem 1rem;
  flex-grow: 1;
  min-height: 200px;
  overflow-y: auto;
}

.order-card {
  cursor: pointer;
  background-color: rgba(35, 35, 45, 0.8);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  border: 1px solid transparent;
  transition: transform 0.2s ease-out;

  .card-content { z-index: 2; }
  .card-border {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.2), transparent 40%);
    opacity: 0;
    transition: opacity 0.4s;
  }
  &:hover .card-border { opacity: 1; }
}

.empty-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  color: #616161;
}

.ghost-card {
  opacity: 0.5;
  background: rgba(255, 255, 255, 0.1);
  border: 2px dashed;
  border-radius: 12px;
  animation: pulse-glow 1.5s infinite ease-in-out;
}

.dragging-card {
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  transform: scale(1.05);
  border: 1px solid;
  border-image: conic-gradient(from 0deg, #e040fb, #40c4ff, #e040fb) 1;
}

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
</style>
