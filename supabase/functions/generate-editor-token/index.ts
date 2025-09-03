// supabase/functions/generate-editor-token/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Log a chamada inicial
  console.log(`Função generate-editor-token chamada com método: ${req.method}`);
  console.log('Headers da requisição:', Object.fromEntries(req.headers));

  // Trata a requisição OPTIONS (necessário para CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Cria um cliente do Supabase com poderes de administrador para verificar o usuário.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Pega o token de autenticação do usuário que está fazendo a chamada.
    const authHeader = req.headers.get('Authorization')!
    console.log('Authorization Header recebido:', authHeader); // Log do header de autorização

    if (!authHeader) {
        throw new Error("Header de autorização não encontrado.");
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    console.log('Usuário autenticado:', user); // Log do objeto do usuário

    if (!user) {
      throw new Error("Usuário não autenticado. O token pode ser inválido ou expirado.");
    }

    // Busca o perfil do usuário para verificar sua função (role).
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('Perfil do usuário encontrado:', profile); // Log do perfil

    if (profileError || !profile) {
      throw new Error(`Perfil do usuário não encontrado. Erro: ${profileError?.message}`);
    }

    // A VERIFICAÇÃO MAIS IMPORTANTE: Garante que apenas vendedores possam prosseguir.
    if (profile.role !== 'vendedor') {
      console.warn(`Tentativa de acesso não autorizada. Usuário ${user.id} com role '${profile.role}' tentou gerar token de editor.`);
      return new Response(JSON.stringify({ error: 'Acesso não autorizado para esta função.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    // Pega a chave secreta para assinar o novo token.
    const sharedSecret = Deno.env.get('EDITOR_JWT_SECRET')!
     if (!sharedSecret) {
        throw new Error("A variável de ambiente EDITOR_JWT_SECRET não está configurada.");
    }

    const key = await crypto.subtle.generateKey(
        { name: 'HMAC', hash: 'SHA-512' },
        true,
        ['sign', 'verify'],
    );

    // Gera o token JWT customizado com as informações necessárias (payload).
    const payload = {
      sub: user.id, // ID do usuário
      role: profile.role,
      iat: getNumericDate(new Date()), // Data de criação
      exp: getNumericDate(new Date(Date.now() + 5 * 60 * 1000)), // Expira em 5 minutos
    };

    const jwt = await create({ alg: 'HS512', typ: 'JWT' }, payload, key);
    console.log('Token gerado com sucesso para o usuário:', user.id);

    return new Response(JSON.stringify({ token: jwt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Log detalhado do erro no servidor
    console.error('Erro na função generate-editor-token:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
