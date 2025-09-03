import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

// Tipo de Pedido atualizado para incluir os novos campos
export type Order = {
  id: string;
  status: string;
  quantity_meters: number;
  created_at: string;
  created_by: string;
  customer_name: string;
  order_number: number | null;
  is_launch: boolean;
  has_down_payment: boolean;
  down_payment_proof_url: string | null;
  details: {
    fabric_type: string;
    [key: string]: any;
  } | null;
  stores: {
    name: string;
  } | null;
  creator?: {
    full_name: string;
  };
  order_items: { id: string, status: string }[];
  updated_at: string;
};

export type Task = {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  user_id: string;
};

const fabricMachineMap: Record<string, 'MESA' | 'CORRIDA'> = {
  'Creponado': 'MESA', 'Tule': 'MESA', 'Fluity': 'MESA', 'Canelado': 'MESA', 'Suplex': 'MESA', 'Chiffon': 'MESA', 'Liganet': 'MESA',
  'Crepinho': 'CORRIDA', 'Twill Fly': 'CORRIDA', 'Toque de seda': 'CORRIDA', 'Corta-Vento': 'CORRIDA', 'Tactel': 'CORRIDA', 'Alfaiataria': 'CORRIDA'
};

const getMachineTypeForFabric = (fabric: string): 'MESA' | 'CORRIDA' => {
  return fabricMachineMap[fabric] || 'CORRIDA';
};


export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    orders: [] as Order[],
    tasks: [] as Task[],
    loading: false,
    lastFetched: null as Date | null,
  }),

  getters: {
    // ===== INÍCIO DA CORREÇÃO =====
    // Este getter agora ignora completamente os pedidos legados.
    itemsPendingSellerApprovalCount(): number {
        const userStore = useUserStore();
        if (!userStore.profile?.id) return 0;

        let count = 0;
        this.orders.forEach(order => {
            // Conta apenas itens de pedidos do vendedor logado QUE SEJAM LANÇAMENTOS (is_launch = true)
            if (order.created_by === userStore.profile.id && order.is_launch && order.order_items) {
                count += order.order_items.filter(item => item.status === 'customer_approval').length;
            }
        });
        return count;
    },
    // ===== FIM DA CORREÇÃO =====

    totalMetersAllTime(state): number {
      return state.orders.reduce((sum, order) => sum + (order.quantity_meters || 0), 0);
    },
    totalMetersCurrentMonth(state): number {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      return state.orders
        .filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        })
        .reduce((sum, order) => sum + (order.quantity_meters || 0), 0);
    },
    ordersInProductionQueue: (state) => {
        const productionStatuses = ['production_queue', 'in_printing', 'in_cutting', 'pending_stock'];
        return state.orders.filter(o => productionStatuses.includes(o.status));
    },
    ordersInDesignQueue: (state) => {
        const designStatuses = ['design_pending', 'in_design', 'customer_approval', 'changes_requested', 'finalizing'];
        return state.orders.filter(o => designStatuses.includes(o.status));
    },
    ordersPendingApproval: (state) => {
        return state.orders.filter(o => o.status === 'customer_approval');
    },
    ordersPendingApprovalCount(): number {
        return this.ordersPendingApproval.length;
    },
    totalMetersPendingApproval(): number {
        return this.ordersPendingApproval.reduce((sum, order) => sum + order.quantity_meters, 0);
    },
    ordersInProductionCount(): number {
        return this.ordersInProductionQueue.length;
    },
    ordersInDesign(): number {
        return this.ordersInDesignQueue.length;
    },
    totalMetersInProduction(): number {
        return this.ordersInProductionQueue.reduce((sum, order) => sum + order.quantity_meters, 0);
    },
    totalMetersInDesign(): number {
      return this.ordersInDesignQueue.reduce((sum, order) => sum + order.quantity_meters, 0);
    },
    totalMetersInPipeline(): number {
      return this.totalMetersInProduction + this.totalMetersInDesign;
    },
    metersInProductionMesa(): number {
        return this.ordersInProductionQueue
            .filter(o => o.details && getMachineTypeForFabric(o.details.fabric_type) === 'MESA')
            .reduce((sum, order) => sum + order.quantity_meters, 0);
    },
    metersInProductionCorrida(): number {
        return this.ordersInProductionQueue
            .filter(o => o.details && getMachineTypeForFabric(o.details.fabric_type) === 'CORRIDA')
            .reduce((sum, order) => sum + order.quantity_meters, 0);
    },
    pendingTasks: (state) => (userId: string) => {
        return state.tasks.filter(t => t.user_id === userId && !t.is_completed);
    },
  },

  actions: {
    async fetchData() {
      if (this.lastFetched && (new Date().getTime() - this.lastFetched.getTime()) < 30000) {
        return;
      }

      this.loading = true;
      try {
        const user = (await supabase.auth.getSession()).data.session?.user;
        if (!user) throw new Error('Usuário não autenticado.');

        const [ordersResponse, tasksResponse] = await Promise.all([
          supabase.from('orders').select('*, creator:created_by(full_name), order_items(id, status)'),
          supabase.from('tasks').select('*'),
        ]);

        if (ordersResponse.error) throw ordersResponse.error;
        if (tasksResponse.error) throw tasksResponse.error;

        this.orders = ordersResponse.data as any[];
        this.tasks = tasksResponse.data as Task[];
        this.lastFetched = new Date();

      } catch (error: any) {
        console.error('Erro ao buscar dados para o dashboard:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});
