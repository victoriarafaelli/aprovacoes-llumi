import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const EDITABLE_FIELDS = [
  'title', 'type', 'social_networks',
  'copy_text', 'video_script', 'observations',
  'publish_date', 'publish_time', 'reference_url',
] as const

/**
 * PATCH /api/plans/[id]/contents/[contentId]
 *
 * Atualiza campos de texto de um conteúdo específico (visão do gerente).
 * Permite edição após o link já ter sido gerado.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contentId: string }> }
) {
  const { id, contentId } = await params
  const supabase = createServerClient()

  const body = await request.json()

  // Filtra apenas campos permitidos para atualização
  const updateData = Object.fromEntries(
    Object.entries(body).filter(([key]) => (EDITABLE_FIELDS as readonly string[]).includes(key))
  )

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo editável fornecido.' }, { status: 400 })
  }

  // Garante que o conteúdo pertence ao plano correto
  const { data, error } = await supabase
    .from('contents')
    .update(updateData)
    .eq('id', contentId)
    .eq('plan_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data)  return NextResponse.json({ error: 'Conteúdo não encontrado.' }, { status: 404 })

  return NextResponse.json(data)
}
