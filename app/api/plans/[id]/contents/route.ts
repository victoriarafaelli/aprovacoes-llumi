import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { ContentFormData } from '@/types'

/**
 * POST /api/plans/[id]/contents
 *
 * Adiciona um novo conteúdo a um planejamento já existente (link já
 * gerado). Preserva share_token, URL e status dos conteúdos antigos.
 *
 * O novo conteúdo sempre entra como approval_status='pending'. Se o
 * planejamento já estava 'completed', adicionar conteúdo exige reabri-lo
 * (status volta para 'sent') — o guard de finalize (que lê approval_status
 * ao vivo) passa a bloquear a finalização de novo até o cliente revisar o
 * item novo.
 *
 * Essa reabertura NUNCA é silenciosa: requer `confirm_reopen: true` no
 * corpo da requisição. Sem essa confirmação explícita, a rota devolve 409
 * sem inserir nada e sem tocar no status — o admin decide conscientemente
 * reabrir uma aprovação já finalizada, não é um efeito colateral automático
 * de adicionar conteúdo.
 *
 * A troca de status acontece ANTES do insert: não há PATCH de status para
 * plans, então se o insert falhasse depois de reabrir, o pior caso é um
 * plano reaberto sem conteúdo novo (inofensivo, repetível). Na ordem
 * inversa, um insert bem-sucedido com a troca de status falhando deixaria
 * um conteúdo pending preso atrás de uma página travada em isReadOnly, sem
 * via de correção manual.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  const body = await request.json()
  const { confirm_reopen, ...rest } = body as ContentFormData & { confirm_reopen?: boolean }
  const content = rest

  if (!content?.title?.trim()) {
    return NextResponse.json({ error: 'Campo obrigatório: title' }, { status: 400 })
  }
  if (!content?.type) {
    return NextResponse.json({ error: 'Campo obrigatório: type' }, { status: 400 })
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, status')
    .eq('id', id)
    .single()

  if (planError || !plan) {
    return NextResponse.json({ error: 'Planejamento não encontrado' }, { status: 404 })
  }

  if (plan.status === 'completed' && !confirm_reopen) {
    return NextResponse.json(
      {
        error: 'reopen_required',
        message:
          'Este planejamento já foi finalizado. Adicionar um novo conteúdo vai reabri-lo ' +
          '(volta para "Aguardando") até o cliente revisar o item novo.',
      },
      { status: 409 }
    )
  }

  let planStatus = plan.status
  if (plan.status === 'completed') {
    const { data: updatedPlan, error: statusError } = await supabase
      .from('plans')
      .update({ status: 'sent' })
      .eq('id', id)
      .select('status')
      .single()

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 })
    }
    planStatus = updatedPlan.status
  }

  const { data: existing, error: existingError } = await supabase
    .from('contents')
    .select('order_position')
    .eq('plan_id', id)

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  const nextPosition = existing.length
    ? Math.max(...existing.map((c) => c.order_position)) + 1
    : 0

  const { data: inserted, error: insertError } = await supabase
    .from('contents')
    .insert({
      plan_id:         id,
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
      order_position:  nextPosition,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ content: inserted, plan_status: planStatus }, { status: 201 })
}
