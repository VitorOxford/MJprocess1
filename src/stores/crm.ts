// src/stores/crm.ts
import { defineStore } from 'pinia';
import { supabase } from '@/api/supabase';
import { formatISO, subDays, eachDayOfInterval, format, parseISO, differenceInDays } from 'date-fns';

// REGRA DE NEGÓCIO: Vendedoras da região Nordeste, conforme solicitado.
const NORDESTE_SELLERS = ['Elda', 'Sueli'];

export const useCrmStore = defineStore('crm', {
  state: () => ({
    filters: {
      startDate: formatISO(subDays(new Date(), 30), { representation: 'date' }),
      endDate: formatISO(new Date(), { representation: 'date' }),
    },
    rawOrders: [] as any[], // Armazena os pedidos brutos para cálculos nas abas

    // Dados processados para a Visão Geral
    overview: {
      kpis: null as Record<string, any> | null,
      sales_trend: [] as { day: string, total_revenue: number }[],
      top_fabrics: [] as { fabric: string, total_meters: number }[],
      top_sellers_by_meters: [] as any[],
      top_customers_by_meters: [] as any[],
    },
    salesByRegion: {
      Sudoeste: 0,
      Nordeste: 0,
    },
    loading: true,
  }),

  actions: {
    async fetchCrmData() {
      this.loading = true;
      console.clear(); // Limpa o console para uma nova análise
      console.log('CRM_DEBUG: Iniciando fetchCrmData...');
      try {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id, customer_name, created_at, created_by, total_value,
            order_items(fabric_type, quantity_meters),
            profiles:created_by(full_name, avatar_url, id)
          `)
          .gte('created_at', this.filters.startDate)
          .lte('created_at', this.filters.endDate);

        if (ordersError) throw ordersError;

        console.log('CRM_DEBUG: 1. DADOS BRUTOS RECEBIDOS DO SUPABASE:', orders);
        if (orders && orders.length > 0) {
          console.log('CRM_DEBUG: 1.1 Exemplo de perfil recebido no primeiro pedido:', orders[0].profiles);
        }


        this.rawOrders = orders;

        // --- Início dos Cálculos Manuais no Frontend ---
        let total_revenue = 0;
        const salesByDay = new Map<string, number>();
        const salesByFabric = new Map<string, number>();
        const salesBySeller = new Map<string, { total_meters: number, avatar_url: string }>();
        const salesByCustomer = new Map<string, number>();
        const salesByRegionCalc = { Sudoeste: 0, Nordeste: 0 };
        const customerFirstOrder = new Map<string, Date>();

        const dateInterval = eachDayOfInterval({ start: parseISO(this.filters.startDate), end: parseISO(this.filters.endDate) });
        dateInterval.forEach(day => salesByDay.set(format(day, 'yyyy-MM-dd'), 0));

        console.log('CRM_DEBUG: 2. INICIANDO PROCESSAMENTO DE', orders.length, 'PEDIDOS...');
        for (const order of orders) {
          // ... (cálculos de metragem e valor)
          const orderValue = order.total_value || 0;
          let orderMeters = 0;
          if (order.order_items) {
            for (const item of order.order_items) {
              const itemMeters = item.quantity_meters || 0;
              orderMeters += itemMeters;
              salesByFabric.set(item.fabric_type, (salesByFabric.get(item.fabric_type) || 0) + itemMeters);
            }
          }
          total_revenue += orderValue;
          const orderDay = format(parseISO(order.created_at), 'yyyy-MM-dd');
          if(salesByDay.has(orderDay)) salesByDay.set(orderDay, salesByDay.get(orderDay)! + orderValue);


          // LÓGICA DO VENDEDOR COM LOGS DETALHADOS
          let sellerName = order.profiles?.full_name || 'N/A';
          let sellerAvatarFromOrder = order.profiles?.avatar_url || '';

          console.log(`--- Processando Pedido ID: ${order.id} | Vendedor do Pedido: ${sellerName} ---`);
          console.log(`   |-> Avatar URL vindo do pedido: '${sellerAvatarFromOrder}'`);


          if (sellerName === 'Danilo Martins') {
            sellerName = 'Fernanda Garcia';
            sellerAvatarFromOrder = 'https://cdn.shopify.com/s/files/1/0661/4574/6991/files/Fernanda_Garcia_Logo.png?v=1750964425';
            console.log(`   |-> REGRA DE NEGÓCIO: Trocando Danilo por Fernanda.`);
          }

          const existingSellerData = salesBySeller.get(sellerName);
          console.log(`   |-> Dados existentes para '${sellerName}':`, existingSellerData);

          const newTotalMeters = (existingSellerData?.total_meters || 0) + orderMeters;

          // Lógica de preservação do avatar com LOG
          let finalAvatar = existingSellerData?.avatar_url;
          if (!finalAvatar && sellerAvatarFromOrder) {
            finalAvatar = sellerAvatarFromOrder;
            console.log(`   |-> Avatar PRESERVADO: '${finalAvatar}' (era vazio, agora usando o do pedido)`);
          } else {
             console.log(`   |-> Avatar PRESERVADO: '${finalAvatar}' (mantendo o que já existia)`);
          }


          salesBySeller.set(sellerName, {
              total_meters: newTotalMeters,
              avatar_url: finalAvatar || '' // Garante que não seja undefined
          });
          console.log(`   |-> DADOS FINAIS para '${sellerName}':`, salesBySeller.get(sellerName));
          console.log('----------------------------------------------------');


          // ... (restante da lógica)
          salesByCustomer.set(order.customer_name, (salesByCustomer.get(order.customer_name) || 0) + orderMeters);
          const region = NORDESTE_SELLERS.includes(sellerName) ? 'Nordeste' : 'Sudoeste';
          salesByRegionCalc[region] += orderMeters;
          const orderDate = parseISO(order.created_at);
          if (!customerFirstOrder.has(order.customer_name) || orderDate < customerFirstOrder.get(order.customer_name)!) {
              customerFirstOrder.set(order.customer_name, orderDate);
          }
        }
        console.log('CRM_DEBUG: 3. PROCESSAMENTO DE PEDIDOS FINALIZADO.');

        // ... (cálculo de kpis)
        const new_customers = Array.from(customerFirstOrder.values()).filter(date =>
            date >= parseISO(this.filters.startDate) && date <= parseISO(this.filters.endDate)
        ).length;
        this.overview.kpis = {
          total_revenue: total_revenue,
          total_orders: orders.length,
          new_customers: new_customers,
          avg_ticket: orders.length > 0 ? total_revenue / orders.length : 0,
        };

        // FINALIZAÇÃO COM LOGS
        console.log('CRM_DEBUG: 4. MAPA FINAL DE VENDEDORES (salesBySeller):', salesBySeller);

        this.overview.sales_trend = Array.from(salesByDay.entries()).map(([day, total_revenue]) => ({ day, total_revenue })).sort((a,b) => new Date(a.day).getTime() - new Date(b.day).getTime());
        this.overview.top_fabrics = Array.from(salesByFabric.entries()).map(([fabric, total_meters]) => ({ fabric, total_meters })).sort((a,b) => b.total_meters - a.total_meters).slice(0, 5);

        const finalRanking = Array.from(salesBySeller.entries()).map(([name, data]) => ({ name, value: data.total_meters, avatar_url: data.avatar_url })).sort((a,b) => b.value - a.value);
        this.overview.top_sellers_by_meters = finalRanking;

        console.log('CRM_DEBUG: 5. ARRAY FINAL DO RANKING (enviado para o componente):', this.overview.top_sellers_by_meters);

        this.overview.top_customers_by_meters = Array.from(salesByCustomer.entries()).map(([name, value]) => ({ name, value, avatar_url: null })).sort((a,b) => b.value - a.value);
        this.salesByRegion = salesByRegionCalc;

      } catch (error) {
        console.error('CRM_DEBUG: ERRO CRÍTICO NO fetchCrmData:', error);
        this.overview.kpis = null;
      } finally {
        this.loading = false;
        console.log('CRM_DEBUG: Finalizado fetchCrmData.');
      }
    },
  },
});
