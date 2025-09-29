import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';
import { isBefore, startOfToday, parseISO, addMonths, subMonths, format, isValid, getDay, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// TIPAGEM (sem alterações)
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
  forecast_delivery_date?: string | null; // <-- GARANTIR QUE ESTE CAMPO ESTÁ NA TIPAGEM
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

// FUNÇÕES AUXILIARES (sem alterações)
const excludedSellers = ['João Vitor', 'Levi Lopes'];
const normalizeFabricName = (name: string | null | undefined): string => {
    if (!name) return 'Não especificado';
    return name.toLowerCase().replace(/^(tecido|malha)\s+/i, '').trim().replace(/^\w/, (c) => c.toUpperCase());
};
const addBusinessDays = (startDate: Date, days: number): Date => {
  const newDate = new Date(startDate);
  let addedDays = 0;
  while (addedDays < targetDays) {
    newDate.setDate(newDate.getDate() + 1);
    if (newDate.getDay() !== 0) { // Domingo = 0
      addedDays++;
    }
  }
  return newDate;
};
const getNextDeliveryDay = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    while (true) {
        const dayOfWeek = getDay(newDate);
        if ([2, 4, 6].includes(dayOfWeek)) {
            return newDate;
        }
        newDate.setDate(newDate.getDate() + 1);
    }
};

// STORE COM LOGS
export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    orders: [] as Order[],
    tasks: [] as Task[],
    productionScheduleItems: [] as ProductionScheduleItem[], // Mantido para outras partes do app
    loading: false,
    lastFetched: null as Date | null,
    kpiSelectedDate: new Date(),
  }),

  getters: {
    // GETTER `productionGhosts` COM LOGS DETALHADOS
    productionGhosts(state) {
      console.log("================ GHOSTS LOG START ================");
      console.log(`[GHOSTS] Total de pedidos no state: ${state.orders.length}`);

      // 1. Filtra os pedidos para encontrar os "fantasmas" em potencial.
      const inProgressLaunchOrders = state.orders.filter(order => {
        const isGhostCandidate =
          order.is_launch &&
          !order.actual_delivery_date &&
          order.status !== 'completed' &&
          order.status !== 'delivered';

        if (isGhostCandidate) {
          // Log para cada candidato a fantasma
          console.log(`[GHOSTS] Pedido #${order.order_number} é um candidato. Status: ${order.status}, Data Prevista do DB: ${order.forecast_delivery_date}`);
        }
        return isGhostCandidate;
      });
      console.log(`[GHOSTS] Encontrados ${inProgressLaunchOrders.length} pedidos candidatos a fantasma.`);

      // 2. Mapeia os candidatos para o formato final, calculando as datas.
      const finalGhosts = inProgressLaunchOrders.map(order => {
        const creationDate = parseISO(order.created_at);

        // A produção começa NO DIA SEGUINTE ao lançamento.
        const startProductionDate = addDays(creationDate, 1);

        // Adiciona 2 dias úteis para completar o total de 3 dias de produção.
        const completionDate = addBusinessDays(startProductionDate, 2);

        // Encontra o próximo dia de entrega (Ter, Qui, Sáb) após a conclusão.
        const forecastDeliveryDate = getNextDeliveryDay(completionDate);

        // Log detalhado para cada fantasma processado
        console.log(`[GHOSTS] Processando Pedido #${order.order_number}:
          - Data Criação: ${format(creationDate, 'dd/MM/yyyy')}
          - Início Produção (Dia Seguinte): ${format(startProductionDate, 'dd/MM/yyyy')}
          - Conclusão (Início + 2 dias úteis): ${format(completionDate, 'dd/MM/yyyy')}
          - PREVISÃO DE ENTREGA CALCULADA: ${format(forecastDeliveryDate, 'dd/MM/yyyy (EEEE)', { locale: ptBR })}`);

        return {
          ...order,
          id: order.id,
          forecast_completion_date: completionDate,
          forecast_delivery_date: forecastDeliveryDate,
        };
      });

      console.log(`[GHOSTS] Array final de fantasmas a ser enviado para o componente:`, finalGhosts);
      console.log("================ GHOSTS LOG END ================");
      return finalGhosts;
    },

    // O resto dos seus getters permanece aqui...
    filteredOrdersForCharts(state): Order[] {
        return state.orders.filter(order =>
            order.creator && !excludedSellers.includes(order.creator.full_name)
        );
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
        this.filteredOrdersForCharts.forEach(order => {
            const sellerName = order.creator?.full_name || 'Sem Vendedor';
            const currentMeters = salesMap.get(sellerName) || 0;
            salesMap.set(sellerName, currentMeters + order.quantity_meters);
        });
        return Array.from(salesMap.entries()).map(([seller, totalMeters]) => ({ seller, totalMeters })).sort((a, b) => b.totalMeters - a.totalMeters);
    },
    salesByFabric(state): { fabric: string, totalMeters: number }[] {
        const fabricMap = new Map<string, number>();
        this.filteredOrdersForCharts.forEach(order => {
            if (order.is_launch) {
                order.order_items.forEach(item => {
                    const fabricName = normalizeFabricName(item.fabric_type);
                    const currentMeters = fabricMap.get(fabricName) || 0;
                    fabricMap.set(fabricName, currentMeters + item.quantity_meters);
                });
            } else if(order.details?.fabric_type) {
                const fabricName = normalizeFabricName(order.details.fabric_type);
                const currentMeters = fabricMap.get(fabricName) || 0;
                fabricMap.set(fabricName, currentMeters + order.quantity_meters);
            }
        });
        return Array.from(fabricMap.entries()).map(([fabric, totalMeters]) => ({ fabric, totalMeters })).sort((a, b) => b.totalMeters - a.totalMeters);
    },
    monthlySalesPerformance(state): { labels: string[], data: number[] } {
        const monthMap = new Map<string, number>();
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(today, i);
            const monthKey = format(date, 'MMM/yy', { locale: ptBR });
            monthMap.set(monthKey, 0);
        }
        this.filteredOrdersForCharts.forEach(order => {
            const orderDate = parseISO(order.created_at);
            if (isValid(orderDate)) {
                const monthKey = format(orderDate, 'MMM/yy', { locale: ptBR });
                if (monthMap.has(monthKey)) {
                    const currentMeters = monthMap.get(monthKey) || 0;
                    monthMap.set(monthKey, currentMeters + order.quantity_meters);
                }
            }
        });
        return {
            labels: Array.from(monthMap.keys()),
            data: Array.from(monthMap.values()),
        };
    },
    designItemsByStatus(state): { labels: string[], data: number[] } {
        const statusMap = new Map<string, number>();
        const designStatuses = ['Desenvolvimento', 'Alteração', 'Finalização', 'Aprovado'];
        designStatuses.forEach(status => statusMap.set(status, 0));
        state.orders.forEach(order => {
            if (order.is_launch && order.order_items) {
                order.order_items.forEach(item => {
                    if (item.design_tag && statusMap.has(item.design_tag)) {
                        statusMap.set(item.design_tag, (statusMap.get(item.design_tag) || 0) + 1);
                    }
                });
            }
        });
        return {
            labels: Array.from(statusMap.keys()),
            data: Array.from(statusMap.values()),
        };
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
    nextMonthKpi() { this.kpiSelectedDate = addMonths(this.kpiSelectedDate, 1); },
    previousMonthKpi() { this.kpiSelectedDate = subMonths(this.kpiSelectedDate, 1); },

    // AÇÃO `fetchData` COM LOGS E QUERY CORRIGIDA
    async fetchData() {
      if (this.lastFetched && (new Date().getTime() - this.lastFetched.getTime()) < 30000) {
        return;
      }

      this.loading = true;
      try {
        const user = (await supabase.auth.getSession()).data.session?.user;
        if (!user) throw new Error('Usuário não autenticado.');

        console.log("[FETCH_DATA] Buscando dados do Supabase...");

        // A query agora busca explicitamente a coluna `forecast_delivery_date`
        const { data, error } = await supabase.from('orders')
          .select('*, creator:created_by(full_name), order_items(*), forecast_delivery_date');

        if (error) throw error;

        console.log(`[FETCH_DATA] Recebidos ${data.length} pedidos do banco de dados.`);
        // Log para verificar se a coluna `forecast_delivery_date` está a vir
        if (data.length > 0) {
          console.log('[FETCH_DATA] Exemplo de primeiro pedido recebido:', data[0]);
        }

        this.orders = data as any[];
        // Não precisamos mais buscar tasks ou a production_schedule aqui
        this.lastFetched = new Date();

      } catch (error: any) {
        console.error('Erro ao buscar dados para o dashboard:', error);
      } finally {
        this.loading = false;
      }
    },

    // ===== INÍCIO DA CORREÇÃO =====
    // Ação reintroduzida para buscar dados específicos da produção
    async fetchProductionSchedule() {
      this.loading = true;
      try {
        const { data, error } = await supabase
          .from('production_schedule')
          .select(`
            scheduled_date,
            order:orders!inner(id, customer_name, order_number, creator:created_by(full_name)),
            item:order_items!inner(id, status, quantity_meters, fabric_type, stamp_ref, stamp_image_url)
          `);

        if (error) throw error;
        this.productionScheduleItems = (data as any[]) || [];
      } catch (e: any) {
        console.error('Erro ao buscar a agenda de produção:', e);
      } finally {
        this.loading = false;
      }
    },
    // ===== FIM DA CORREÇÃO =====
  },
});
