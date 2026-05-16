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
    .order('created_at', { referencedTable: 'contents', ascending: true })
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 })
  }

  // Ordena os conteúdos por order_position se a coluna existir, com fallback para created_at
  if (Array.isArray(plan?.contents)) {
    plan.contents = plan.contents.sort((a: { order_position?: number; created_at: string }, b: { order_position?: number; created_at: string }) => {
      const aPos = a.order_position ?? Infinity
      const bPos = b.order_position ?? Infinity
      if (aPos !== bPos) return aPos - bPos
      return a.created_at.localeCompare(b.created_at)
    })
  }

  return NextResponse.json(plan)
}

// DELETE /api/plans/[id] — Remove um plano e seus conteúdos (cascade no banco)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  // Verifica se o plano existe antes de deletar
  const { data: plan, error: fetchError } = await supabase
    .from('plans')
    .select('id')
    .eq('id', id)
    .single()

  if (fetchError || !plan) {
    return NextResponse.json({ error: 'Planejamento não encontrado' }, { status: 404 })
  }

  // O ON DELETE CASCADE no banco já remove os conteúdos relacionados automaticamente
  const { error } = await supabase.from('plans').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
