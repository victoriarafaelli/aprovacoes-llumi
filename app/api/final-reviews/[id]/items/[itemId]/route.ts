import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const EDITABLE_FIELDS = [
  'title', 'social_networks', 'type',
  'caption', 'observations',
  'publish_date', 'publish_time',
  'media_items',
] as const

/**
 * PATCH /api/final-reviews/[id]/items/[itemId]
 *
 * Atualiza campos de um item de aprovação final (visão do gerente).
 * Permite edição após o link já ter sido gerado.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params
  const supabase = createServerClient()

  const body = await request.json()

  // Filtra apenas campos permitidos
  const updateData = Object.fromEntries(
    Object.entries(body).filter(([key]) => (EDITABLE_FIELDS as readonly string[]).includes(key))
  )

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo editável fornecido.' }, { status: 400 })
  }

  // Garante que o item pertence à review correta
  const { data, error } = await supabase
    .from('final_review_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('review_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 })

  return NextResponse.json(data)
}
