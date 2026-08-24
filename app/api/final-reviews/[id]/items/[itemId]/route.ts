import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { sanitizeFeedCoverUrl, resolveStorageFolder } from '@/lib/feed-cover'
import type { ContentType, MediaItem } from '@/types/final'

const EDITABLE_FIELDS = [
  'title', 'social_networks', 'type',
  'caption', 'observations',
  'publish_date', 'publish_time',
  'media_items', 'feed_cover_url',
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

  // Se a capa está sendo alterada, valida contra o type/media_items
  // EFETIVOS (o que vier no próprio PATCH, senão o que já está salvo) e
  // contra a pasta REAL desta review (nunca um valor vindo do corpo da
  // requisição) — nunca grava capa órfã (carrossel) nem de origem
  // externa/outro projeto/bucket/review (vídeo). Ver lib/feed-cover.ts.
  if ('feed_cover_url' in updateData) {
    const { data: current, error: currentError } = await supabase
      .from('final_review_items')
      .select('type, media_items')
      .eq('id', itemId)
      .eq('review_id', id)
      .single()

    if (currentError || !current) {
      return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 })
    }

    const { data: reviewRow } = await supabase
      .from('final_reviews')
      .select('storage_folder')
      .eq('id', id)
      .single()

    const effectiveType       = (updateData.type as ContentType | undefined) ?? current.type
    const effectiveMediaItems = (updateData.media_items as MediaItem[] | undefined) ?? current.media_items ?? []
    const effectiveFolder     = resolveStorageFolder(id, reviewRow?.storage_folder ?? null)

    updateData.feed_cover_url = sanitizeFeedCoverUrl(
      effectiveType,
      effectiveMediaItems,
      updateData.feed_cover_url as string | null,
      effectiveFolder
    )
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
