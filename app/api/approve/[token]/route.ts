import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET /api/approve/[token] — Retorna o plano pelo share_token (página do cliente)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServerClient()

  const { data: plan, error } = await supabase
    .from('plans')
    .select('*, contents(*)')
    .eq('share_token', token)
    .order('order_position', { referencedTable: 'contents', ascending: true })
    .single()

  if (error || !plan) {
    return NextResponse.json({ error: 'Planejamento não encontrado' }, { status: 404 })
  }

  // Bloqueia acesso se ainda for draft (link não gerado)
  if (plan.status === 'draft') {
    return NextResponse.json({ error: 'Link ainda não disponível' }, { status: 403 })
  }

  return NextResponse.json(plan)
}
