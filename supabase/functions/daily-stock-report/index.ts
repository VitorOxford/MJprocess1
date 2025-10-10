import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Tenta pegar a data do corpo da requisição. Se não houver, assume que é o cron job.
    const payload = await req.json().catch(() => ({}));
    const reportDateParam = payload.report_date;

    const targetDate = reportDateParam ? new Date(reportDateParam + 'T12:00:00Z') : new Date();
    if (!reportDateParam) {
      // Se for cron job, o relatório é do dia anterior.
      targetDate.setDate(targetDate.getDate() - 1);
    }

    const reportDateForDb = targetDate.toISOString().split('T')[0];

    // O período do relatório é das 04:00 do dia alvo até as 03:59:59 do dia seguinte (horário de Brasília, UTC-3)
    const reportStartTime = new Date(targetDate);
    reportStartTime.setUTCHours(7, 0, 0, 0); // 04:00 no horário de Brasília (UTC-3)

    const reportEndTime = new Date(reportStartTime);
    reportEndTime.setDate(reportEndTime.getDate() + 1);

    // --- CÁLCULO PRECISO DO ESTOQUE INICIAL (04:00) ---
    // 1. Pega o estoque atual de todos os produtos
    const { data: currentStockList, error: currentStockError } = await supabase
      .from('stock')
      .select('id, fabric_type, available_meters');
    if (currentStockError) throw new Error(`Erro ao buscar estoque atual: ${currentStockError.message}`);

    // 2. Pega todas as movimentações que ocorreram DESDE o início do período do relatório (04:00)
    const { data: movementsSinceStart, error: recentMovementsError } = await supabase
      .from('stock_movements')
      .select('product_id, quantity_moved')
      .gte('created_at', reportStartTime.toISOString());
    if (recentMovementsError) throw new Error(`Erro ao buscar movimentações recentes: ${recentMovementsError.message}`);

    // 3. Calcula o estoque inicial retroativamente
    const initialStockMap = new Map(currentStockList.map(s => [s.id, s.available_meters]));
    for (const movement of movementsSinceStart) {
      const currentVal = initialStockMap.get(movement.product_id) || 0;
      // Para achar o valor inicial, revertemos a movimentação.
      // Se entrou (+), subtraímos. Se saiu (-), somamos de volta.
      initialStockMap.set(movement.product_id, currentVal - movement.quantity_moved);
    }
    const initialStockForReport = currentStockList.map(s => ({
      fabric_type: s.fabric_type,
      available_meters: initialStockMap.get(s.id) || 0,
    }));

    // --- COLETA DE DADOS PARA O RELATÓRIO ---
    // 1. Busca todas as movimentações do período completo
    const { data: allMovementsForPeriod, error: movementsError } = await supabase
      .from('stock_movements')
      .select('*, product:stock(fabric_type), user:profiles(full_name), item:order_items(order_id, orders(order_number))')
      .gte('created_at', reportStartTime.toISOString())
      .lt('created_at', reportEndTime.toISOString())
      .order('created_at', { ascending: true });
    if (movementsError) throw new Error(`Erro ao buscar movimentações do período: ${movementsError.message}`);

    // 2. O estoque final do relatório é simplesmente o estoque atual
    const finalStockForReport = currentStockList.map(s => ({
        fabric_type: s.fabric_type,
        available_meters: s.available_meters,
    }));

    // 3. Monta o relatório
    const report = {
      report_date: reportDateForDb,
      initial_stock: initialStockForReport,
      final_stock: finalStockForReport,
      movements: allMovementsForPeriod || [],
    };

    // 4. Salva (ou atualiza) o relatório no banco
    const { error: saveError } = await supabase
      .from('daily_stock_reports')
      .upsert(report, { onConflict: 'report_date' });

    if (saveError) throw new Error(`Erro ao salvar relatório: ${saveError.message}`);

    return new Response(
      JSON.stringify({ message: "Relatório gerado/atualizado com sucesso!", report_date: reportDateForDb, movements_found: allMovementsForPeriod?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
