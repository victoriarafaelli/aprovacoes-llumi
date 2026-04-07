import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { ApprovalStatus } from '@/types'

// PATCH /api/approve/[token]/content/[contentId]
// Atualiza o status de aprovação de um conteúdo individualmente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string; contentId: string }> }
) {
  const { token, contentId } = await params
  const supabase = createServerClient()

  const body = await request.json()
  const { approval_status } = body as { approval_status: ApprovalStatus }

  if (!['approved', 'rejected', 'pending'].includes(approval_status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  // Verifica se o plano existe, pertence ao token e não está finalizado
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, status')
    .eq('share_token', token)
    .single()

  if (planError || !plan) {
    return NextResponse.json({ error: 'Planejamento não encontrado' }, { status: 404 })
  }

  if (plan.status === 'completed') {
    return NextResponse.json(
      { error: 'Aprovação já finalizada — não é possível alterar' },
      { status: 403 }
    )
  }

  // Atualiza o status do conteúdo
  const { data, error } = await supabase
    .from('contents')
    .update({ approval_status })
    .eq('id', contentId)
    .eq('plan_id', plan.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
