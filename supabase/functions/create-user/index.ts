import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, full_name, role, allowed_regions } = await req.json()

    if (!email || !password || !full_name || !role) {
      throw new Error("Dados insuficientes para criar o usuário.");
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Cria o usuário na autenticação (isso vai disparar o gatilho que cria o perfil básico)
    const { data: { user }, error: authError } = await adminClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    })

    if (authError) throw authError
    if (!user) throw new Error("Não foi possível obter o objeto do novo usuário.");

    // --- CORREÇÃO PRINCIPAL AQUI ---
    // 2. Em vez de INSERIR, vamos ATUALIZAR o perfil que o gatilho acabou de criar
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        full_name: full_name,
        role: role,
        allowed_regions: allowed_regions,
      })
      .eq('id', user.id); // A condição é encontrar o perfil com o ID do usuário recém-criado

    if (profileError) {
      // Se a atualização falhar, faz o rollback
      await adminClient.auth.admin.deleteUser(user.id);
      throw profileError;
    }

    return new Response(JSON.stringify({
        id: user.id,
        message: 'Usuário criado com sucesso!'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
