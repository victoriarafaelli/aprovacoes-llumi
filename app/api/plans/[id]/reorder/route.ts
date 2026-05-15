import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

/**
 * POST /api/plans/[id]/reorder
 *
 * Reordena os conteúdos de um planejamento.
 * Body: { order: string[] } — array de IDs de conteúdo na nova ordem desejada.
 * Cada conteúdo recebe order_position = índice no array.
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

  // Verifica que todos os IDs pertencem a este plano
  const { data: existing, error: fetchError } = await supabase
    .from('contents')
    .select('id')
    .eq('plan_id', id)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const existingIds = new Set((existing ?? []).map((c) => c.id))
  if (!order.every((cid) => existingIds.has(cid))) {
    return NextResponse.json(
      { error: 'Um ou mais IDs não pertencem a este planejamento.' },
      { status: 400 }
    )
  }

  // Atualiza order_position de cada conteúdo em paralelo
  const updates = await Promise.all(
    order.map((contentId, index) =>
      supabase
        .from('contents')
        .update({ order_position: index })
        .eq('id', contentId)
        .eq('plan_id', id)
    )
  )

  const firstError = updates.find((u) => u.error)
  if (firstError?.error) {
    return NextResponse.json({ error: firstError.error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
