import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';

// Tipo de Pedido atualizado para incluir os detalhes do tecido
export type Order = {
  id: string;
  status: string;
  quantity_meters: number;
  created_at: string;
  created_by: string;
  customer_name: string;
  details: {
    fabric_type: string;
    [key: string]: any; // Permite outras propriedades nos detalhes
  };
  stores: {
    name: string;
  } | null;
  updated_at: string; // Adicionado para lógica de conclusão
};

export type Task = {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  user_id: string;
};

// Mapa de tecidos para máquinas, centralizado aqui
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
    // Pedidos que estão ativamente em produção
    ordersInProductionQueue: (state) => {
        const productionStatuses = ['production_queue', 'in_printing', 'in_cutting'];
        return state.orders.filter(o => productionStatuses.includes(o.status));
    },
    ordersInDesign: (state) => {
        const designStatuses = ['design_pending', 'in_design', 'customer_approval', 'changes_requested', 'finalizing'];
        return state.orders.filter(o => designStatuses.includes(o.status)).length;
    },
    // Contagem total em produção
    ordersInProductionCount(): number {
        return this.ordersInProductionQueue.length;
    },

    // --- NOVOS GETTERS PARA METRAGEM ---
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
    // --- FIM DOS NOVOS GETTERS ---

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
          supabase.from('orders').select('*, stores(name)'),
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
