'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import AppTabs from '@/components/AppTabs'
import { FinalReview, FinalReviewItem, getReviewStats } from '@/types/final'

type ReviewWithItems = FinalReview & { items: Pick<FinalReviewItem, 'approval_status'>[] }

// ─── Dialog de confirmação de exclusão ───────────────────────────────────────
function DeleteDialog({
  name, onConfirm, onCancel, loading,
}: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCancel()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div ref={ref} className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-6 flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-base">Excluir aprovação?</h3>
          <p className="text-sm text-gray-500 mt-1">
            <span className="font-medium text-gray-700">{name}</span> e todos os seus conteúdos
            serão excluídos permanentemente.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-60">
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Badge de status ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: FinalReview['status'] }) {
  const map = {
    draft:     { label: 'Rascunho',   cls: 'bg-gray-100 text-gray-500' },
    sent:      { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Finalizado', cls: 'bg-green-100 text-green-700' },
  }
  const { label, cls } = map[status]
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{label}</span>
}

// ─── Pílulas de contagem ──────────────────────────────────────────────────────
function ApprovalPills({ items }: { items: ReviewWithItems['items'] }) {
  const s = getReviewStats(items)
  if (s.total === 0) return null
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {s.approved > 0 && (
        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
          {s.approved} aprovado{s.approved !== 1 ? 's' : ''}
        </span>
      )}
      {s.rejected > 0 && (
        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
          {s.rejected} reprovado{s.rejected !== 1 ? 's' : ''}
        </span>
      )}
      {s.pending > 0 && (
        <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
          {s.pending} pendente{s.pending !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}

// ─── Linha de aprovação ───────────────────────────────────────────────────────
function ReviewRow({
  review, onCopy, copiedId, onDeleteRequest,
}: {
  review: ReviewWithItems
  onCopy: (e: React.MouseEvent, token: string, id: string) => void
  copiedId: string | null
  onDeleteRequest: (r: ReviewWithItems) => void
}) {
  const s      = getReviewStats(review.items)
  const pct    = s.total > 0 ? Math.round((s.approved / s.total) * 100) : 0
  const copied = copiedId === review.id

  return (
    <div className="flex flex-col gap-2 pl-4 border-l-2 border-gray-100 hover:border-indigo-200 transition-colors group py-1">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/final/${review.id}`} className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors truncate">
            {review.month_reference}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {s.total} conteúdo{s.total !== 1 ? 's' : ''}
            {s.total > 0 && ` · ${pct}% aprovado${pct !== 1 ? 's' : ''}`}
          </p>
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={review.status} />
          <Link href={`/final/${review.id}`}
            className="text-gray-300 hover:text-indigo-400 transition-colors text-sm px-1">→</Link>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(review) }}
            className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"
            title="Excluir aprovação">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {s.total > 0 && (
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden flex">
          <div className="bg-green-400 transition-all duration-500"
            style={{ width: `${(s.approved / s.total) * 100}%` }} />
          <div className="bg-red-400 transition-all duration-500"
            style={{ width: `${(s.rejected / s.total) * 100}%` }} />
        </div>
      )}

      <ApprovalPills items={review.items} />

      {review.status !== 'draft' && (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-gray-300 flex-1 truncate font-mono">
            /final/aprovar/{review.share_token}
          </span>
          <button
            onClick={(e) => onCopy(e, review.share_token, review.id)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
              copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-700'
            }`}>
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Grupo de cliente ─────────────────────────────────────────────────────────
function ClientGroup({
  clientName, reviews, onCopy, copiedId, onDeleteRequest,
}: {
  clientName: string
  reviews: ReviewWithItems[]
  onCopy: (e: React.MouseEvent, token: string, id: string) => void
  copiedId: string | null
  onDeleteRequest: (r: ReviewWithItems) => void
}) {
  const sorted      = [...reviews].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const allItems    = reviews.flatMap((r) => r.items)
  const globalStats = getReviewStats(allItems)

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900">{clientName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {reviews.length} aprovação{reviews.length !== 1 ? 'ões' : ''}
              {globalStats.total > 0 && ` · ${globalStats.total} conteúdo${globalStats.total !== 1 ? 's' : ''}`}
            </p>
          </div>
          {globalStats.total > 0 && (
            <div className="flex gap-3 text-xs shrink-0 items-center">
              {globalStats.approved > 0 && <span className="text-green-600 font-semibold">{globalStats.approved} aprov.</span>}
              {globalStats.rejected > 0 && <span className="text-red-500 font-semibold">{globalStats.rejected} reprov.</span>}
              {globalStats.pending > 0  && <span className="text-gray-400">{globalStats.pending} pend.</span>}
            </div>
          )}
        </div>
      </div>
      <div className="px-5 py-4 flex flex-col gap-5">
        {sorted.map((r) => (
          <ReviewRow key={r.id} review={r} onCopy={onCopy} copiedId={copiedId} onDeleteRequest={onDeleteRequest} />
        ))}
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function FinalDashboardPage() {
  const [reviews, setReviews] = useState<ReviewWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ReviewWithItems | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/final-reviews')
      .then((r) => r.json())
      .then((d) => { setReviews(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleCopy = (e: React.MouseEvent, token: string, id: string) => {
    e.preventDefault()
    navigator.clipboard.writeText(`${window.location.origin}/final/aprovar/${token}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/final-reviews/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id))
        setDeleteTarget(null)
      }
    } catch {
      // silencioso
    } finally {
      setDeleting(false)
    }
  }

  const grouped = reviews.reduce<Record<string, ReviewWithItems[]>>((acc, r) => {
    if (!acc[r.client_name]) acc[r.client_name] = []
    acc[r.client_name].push(r)
    return acc
  }, {})

  const sortedClients = Object.entries(grouped).sort(([, a], [, b]) => {
    const la = Math.max(...a.map((r) => new Date(r.created_at).getTime()))
    const lb = Math.max(...b.map((r) => new Date(r.created_at).getTime()))
    return lb - la
  })

  return (
    <>
      {deleteTarget && (
        <DeleteDialog
          name={`${deleteTarget.client_name} — ${deleteTarget.month_reference}`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => !deleting && setDeleteTarget(null)}
          loading={deleting}
        />
      )}
      <main className="min-h-screen bg-gray-50">
        <AppTabs />
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Aprovação Final</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {sortedClients.length > 0
                  ? `${sortedClients.length} cliente${sortedClients.length !== 1 ? 's' : ''} · ${reviews.length} aprovação${reviews.length !== 1 ? 'ões' : ''}`
                  : 'Envie conteúdos finalizados para aprovação'}
              </p>
            </div>
            <Link href="/final/criar"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              + Novo
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
          {loading ? (
            [1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/4 mb-4" />
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))
          ) : sortedClients.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-gray-400 text-sm">Nenhuma aprovação final criada ainda.</p>
              <Link href="/final/criar" className="inline-block mt-4 text-indigo-600 text-sm font-medium hover:underline">
                Criar primeira aprovação final
              </Link>
            </div>
          ) : (
            sortedClients.map(([clientName, clientReviews]) => (
              <ClientGroup
                key={clientName} clientName={clientName} reviews={clientReviews}
                onCopy={handleCopy} copiedId={copiedId} onDeleteRequest={setDeleteTarget}
              />
            ))
          )}
        </div>
      </main>
    </>
  )
}
