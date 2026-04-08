'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Plan, Content, getPlanStats } from '@/types'

type PlanWithContents = Plan & { contents: Pick<Content, 'approval_status'>[] }

// ─── Dialog de confirmação de exclusão ───────────────────────────────────────
function DeleteDialog({
  planName,
  onConfirm,
  onCancel,
  loading,
}: {
  planName: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  // Fecha ao clicar fora
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div
        ref={ref}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col gap-4"
      >
        <div>
          <h3 className="font-bold text-gray-900 text-base">Excluir planejamento?</h3>
          <p className="text-sm text-gray-500 mt-1">
            O planejamento <span className="font-medium text-gray-700">{planName}</span> e todos os
            seus conteúdos serão excluídos permanentemente. Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-60"
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Badge de status ──────────────────────────────────────────────────────────
function PlanStatusBadge({ status }: { status: Plan['status'] }) {
  const map = {
    draft:     { label: 'Rascunho',   cls: 'bg-gray-100 text-gray-500' },
    sent:      { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Finalizado', cls: 'bg-green-100 text-green-700' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}

// ─── Pílulas de contagem ──────────────────────────────────────────────────────
function ApprovalPills({ contents }: { contents: PlanWithContents['contents'] }) {
  const stats = getPlanStats(contents)
  if (stats.total === 0) return null
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {stats.approved > 0 && (
        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
          {stats.approved} aprovado{stats.approved !== 1 ? 's' : ''}
        </span>
      )}
      {stats.rejected > 0 && (
        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
          {stats.rejected} reprovado{stats.rejected !== 1 ? 's' : ''}
        </span>
      )}
      {stats.pending > 0 && (
        <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
          {stats.pending} pendente{stats.pending !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}

// ─── Linha de planejamento ────────────────────────────────────────────────────
function PlanRow({
  plan,
  onCopy,
  copiedId,
  onDeleteRequest,
}: {
  plan: PlanWithContents
  onCopy: (e: React.MouseEvent, token: string, id: string) => void
  copiedId: string | null
  onDeleteRequest: (plan: PlanWithContents) => void
}) {
  const stats    = getPlanStats(plan.contents)
  const pct      = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0
  const isCopied = copiedId === plan.id

  return (
    <div className="flex flex-col gap-2 pl-4 border-l-2 border-gray-100 hover:border-indigo-200 transition-colors group py-1">
      {/* Mês + status + botão excluir */}
      <div className="flex items-center justify-between gap-2">
        <Link href={`/planos/${plan.id}`} className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors truncate">
            {plan.month_reference}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {stats.total} conteúdo{stats.total !== 1 ? 's' : ''}
            {stats.total > 0 && ` · ${pct}% aprovado${pct !== 1 ? 's' : ''}`}
          </p>
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          <PlanStatusBadge status={plan.status} />
          <Link
            href={`/planos/${plan.id}`}
            className="text-gray-300 hover:text-indigo-400 transition-colors text-sm px-1"
          >
            →
          </Link>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(plan) }}
            className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"
            title="Excluir planejamento"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Barra de progresso */}
      {stats.total > 0 && (
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden flex">
          <div
            className="bg-green-400 transition-all duration-500"
            style={{ width: `${(stats.approved / stats.total) * 100}%` }}
          />
          <div
            className="bg-red-400 transition-all duration-500"
            style={{ width: `${(stats.rejected / stats.total) * 100}%` }}
          />
        </div>
      )}

      {/* Pílulas */}
      <ApprovalPills contents={plan.contents} />

      {/* Link de aprovação */}
      {plan.status !== 'draft' && (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-gray-300 flex-1 truncate font-mono">
            /aprovar/{plan.share_token}
          </span>
          <button
            onClick={(e) => onCopy(e, plan.share_token, plan.id)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
              isCopied
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-700'
            }`}
          >
            {isCopied ? 'Copiado' : 'Copiar link'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Grupo de cliente ─────────────────────────────────────────────────────────
function ClientGroup({
  clientName,
  plans,
  onCopy,
  copiedId,
  onDeleteRequest,
}: {
  clientName: string
  plans: PlanWithContents[]
  onCopy: (e: React.MouseEvent, token: string, id: string) => void
  copiedId: string | null
  onDeleteRequest: (plan: PlanWithContents) => void
}) {
  const sorted      = [...plans].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const allContents = plans.flatMap((p) => p.contents)
  const globalStats = getPlanStats(allContents)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900">{clientName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {plans.length} planejamento{plans.length !== 1 ? 's' : ''}
              {globalStats.total > 0 &&
                ` · ${globalStats.total} conteúdo${globalStats.total !== 1 ? 's' : ''}`}
            </p>
          </div>
          {globalStats.total > 0 && (
            <div className="flex gap-3 text-xs shrink-0 items-center">
              {globalStats.approved > 0 && (
                <span className="text-green-600 font-semibold">{globalStats.approved} aprov.</span>
              )}
              {globalStats.rejected > 0 && (
                <span className="text-red-500 font-semibold">{globalStats.rejected} reprov.</span>
              )}
              {globalStats.pending > 0 && (
                <span className="text-gray-400">{globalStats.pending} pend.</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="px-5 py-4 flex flex-col gap-5">
        {sorted.map((plan) => (
          <PlanRow
            key={plan.id}
            plan={plan}
            onCopy={onCopy}
            copiedId={copiedId}
            onDeleteRequest={onDeleteRequest}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function HomePage() {
  const [plans, setPlans]       = useState<PlanWithContents[]>([])
  const [loading, setLoading]   = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Estado do dialog de exclusão
  const [deleteTarget, setDeleteTarget] = useState<PlanWithContents | null>(null)
  const [deleting, setDeleting]         = useState(false)

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data) => {
        setPlans(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleCopy = (e: React.MouseEvent, token: string, id: string) => {
    e.preventDefault()
    navigator.clipboard.writeText(`${window.location.origin}/aprovar/${token}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/plans/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    } catch {
      // silencioso — mantém o dialog aberto para nova tentativa
    } finally {
      setDeleting(false)
    }
  }

  // Agrupa por cliente, ordena pelo planejamento mais recente
  const grouped = plans.reduce<Record<string, PlanWithContents[]>>((acc, plan) => {
    const key = plan.client_name
    if (!acc[key]) acc[key] = []
    acc[key].push(plan)
    return acc
  }, {})

  const sortedClients = Object.entries(grouped).sort(([, a], [, b]) => {
    const latestA = Math.max(...a.map((p) => new Date(p.created_at).getTime()))
    const latestB = Math.max(...b.map((p) => new Date(p.created_at).getTime()))
    return latestB - latestA
  })

  return (
    <>
      {/* Dialog de confirmação de exclusão */}
      {deleteTarget && (
        <DeleteDialog
          planName={`${deleteTarget.client_name} — ${deleteTarget.month_reference}`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleting && setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      <main className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Aprovações</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {sortedClients.length > 0
                  ? `${sortedClients.length} cliente${sortedClients.length !== 1 ? 's' : ''} · ${plans.length} planejamento${plans.length !== 1 ? 's' : ''}`
                  : 'Gerencie os planejamentos dos seus clientes'}
              </p>
            </div>
            <Link
              href="/criar"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              + Novo
            </Link>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
          {loading ? (
            <>
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/4 mb-4" />
                  <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-2/3" />
                </div>
              ))}
            </>
          ) : sortedClients.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-gray-400 text-sm">Nenhum planejamento criado ainda.</p>
              <Link
                href="/criar"
                className="inline-block mt-4 text-indigo-600 text-sm font-medium hover:underline"
              >
                Criar primeiro planejamento
              </Link>
            </div>
          ) : (
            sortedClients.map(([clientName, clientPlans]) => (
              <ClientGroup
                key={clientName}
                clientName={clientName}
                plans={clientPlans}
                onCopy={handleCopy}
                copiedId={copiedId}
                onDeleteRequest={setDeleteTarget}
              />
            ))
          )}
        </div>
      </main>
    </>
  )
}
