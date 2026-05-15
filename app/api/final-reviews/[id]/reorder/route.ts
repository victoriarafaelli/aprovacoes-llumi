import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/final-reviews/[id]/reorder
 *
 * Reordena os itens de uma aprovação final.
 * Body: { order: string[] } — array de IDs de item na nova ordem desejada.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  const body = await request.json()
  const { order } = body as { order: string[] }

  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json({ error: 'order deve ser um array de IDs.' }, { status: 400 })
  }

  // Verifica que todos os IDs pertencem a esta review
  const { data: existing, error: fetchError } = await supabase
    .from('final_review_items')
    .select('id')
    .eq('review_id', id)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const existingIds = new Set((existing ?? []).map((i) => i.id))
  if (!order.every((iid) => existingIds.has(iid))) {
    return NextResponse.json(
      { error: 'Um ou mais IDs não pertencem a esta aprovação.' },
      { status: 400 }
    )
  }

  // Atualiza order_position de cada item em paralelo
  const updates = await Promise.all(
    order.map((itemId, index) =>
      supabase
        .from('final_review_items')
        .update({ order_position: index })
        .eq('id', itemId)
        .eq('review_id', id)
    )
  )

  const firstError = updates.find((u) => u.error)
  if (firstError?.error) {
    return NextResponse.json({ error: firstError.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
