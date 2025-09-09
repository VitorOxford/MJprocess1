import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';

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
  order_items: {
    id: string;
    status: string;
    fabric_type: string;
    quantity_meters: number;
  }[];
  updated_at: string;
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
    loading: false,
    lastFetched: null as Date | null,
  }),

  getters: {
    itemsPendingSellerApprovalCount(): number {
        const userStore = useUserStore();
        if (!userStore.profile?.id) return 0;

        let count = 0;
        this.orders.forEach(order => {
            if (order.created_by === userStore.profile.id && order.is_launch && order.order_items) {
                count += order.order_items.filter(item => item.status === 'customer_approval').length;
            }
        });
        return count;
    },

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
    ordersPendingApproval: (state) => {
        return state.orders.filter(o => o.status === 'customer_approval');
    },
    totalMetersPendingApproval(): number {
        return this.ordersPendingApproval.reduce((sum, order) => sum + order.quantity_meters, 0);
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
          supabase.from('orders').select('*, creator:created_by(full_name), order_items(id, status, fabric_type, quantity_meters)'),
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
