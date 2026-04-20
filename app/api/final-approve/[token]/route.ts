import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET /api/final-approve/[token] — Retorna a aprovação final pelo token público
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('final_reviews')
    .select('*, items:final_review_items(*)')
    .eq('share_token', token)
    .order('order_position', { referencedTable: 'final_review_items', ascending: true })
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Aprovação não encontrada' }, { status: 404 })
  }

  if (data.status === 'draft') {
    return NextResponse.json({ error: 'Link ainda não disponível' }, { status: 403 })
  }

  return NextResponse.json(data)
}
