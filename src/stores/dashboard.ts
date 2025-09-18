import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';
import { useUserStore } from '@/stores/user';
import { isBefore, startOfToday, parseISO, addMonths, subMonths, format, isValid, getDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type OrderItem = {
  id: string;
  status: string;
  fabric_type: string;
  quantity_meters: number;
  created_at: string;
  design_tag: string;
  billed_quantity: number | null;
  [key: string]: any;
};

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
  order_items: OrderItem[];
  updated_at: string;
  billed_at: string | null;
  delivery_confirmed_at: string | null;
  actual_delivery_date: string | null;
};

export type Task = {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
  user_id: string;
};

export type ProductionScheduleItem = {
  scheduled_date: string;
  order: Order;
  item: OrderItem;
};

// Função para adicionar dias úteis (não conta domingos)
const addBusinessDays = (startDate: Date, days: number): Date => {
  const newDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < days) {
    newDate.setDate(newDate.getDate() + 1);
    if (newDate.getDay() !== 0) { // Domingo = 0
      addedDays++;
    }
  }
  return newDate;
};

// Função para encontrar o próximo dia de entrega (Terça, Quinta, Sábado)
const getNextDeliveryDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    while (true) {
        const dayOfWeek = newDate.getDay();
        if ([2, 4, 6].includes(dayOfWeek)) {
            return newDate;
        }
        newDate.setDate(newDate.getDate() + 1);
    }
};

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    orders: [] as Order[],
    tasks: [] as Task[],
    productionScheduleItems: [] as ProductionScheduleItem[],
    loading: false,
    lastFetched: null as Date | null,
    kpiSelectedDate: new Date(),
  }),

  getters: {
    // CORREÇÃO APLICADA AQUI
    productionGhosts(state) {
      if (!state.productionScheduleItems || state.productionScheduleItems.length === 0) {
        return [];
      }

      const inProductionItems = state.productionScheduleItems.filter(
        p => ['in_printing', 'in_cutting', 'production_queue'].includes(p.item.status)
      );

      const ordersInProduction = new Map<string, ProductionScheduleItem[]>();
      for (const pItem of inProductionItems) {
        if (!ordersInProduction.has(pItem.order.id)) {
          ordersInProduction.set(pItem.order.id, []);
        }
        ordersInProduction.get(pItem.order.id)!.push(pItem);
      }

      const groupedGhosts = [];
      for (const [orderId, scheduledItems] of ordersInProduction.entries()) {
        if (scheduledItems.length === 0) continue;

        const latestScheduledDate = scheduledItems.reduce((latest, current) => {
          const currentDate = parseISO(current.scheduled_date);
          return currentDate > latest ? currentDate : latest;
        }, new Date(0));

        const completionDate = addBusinessDays(latestScheduledDate, 3);
        const forecastDeliveryDate = getNextDeliveryDay(completionDate);

        const parentOrder = scheduledItems[0].order;
        const allItemsForThisOrder = scheduledItems.map(si => si.item);
        const totalMeters = allItemsForThisOrder.reduce((sum, current) => sum + current.quantity_meters, 0);

        groupedGhosts.push({
          ...parentOrder,
          id: parentOrder.id,
          order_items: allItemsForThisOrder, // Garante que a lista de itens esteja no objeto
          quantity_meters: totalMeters,
          forecast_completion_date: completionDate,
          forecast_delivery_date: forecastDeliveryDate,
        });
      }

      return groupedGhosts;
    },

    monthlyProduction(state) {
      const selectedYear = state.kpiSelectedDate.getFullYear();
      const selectedMonth = state.kpiSelectedDate.getMonth();

      const filteredOrders = state.orders.filter(order => {
          const orderDate = parseISO(order.created_at);
          return isValid(orderDate) && orderDate.getFullYear() === selectedYear && orderDate.getMonth() === selectedMonth;
      });

      const totalMeters = filteredOrders.reduce((sum, order) => sum + (order.quantity_meters || 0), 0);

      return {
          totalOrders: filteredOrders.length,
          totalMeters: totalMeters,
          displayMonth: format(state.kpiSelectedDate, 'MMMM yyyy', { locale: ptBR })
      };
    },
    ordersWithDownPayment(state): Order[] {
      return state.orders.filter(o => o.has_down_payment);
    },
    ordersPendingApproval: (state) => {
        return state.orders.filter(o => o.status === 'customer_approval' || (o.is_launch && o.order_items.some(item => item.status === 'customer_approval')));
    },
    totalMetersPendingApproval(state): number {
        return state.orders
            .flatMap(order => order.order_items || [])
            .filter(item => item.status === 'customer_approval')
            .reduce((sum, item) => sum + (item.quantity_meters || 0), 0);
    },
    itemsDelayedInDesign(state): { count: number, totalMeters: number } {
        const designStatuses = ['design_pending', 'customer_approval', 'changes_requested', 'approved_by_designer', 'finalizing'];
        const today = startOfToday();
        let count = 0;
        let totalMeters = 0;

        state.orders.forEach(order => {
            if (order.is_launch && order.order_items) {
                order.order_items.forEach(item => {
                    if (designStatuses.includes(item.status) && isBefore(parseISO(item.created_at), today)) {
                        count++;
                        totalMeters += item.quantity_meters;
                    }
                });
            }
        });
        return { count, totalMeters };
    },
    delayedDesignItemsDetails(state) {
      const designStatuses = ['design_pending', 'customer_approval', 'changes_requested', 'approved_by_designer', 'finalizing'];
      const today = startOfToday();
      return state.orders
          .flatMap(order =>
              (order.order_items || []).map(item => ({ ...item, orderInfo: order }))
          )
          .filter(item =>
              designStatuses.includes(item.status) &&
              isBefore(parseISO(item.created_at), today)
          )
          .map(item => ({
              item_id: item.id,
              order_id: item.orderInfo.id,
              customer_name: item.orderInfo.customer_name,
              creator_name: item.orderInfo.creator?.full_name || 'N/A',
              stamp_ref: (item as any).stamp_ref,
              quantity_meters: item.quantity_meters,
              status: item.status,
              design_tag: item.design_tag
          }));
    },
    allDesignItemsDetails(state) {
      const activeDesignStatuses = ['design_pending', 'changes_requested', 'approved_by_designer', 'finalizing'];
      return state.orders
          .flatMap(order =>
              (order.order_items || []).map(item => ({ ...item, orderInfo: order }))
          )
          .filter(item => activeDesignStatuses.includes(item.status))
          .map(item => ({
              item_id: item.id,
              order_id: item.orderInfo.id,
              customer_name: item.orderInfo.customer_name,
              creator_name: item.orderInfo.creator?.full_name || 'N/A',
              stamp_ref: (item as any).stamp_ref,
              quantity_meters: item.quantity_meters,
              status: item.status,
              design_tag: item.design_tag
          }));
    },
    totalMetersInProduction(state): number {
        const cutoffDateString = '2025-08-29';
        return state.orders
            .filter(order => {
                const createdAt = order.created_at.substring(0, 10);
                return createdAt >= cutoffDateString && !order.delivery_confirmed_at;
            })
            .reduce((sum, order) => sum + (order.quantity_meters || 0), 0);
    },
    totalMetersInDesign(state): number {
        const designStatuses = ['design_pending', 'changes_requested', 'approved_by_designer', 'finalizing'];
        return state.orders
            .flatMap(order => order.is_launch ? order.order_items : [])
            .filter(item => designStatuses.includes(item.status))
            .reduce((sum, item) => sum + (item.quantity_meters || 0), 0);
    },
    completedOrders(state): Order[] {
        const cutoffDateString = '2025-08-29';
        return state.orders
            .filter(order =>
                order.status === 'completed' &&
                !order.billed_at &&
                !order.actual_delivery_date &&
                order.created_at.substring(0, 10) >= cutoffDateString
            )
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    deliveredOrders(state): Order[] {
        return state.orders
            .filter(order => order.status === 'delivered' || !!order.delivery_confirmed_at)
            .sort((a, b) => new Date(b.delivery_confirmed_at || 0).getTime() - new Date(a.delivery_confirmed_at || 0).getTime());
    },
    salesBySeller(state): { seller: string, totalMeters: number }[] {
        const salesMap = new Map<string, number>();
        state.orders.forEach(order => {
            const sellerName = order.creator?.full_name || 'Sem Vendedor';
            const currentMeters = salesMap.get(sellerName) || 0;
            salesMap.set(sellerName, currentMeters + order.quantity_meters);
        });
        return Array.from(salesMap.entries()).map(([seller, totalMeters]) => ({ seller, totalMeters })).sort((a, b) => b.totalMeters - a.totalMeters);
    },
    salesByFabric(state): { fabric: string, totalMeters: number }[] {
        const fabricMap = new Map<string, number>();
        state.orders.forEach(order => {
            if (order.is_launch) {
                order.order_items.forEach(item => {
                    const fabricName = item.fabric_type || 'Não especificado';
                    const currentMeters = fabricMap.get(fabricName) || 0;
                    fabricMap.set(fabricName, currentMeters + item.quantity_meters);
                });
            } else if(order.details?.fabric_type) {
                const fabricName = order.details.fabric_type;
                const currentMeters = fabricMap.get(fabricName) || 0;
                fabricMap.set(fabricName, currentMeters + order.quantity_meters);
            }
        });
        return Array.from(fabricMap.entries()).map(([fabric, totalMeters]) => ({ fabric, totalMeters })).sort((a, b) => b.totalMeters - a.totalMeters);
    },
    designItemsStatus(state): { onTime: number, delayed: number } {
      const designStatuses = ['design_pending', 'customer_approval', 'changes_requested', 'approved_by_designer', 'finalizing'];
      const today = startOfToday();
      let onTime = 0;
      let delayed = 0;
       state.orders.forEach(order => {
            if (order.is_launch && order.order_items) {
                order.order_items.forEach(item => {
                    if (designStatuses.includes(item.status)) {
                        if (isBefore(parseISO(item.created_at), today)) {
                            delayed++;
                        } else {
                            onTime++;
                        }
                    }
                });
            }
        });
      return { onTime, delayed };
    }
  },

  actions: {
    nextMonthKpi() {
        this.kpiSelectedDate = addMonths(this.kpiSelectedDate, 1);
    },
    previousMonthKpi() {
        this.kpiSelectedDate = subMonths(this.kpiSelectedDate, 1);
    },
    async fetchProductionSchedule() {
      this.loading = true;
      try {
        const { data, error } = await supabase
          .from('production_schedule')
          .select(`
            scheduled_date,
            item:order_items!inner(*),
            order:orders!inner(
              *,
              creator:created_by(full_name),
              order_items(*)
            )
          `)
          .in('item.status', ['in_printing', 'in_cutting', 'production_queue']);

        if (error) throw error;
        this.productionScheduleItems = (data as any[]) || [];
      } catch (err) {
        console.error("Erro ao buscar agendamento de produção:", err);
      } finally {
        this.loading = false;
      }
    },

    async fetchData() {
      if (this.lastFetched && (new Date().getTime() - this.lastFetched.getTime()) < 30000) {
        return;
      }

      this.loading = true;
      try {
        const user = (await supabase.auth.getSession()).data.session?.user;
        if (!user) throw new Error('Usuário não autenticado.');

        const [ordersResponse, tasksResponse] = await Promise.all([
          supabase.from('orders').select('*, creator:created_by(full_name), order_items(*)'),
          supabase.from('tasks').select('*'),
          this.fetchProductionSchedule()
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
