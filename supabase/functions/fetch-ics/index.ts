import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    
    if (!url) {
      console.error('❌ URL do calendário não fornecida')
      return new Response(
        JSON.stringify({ error: 'URL do calendário é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('📅 Buscando calendário ICS de:', url)
    
    // Fazer fetch do .ics (sem CORS porque está no servidor)
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`❌ Erro HTTP ${response.status}: ${response.statusText}`)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const icsText = await response.text()
    
    console.log('✅ Calendário ICS obtido com sucesso, tamanho:', icsText.length, 'caracteres')
    
    return new Response(
      JSON.stringify({ icsText }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro ao buscar calendário:', errorMessage)
    
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao buscar calendário',
        details: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
