import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';

export type Order = {
  id: string;
  status: string;
  quantity_meters: number;
  created_at: string;
  created_by: string;
  customer_name: string;
  stores: {
    name: string;
  } | null;
};

export type Task = {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  user_id: string;
};

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    orders: [] as Order[],
    tasks: [] as Task[],
    ordersPendingApproval: [] as Order[], // NOVO: Estado para pedidos pendentes
    loading: false,
    lastFetched: null as Date | null,
  }),

  getters: {
    ordersInProduction: (state) => {
        const productionStatuses = ['production_queue', 'in_printing', 'in_cutting'];
        return state.orders.filter(o => productionStatuses.includes(o.status)).length;
    },
    ordersInDesign: (state) => {
        const designStatuses = ['design_pending', 'in_design', 'customer_approval', 'changes_requested', 'finalizing'];
        return state.orders.filter(o => designStatuses.includes(o.status)).length;
    },
    pendingTasks: (state) => (userId: string) => {
        return state.tasks.filter(t => t.user_id === userId && !t.is_completed);
    },
    // NOVO: Getter para contar aprovações pendentes
    pendingApprovalsCount: (state) => state.ordersPendingApproval.length,
  },

  actions: {
    async fetchData() {
      // ... verificação de cache
      if (this.lastFetched && (new Date().getTime() - this.lastFetched.getTime()) < 30000) {
        return;
      }

      this.loading = true;
      try {
        const user = (await supabase.auth.getSession()).data.session?.user;
        if (!user) throw new Error('Usuário não autenticado.');

        const [ordersResponse, tasksResponse, approvalResponse] = await Promise.all([
          supabase.from('orders').select('*, stores(name)'),
          supabase.from('tasks').select('*'),
          // NOVO: Busca pedidos pendentes para aprovação do usuário logado
          supabase.from('orders').select('*').eq('status', 'customer_approval').eq('created_by', user.id),
        ]);

        if (ordersResponse.error) throw ordersResponse.error;
        if (tasksResponse.error) throw tasksResponse.error;
        if (approvalResponse.error) throw approvalResponse.error; // NOVO: Trata o erro da nova busca

        this.orders = ordersResponse.data as any[];
        this.tasks = tasksResponse.data as Task[];
        this.ordersPendingApproval = approvalResponse.data as Order[]; // NOVO: Armazena os dados
        this.lastFetched = new Date();

      } catch (error: any) {
        console.error('Erro ao buscar dados para o dashboard:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});
