import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { ApprovalStatus } from '@/types/final'

/**
 * PATCH /api/final-approve/[token]/feed-preview
 *
 * Atualiza o status de aprovação e/ou comentário do cliente para a prévia do feed.
 * Body: { feed_preview_status?: ApprovalStatus, feed_preview_feedback?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServerClient()

  const body = await request.json()
  const { feed_preview_status, feed_preview_feedback } = body as {
    feed_preview_status?: ApprovalStatus
    feed_preview_feedback?: string
  }

  if (
    feed_preview_status !== undefined &&
    !['approved', 'rejected', 'pending'].includes(feed_preview_status)
  ) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  // Verifica se a review existe, não está finalizada e tem prévia de feed
  const { data: review, error: reviewError } = await supabase
    .from('final_reviews')
    .select('id, status, feed_preview_url')
    .eq('share_token', token)
    .single()

  if (reviewError || !review) {
    return NextResponse.json({ error: 'Aprovação não encontrada' }, { status: 404 })
  }

  if (review.status === 'completed') {
    return NextResponse.json({ error: 'Aprovação já finalizada' }, { status: 403 })
  }

  if (!review.feed_preview_url) {
    return NextResponse.json({ error: 'Esta aprovação não possui prévia do feed' }, { status: 400 })
  }

  // Monta o objeto de atualização
  const updateData: Record<string, unknown> = {}
  if (feed_preview_status  !== undefined) updateData.feed_preview_status   = feed_preview_status
  if (feed_preview_feedback !== undefined) updateData.feed_preview_feedback = feed_preview_feedback || null

  const { data, error } = await supabase
    .from('final_reviews')
    .update(updateData)
    .eq('id', review.id)
    .select('feed_preview_status, feed_preview_feedback')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
