import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { ApprovalStatus } from '@/types/final'

// PATCH /api/final-approve/[token]/item/[itemId]
// Atualiza status de aprovação e/ou feedback do cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; itemId: string }> }
) {
  const { token, itemId } = await params
  const supabase = createServerClient()

  const body = await request.json()
  const { approval_status, client_feedback } = body as {
    approval_status?: ApprovalStatus
    client_feedback?: string
  }

  if (
    approval_status !== undefined &&
    !['approved', 'rejected', 'pending'].includes(approval_status)
  ) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  // Verifica se a review existe e não está finalizada
  const { data: review, error: reviewError } = await supabase
    .from('final_reviews')
    .select('id, status')
    .eq('share_token', token)
    .single()

  if (reviewError || !review) {
    return NextResponse.json({ error: 'Aprovação não encontrada' }, { status: 404 })
  }

  if (review.status === 'completed') {
    return NextResponse.json(
      { error: 'Aprovação já finalizada' },
      { status: 403 }
    )
  }

  // Monta o objeto de atualização
  const updateData: Record<string, unknown> = {}
  if (approval_status !== undefined) updateData.approval_status = approval_status
  if (client_feedback !== undefined)  updateData.client_feedback = client_feedback || null

  const { data, error } = await supabase
    .from('final_review_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('review_id', review.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
