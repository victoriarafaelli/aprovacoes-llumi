import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// GET /api/plans/[id] — Retorna um plano com seus conteúdos
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  const { data: plan, error } = await supabase
    .from('plans')
    .select('*, contents(*)')
    .eq('id', id)
    .order('order_position', { referencedTable: 'contents', ascending: true })
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  return NextResponse.json(plan)
}
