import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Esta função calcula dias úteis, pulando domingos.
function addBusinessDays(date: Date, days: number): Date {
  const newDate = new Date(date);
  let addedDays = 0;
  const targetDays = Math.abs(days);
  const step = days > 0 ? 1 : -1;

  while (addedDays < targetDays) {
    newDate.setDate(newDate.getDate() + step);
    const dayOfWeek = newDate.getDay(); // Domingo = 0
    if (dayOfWeek !== 0) { // Não conta domingos
      addedDays++;
    }
  }
  return newDate;
}

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const today = new Date().toISOString().split('T')[0];
    let startedCount = 0;

    // --- ETAPA 1: INICIAR PRODUÇÃO ---
    // Pega todos os pedidos com data de produção para hoje ou no passado
    // e que AINDA NÃO estão em produção ou finalizados.
    const { data: ordersToStart, error: findStartError } = await supabase
      .from('orders')
      .select('id')
      .lte('production_date', today) // Data de produção é hoje ou já passou
      .not('status', 'in', '("in_printing", "in_cutting", "completed")'); // E o status NÃO é de produção/finalizado

    if (findStartError) {
      throw new Error(`Erro ao buscar pedidos para iniciar: ${findStartError.message}`);
    }

    if (ordersToStart && ordersToStart.length > 0) {
      startedCount = ordersToStart.length;
      const idsToStart = ordersToStart.map(o => o.id);
      const { error: startError } = await supabase
        .from('orders')
        .update({ status: 'in_printing' })
        .in('id', idsToStart);

      if (startError) {
        throw new Error(`Erro ao iniciar produção: ${startError.message}`);
      }
    }

    // --- ETAPA 2: FINALIZAR PRODUÇÃO ---
    const { data: ordersToCheck, error: findCompleteError } = await supabase
      .from('orders')
      .select('id, production_date')
      .in('status', ['in_printing', 'in_cutting']);

    if (findCompleteError) {
      throw new Error(`Erro ao buscar pedidos para finalizar: ${findCompleteError.message}`);
    }

    const ordersToComplete = ordersToCheck.filter(order => {
        const productionStartDate = new Date(order.production_date);
        const completionDate = addBusinessDays(productionStartDate, 3);
        return new Date() >= completionDate;
    });

    let completedCount = 0;
    if (ordersToComplete.length > 0) {
      completedCount = ordersToComplete.length;
      const idsToComplete = ordersToComplete.map(o => o.id);
      const { error: completeError } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .in('id', idsToComplete);

      if (completeError) {
        throw new Error(`Erro ao finalizar pedidos: ${completeError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ message: `Processo concluído. Pedidos iniciados: ${startedCount}. Pedidos finalizados: ${completedCount}.` }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
