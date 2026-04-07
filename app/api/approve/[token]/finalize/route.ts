import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// POST /api/approve/[token]/finalize
// Finaliza a aprovação — muda o status do plano para "completed"
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServerClient()

  // Busca o plano pelo token
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, status, contents(approval_status)')
    .eq('share_token', token)
    .single()

  if (planError || !plan) {
    return NextResponse.json({ error: 'Planejamento não encontrado' }, { status: 404 })
  }

  if (plan.status === 'completed') {
    return NextResponse.json({ error: 'Já finalizado' }, { status: 400 })
  }

  // Garante que todos os conteúdos foram revisados (nenhum "pending")
  const contents = plan.contents as Array<{ approval_status: string }>
  const hasPending = contents.some((c) => c.approval_status === 'pending')

  if (hasPending) {
    return NextResponse.json(
      { error: 'Ainda há conteúdos pendentes de revisão' },
      { status: 400 }
    )
  }

  // Atualiza o plano para "completed"
  const { data, error } = await supabase
    .from('plans')
    .update({ status: 'completed' })
    .eq('id', plan.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
