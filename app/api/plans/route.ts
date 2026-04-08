import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { v4 as uuidv4 } from 'uuid'
import { ContentFormData } from '@/types'

// GET /api/plans — Lista todos os planejamentos com status de aprovação dos conteúdos
export async function GET() {
  const supabase = createServerClient()

  const { data: plans, error } = await supabase
    .from('plans')
    .select('*, contents(approval_status)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(plans)
}

// POST /api/plans — Cria um novo planejamento com seus conteúdos
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const body = await request.json()
  const { client_name, month_reference, contents } = body as {
    client_name: string
    month_reference: string
    contents: ContentFormData[]
  }

  if (!client_name || !month_reference || !contents?.length) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: client_name, month_reference, contents' },
      { status: 400 }
    )
  }

  // Gera token único para a URL de aprovação
  const share_token = uuidv4().replace(/-/g, '').slice(0, 20)

  // Cria o plano (já com status "sent" — link gerado)
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({ client_name, month_reference, share_token, status: 'sent' })
    .select()
    .single()

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 })
  }

  // Cria os conteúdos vinculados ao plano
  const contentsToInsert = contents.map((content, index) => ({
    plan_id:         plan.id,
    title:           content.title,
    social_networks: content.social_networks,
    type:            content.type,
    copy_text:       content.copy_text    || null,
    video_script:    content.video_script || null,
    observations:    content.observations || null,
    publish_date:    content.publish_date || null,
    publish_time:    content.publish_time || null,
    reference_url:   content.reference_url || null,
    approval_status: 'pending' as const,
    order_position:  index,
  }))

  const { error: contentsError } = await supabase
    .from('contents')
    .insert(contentsToInsert)

  if (contentsError) {
    // Rollback: remove o plano se falhou ao inserir conteúdos
    await supabase.from('plans').delete().eq('id', plan.id)
    return NextResponse.json({ error: contentsError.message }, { status: 500 })
  }

  return NextResponse.json({ plan, share_token }, { status: 201 })
}
