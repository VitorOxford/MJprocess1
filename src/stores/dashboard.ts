import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';

// Tipo de Pedido atualizado para incluir os novos campos
export type Order = {
  id: string;
  status: string;
  quantity_meters: number;
  created_at: string;
  created_by: string;
  customer_name: string;
  has_down_payment: boolean; // NOVO
  down_payment_proof_url: string | null; // NOVO
  details: {
    fabric_type: string;
    [key: string]: any;
  };
  stores: {
    name: string;
  } | null;
  profiles: { // Renomeado para 'creator' em alguns lugares para clareza
    full_name: string;
  } | null;
  creator?: { // Adicionado para consistência
      full_name: string;
  };
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
    totalMetersAllTime(state): number {
      return state.orders.reduce((sum, order) => sum + (order.quantity_meters || 0), 0);
    },
    ordersInProductionQueue: (state) => {
        const productionStatuses = ['production_queue', 'in_printing', 'in_cutting'];
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
            .filter(o => getMachineTypeForFabric(o.details.fabric_type) === 'MESA')
            .reduce((sum, order) => sum + order.quantity_meters, 0);
    },
    metersInProductionCorrida(): number {
        return this.ordersInProductionQueue
            .filter(o => getMachineTypeForFabric(o.details.fabric_type) === 'CORRIDA')
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
          supabase.from('orders').select('*, stores(name), creator:created_by(full_name)'),
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
