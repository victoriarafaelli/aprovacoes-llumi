import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { v4 as uuidv4 } from 'uuid'
import { FinalReviewItemFormData } from '@/types/final'

// GET /api/final-reviews — Lista todas as aprovações finais
export async function GET() {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('final_reviews')
    .select('*, items:final_review_items(approval_status)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/final-reviews — Cria nova aprovação final com seus itens
export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const body = await request.json()
  const { client_name, month_reference, storage_folder, feed_preview_url, items } = body as {
    client_name: string
    month_reference: string
    storage_folder: string        // pasta no Supabase Storage (upload session id)
    feed_preview_url?: string | null
    items: FinalReviewItemFormData[]
  }

  if (!client_name || !month_reference || !items?.length) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: client_name, month_reference, items' },
      { status: 400 }
    )
  }

  // Valida storage_folder (32 hex chars — UUID sem traços)
  if (storage_folder && !/^[a-f0-9]{32}$/i.test(storage_folder)) {
    return NextResponse.json({ error: 'storage_folder inválido.' }, { status: 400 })
  }

  const share_token = uuidv4().replace(/-/g, '').slice(0, 20)

  const { data: review, error: reviewError } = await supabase
    .from('final_reviews')
    .insert({
      client_name,
      month_reference,
      share_token,
      storage_folder: storage_folder || null,
      feed_preview_url:      feed_preview_url || null,
      feed_preview_status:   'pending',
      feed_preview_feedback: null,
      status: 'sent',
    })
    .select()
    .single()

  if (reviewError) return NextResponse.json({ error: reviewError.message }, { status: 500 })

  const itemsToInsert = items.map((item, index) => ({
    review_id:       review.id,
    title:           item.title,
    social_networks: item.social_networks,
    type:            item.type,
    caption:         item.caption      || null,
    observations:    item.observations || null,
    publish_date:    item.publish_date || null,
    publish_time:    item.publish_time || null,
    // Filtra slots sem URL (usuário não fez upload naquele slide)
    media_items:     item.media_items.filter((m) => m.url.trim()),
    approval_status: 'pending' as const,
    client_feedback: null,
    order_position:  index,
  }))

  const { error: itemsError } = await supabase
    .from('final_review_items')
    .insert(itemsToInsert)

  if (itemsError) {
    // Rollback: remove a review se falhou ao inserir itens
    await supabase.from('final_reviews').delete().eq('id', review.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ review, share_token }, { status: 201 })
}
