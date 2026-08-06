import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { FinalReviewItemFormData } from '@/types/final'

/**
 * POST /api/final-reviews/[id]/items
 *
 * Adiciona um novo item a uma aprovação final já existente (link já
 * gerado). Preserva share_token, URL e status dos itens antigos.
 *
 * Mesma lógica de app/api/plans/[id]/contents/route.ts: o novo item
 * sempre entra como approval_status='pending'; se a review já estava
 * 'completed', reabri-la (volta para 'sent') exige `confirm_reopen: true`
 * no corpo — sem isso a rota devolve 409 sem inserir nada e sem tocar no
 * status, para o admin confirmar conscientemente que está reabrindo uma
 * aprovação já finalizada. Quando confirmado, a troca acontece ANTES do
 * insert pela mesma razão de segurança (evita item pending preso atrás de
 * uma review ainda travada em completed).
 *
 * Reaproveita o storage_folder já salvo na review para os uploads do novo
 * item (não gera pasta nova). Se a review foi criada sem mídia
 * (storage_folder ainda null) e o item novo já chega com mídia, faz o
 * backfill do storage_folder — sem isso, o delete da review (que só limpa
 * o Storage usando o storage_folder gravado no banco) nunca encontraria
 * esses arquivos.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  const body = await request.json()
  const { confirm_reopen, ...rest } = body as FinalReviewItemFormData & { confirm_reopen?: boolean }
  const item = rest

  if (!item?.title?.trim()) {
    return NextResponse.json({ error: 'Campo obrigatório: title' }, { status: 400 })
  }
  if (!item?.type) {
    return NextResponse.json({ error: 'Campo obrigatório: type' }, { status: 400 })
  }

  const { data: review, error: reviewError } = await supabase
    .from('final_reviews')
    .select('id, status, storage_folder')
    .eq('id', id)
    .single()

  if (reviewError || !review) {
    return NextResponse.json({ error: 'Aprovação não encontrada' }, { status: 404 })
  }

  if (review.status === 'completed' && !confirm_reopen) {
    return NextResponse.json(
      {
        error: 'reopen_required',
        message:
          'Esta aprovação final já foi finalizada. Adicionar um novo conteúdo vai reabri-la ' +
          '(volta para "Aguardando") até o cliente revisar o item novo.',
      },
      { status: 409 }
    )
  }

  let reviewStatus = review.status
  if (review.status === 'completed') {
    const { data: updatedReview, error: statusError } = await supabase
      .from('final_reviews')
      .update({ status: 'sent' })
      .eq('id', id)
      .select('status')
      .single()

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 })
    }
    reviewStatus = updatedReview.status
  }

  const mediaItems = (item.media_items ?? []).filter((m) => m.url.trim())

  if (mediaItems.length > 0 && !review.storage_folder) {
    const { error: folderError } = await supabase
      .from('final_reviews')
      .update({ storage_folder: id.replace(/-/g, '') })
      .eq('id', id)

    if (folderError) {
      return NextResponse.json({ error: folderError.message }, { status: 500 })
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from('final_review_items')
    .select('order_position')
    .eq('review_id', id)

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  const nextPosition = existing.length
    ? Math.max(...existing.map((i) => i.order_position)) + 1
    : 0

  const { data: inserted, error: insertError } = await supabase
    .from('final_review_items')
    .insert({
      review_id:       id,
      title:           item.title,
      social_networks: item.social_networks,
      type:            item.type,
      caption:         item.caption      || null,
      observations:    item.observations || null,
      publish_date:    item.publish_date || null,
      publish_time:    item.publish_time || null,
      media_items:     mediaItems,
      approval_status: 'pending' as const,
      client_feedback: null,
      order_position:  nextPosition,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ item: inserted, review_status: reviewStatus }, { status: 201 })
}
