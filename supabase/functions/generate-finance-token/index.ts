// supabase/functions/generate-finance-token/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { create, getNumericDate } from 'https://deno.land/x/djwt@v2.8/mod.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

    if (!user) {
      throw new Error("Usuário não autenticado.");
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error("Perfil do usuário não encontrado.");
    }

    // A VERIFICAÇÃO MAIS IMPORTANTE: Apenas admins podem gerar este token.
    if (profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Acesso não autorizado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      })
    }

    const sharedSecret = Deno.env.get('FINANCE_JWT_SECRET')! // Use uma nova variável de ambiente
    const key = await crypto.subtle.generateKey(
        { name: 'HMAC', hash: 'SHA-512' },
        true,
        ['sign', 'verify'],
    );

    const payload = {
      sub: user.id,
      role: profile.role,
      iat: getNumericDate(new Date()),
      exp: getNumericDate(new Date(Date.now() + 5 * 60 * 1000)), // Expira em 5 minutos
    };

    const jwt = await create({ alg: 'HS512', typ: 'JWT' }, payload, key);

    return new Response(JSON.stringify({ token: jwt }), {
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
