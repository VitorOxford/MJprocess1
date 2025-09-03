// supabase/functions/generate-finance-token/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Função principal que será executada quando a function for chamada
serve(async (req) => {
  // O browser primeiro envia uma requisição OPTIONS para verificar o CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Inicializa o cliente Supabase com a chave de administrador para verificar o usuário
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 2. Pega o token de autenticação do usuário que está fazendo a chamada
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("Header de autorização ausente.")
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      throw new Error("Usuário não autenticado. O token pode ser inválido ou expirado.");
    }

    // 3. Busca o perfil do usuário para verificar a permissão (role)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error(`Perfil do usuário não encontrado: ${profileError?.message}`);
    }

    // 4. VERIFICAÇÃO DE SEGURANÇA: Apenas administradores podem gerar este token
    if (profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403 // Forbidden
      })
    }

    // 5. Pega a chave secreta para assinar o novo token (deve ser configurada no Supabase)
    const jwtSecret = Deno.env.get('FINANCE_JWT_SECRET')
    if (!jwtSecret) {
      throw new Error('A variável de ambiente FINANCE_JWT_SECRET não está configurada no Supabase.');
    }

    // Converte a chave secreta para o formato que a biblioteca de JWT espera
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign", "verify"]
    );

    // 6. Define o que vai dentro do novo token (payload)
    const payload = {
      sub: user.id, // ID do usuário
      role: profile.role, // Permissão do usuário
      iat: getNumericDate(new Date()), // Data de criação
      exp: getNumericDate(new Date(Date.now() + 5 * 60 * 1000)), // Expira em 5 minutos
    };

    // 7. Cria o novo token JWT
    const jwt = await create({ alg: 'HS512', typ: 'JWT' }, payload, key);

    // 8. Retorna o token com sucesso
    return new Response(JSON.stringify({ token: jwt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // Se qualquer passo acima falhar, retorna um erro claro
    console.error('Erro na função generate-finance-token:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Internal Server Error
    })
  }
})
