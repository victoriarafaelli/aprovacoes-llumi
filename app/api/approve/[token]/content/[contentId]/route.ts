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
  const { approval_status, client_feedback } = body as {
    approval_status?: ApprovalStatus
    client_feedback?: string
  }

  if (
    approval_status !== undefined &&
    !['approved', 'rejected', 'pending'].includes(approval_status)
  ) {
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

  // Monta objeto de atualização (status e/ou feedback)
  const updateData: Record<string, unknown> = {}
  if (approval_status !== undefined) updateData.approval_status = approval_status
  if (client_feedback !== undefined) updateData.client_feedback = client_feedback || null

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  // Atualiza o status e/ou feedback do conteúdo
  const { data, error } = await supabase
    .from('contents')
    .update(updateData)
    .eq('id', contentId)
    .eq('plan_id', plan.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
