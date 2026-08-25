import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// POST /api/final-approve/[token]/finalize
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServerClient()

  const { data: review, error: reviewError } = await supabase
    .from('final_reviews')
    .select('id, status, items:final_review_items(approval_status)')
    .eq('share_token', token)
    .single()

  if (reviewError || !review) {
    return NextResponse.json({ error: 'Aprovação não encontrada' }, { status: 404 })
  }

  if (review.status === 'completed') {
    return NextResponse.json({ error: 'Já finalizado' }, { status: 400 })
  }

  // A prévia manual do feed (feed_preview_url/feed_preview_status) é um
  // recurso legado, mantido só por compatibilidade com aprovações antigas
  // — não faz mais parte do fluxo ativo (foi substituída pela Prévia de
  // Feed automática, que é só visual e nunca bloqueia finalização). A
  // finalização depende exclusivamente dos conteúdos individuais.
  const items = review.items as Array<{ approval_status: string }>
  const hasPendingItems = items.some((i) => i.approval_status === 'pending')

  if (hasPendingItems) {
    return NextResponse.json(
      { error: 'Ainda há itens pendentes de revisão' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('final_reviews')
    .update({ status: 'completed' })
    .eq('id', review.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
