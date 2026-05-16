import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { deleteStorageFolder } from '@/lib/supabase-storage'

// GET /api/final-reviews/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  // Ordena pelo order_position quando disponível, com fallback para created_at.
  // Usamos created_at no ORDER BY do Supabase (coluna sempre presente) e
  // fazemos sort final por order_position no próprio JSON antes de retornar —
  // assim o endpoint não quebra em bancos onde order_position ainda não existe.
  const { data, error } = await supabase
    .from('final_reviews')
    .select('*, items:final_review_items(*)')
    .eq('id', id)
    .order('created_at', { referencedTable: 'final_review_items', ascending: true })
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  // Ordena os itens por order_position se a coluna existir, mantém created_at como fallback
  if (Array.isArray(data?.items)) {
    data.items = data.items.sort((a: { order_position?: number; created_at: string }, b: { order_position?: number; created_at: string }) => {
      const aPos = a.order_position ?? Infinity
      const bPos = b.order_position ?? Infinity
      if (aPos !== bPos) return aPos - bPos
      return a.created_at.localeCompare(b.created_at)
    })
  }

  return NextResponse.json(data)
}

// PATCH /api/final-reviews/[id] — atualiza status (ex: draft → sent)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()
  const body = await request.json()
  const { status } = body as { status?: string }

  if (!status || !['draft', 'sent', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('final_reviews')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/final-reviews/[id]
// Remove a review do banco E os arquivos do Supabase Storage
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServerClient()

  // Busca a review para obter o storage_folder antes de excluir
  const { data, error: fetchError } = await supabase
    .from('final_reviews')
    .select('id, storage_folder')
    .eq('id', id)
    .single()

  if (fetchError || !data) {
    return NextResponse.json({ error: 'Aprovação não encontrada' }, { status: 404 })
  }

  // Remove arquivos do Storage (não bloqueia mesmo se falhar)
  if (data.storage_folder) {
    await deleteStorageFolder(data.storage_folder)
  }

  // Remove do banco (ON DELETE CASCADE remove os itens automaticamente)
  const { error } = await supabase.from('final_reviews').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
