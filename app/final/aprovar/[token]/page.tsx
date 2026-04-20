'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  FinalReview,
  FinalReviewItem,
  ApprovalStatus,
  getReviewStats,
  getMediaKind,
  getYouTubeEmbedUrl,
  getVimeoEmbedUrl,
  isDirectImageUrl,
  isDirectVideoUrl,
  ensureHttps,
  formatDate,
  CONTENT_TYPE_LABELS,
  NETWORK_LABELS,
} from '@/types/final'

// ─── Visualizador de mídia ────────────────────────────────────────────────────
function MediaViewer({ url }: { url: string }) {
  const safe = ensureHttps(url.trim())

  const ytEmbed    = getYouTubeEmbedUrl(safe)
  const vimeoEmbed = getVimeoEmbedUrl(safe)
  const isImg      = isDirectImageUrl(safe)
  const isVid      = isDirectVideoUrl(safe)

  if (ytEmbed) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
        <iframe src={ytEmbed} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
      </div>
    )
  }
  if (vimeoEmbed) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
        <iframe src={vimeoEmbed} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" />
      </div>
    )
  }
  if (isImg) {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={safe} alt="" className="max-w-full max-h-[480px] object-contain" />
      </div>
    )
  }
  if (isVid) {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-black">
        <video src={safe} controls className="w-full max-h-[480px]" />
      </div>
    )
  }

  return (
    <a href={safe} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors w-fit">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
      Abrir mídia
    </a>
  )
}

// ─── Carrossel / Stories ──────────────────────────────────────────────────────
function CarouselViewer({ urls }: { urls: string[] }) {
  const [current, setCurrent] = useState(0)
  if (urls.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <MediaViewer url={urls[current]} />
      {urls.length > 1 && (
        <>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors px-2 py-1 rounded-lg text-sm"
            >
              ← Anterior
            </button>
            <span className="text-xs text-gray-400">{current + 1} / {urls.length}</span>
            <button
              onClick={() => setCurrent((c) => Math.min(urls.length - 1, c + 1))}
              disabled={current === urls.length - 1}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors px-2 py-1 rounded-lg text-sm"
            >
              Próximo →
            </button>
          </div>
          <div className="flex gap-1.5 justify-center">
            {urls.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-indigo-500' : 'bg-gray-200'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Card de aprovação (item individual) ──────────────────────────────────────
function ApprovalCard({
  item,
  isCompleted,
  onStatusChange,
  onFeedbackChange,
}: {
  item: FinalReviewItem
  isCompleted: boolean
  onStatusChange: (id: string, status: ApprovalStatus) => Promise<void>
  onFeedbackChange: (id: string, feedback: string) => Promise<void>
}) {
  const kind      = getMediaKind(item.type)
  const mediaUrls = item.media_items.map((m) => m.url).filter(Boolean)
  const isMulti   = kind === 'multi'

  const [feedback,    setFeedback]    = useState(item.client_feedback ?? '')
  const [savingFb,    setSavingFb]    = useState(false)
  const [savingAppr,  setSavingAppr]  = useState(false)
  const [fbSaved,     setFbSaved]     = useState(false)
  const [localStatus, setLocalStatus] = useState<ApprovalStatus>(item.approval_status)

  // Debounce feedback save
  useEffect(() => {
    if (isCompleted) return
    const timeout = setTimeout(async () => {
      if (feedback === (item.client_feedback ?? '')) return
      setSavingFb(true)
      await onFeedbackChange(item.id, feedback)
      setSavingFb(false)
      setFbSaved(true)
      setTimeout(() => setFbSaved(false), 1500)
    }, 800)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback])

  const handleStatus = async (status: ApprovalStatus) => {
    if (isCompleted || savingAppr) return
    setSavingAppr(true)
    setLocalStatus(status)
    await onStatusChange(item.id, status)
    setSavingAppr(false)
  }

  const statusColors: Record<ApprovalStatus, string> = {
    pending:  'border-gray-100',
    approved: 'border-green-300',
    rejected: 'border-red-300',
  }

  return (
    <div className={`bg-white border-2 rounded-2xl shadow-sm overflow-hidden transition-all ${statusColors[localStatus]}`}>
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                {CONTENT_TYPE_LABELS[item.type]}
              </span>
              {item.social_networks.map((n) => (
                <span key={n} className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                  {NETWORK_LABELS[n]}
                </span>
              ))}
              {(item.publish_date || item.publish_time) && (
                <span className="text-xs text-gray-400">
                  {item.publish_date ? formatDate(item.publish_date) : ''}
                  {item.publish_time ? ` às ${item.publish_time.slice(0, 5)}` : ''}
                </span>
              )}
            </div>
          </div>
          {/* Status indicator */}
          {localStatus !== 'pending' && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
              localStatus === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}>
              {localStatus === 'approved' ? 'Aprovado' : 'Reprovado'}
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Mídia */}
        {mediaUrls.length > 0 && (
          isMulti ? <CarouselViewer urls={mediaUrls} /> : <MediaViewer url={mediaUrls[0]} />
        )}

        {/* Legenda */}
        {item.caption && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Legenda</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.caption}</p>
          </div>
        )}

        {/* Observações */}
        {item.observations && (
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs font-medium text-gray-400 mb-1">Observação</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.observations}</p>
          </div>
        )}

        {/* Referência */}
        {item.reference_url && (
          <a
            href={ensureHttps(item.reference_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Ver referência
          </a>
        )}

        {/* Botões de aprovação */}
        {!isCompleted && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handleStatus('approved')}
              disabled={savingAppr}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                localStatus === 'approved'
                  ? 'bg-green-500 text-white'
                  : 'border border-green-300 text-green-700 hover:bg-green-50'
              }`}
            >
              Aprovar
            </button>
            <button
              onClick={() => handleStatus('rejected')}
              disabled={savingAppr}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                localStatus === 'rejected'
                  ? 'bg-red-500 text-white'
                  : 'border border-red-200 text-red-600 hover:bg-red-50'
              }`}
            >
              Reprovar
            </button>
          </div>
        )}

        {/* Feedback do cliente */}
        {isCompleted ? (
          item.client_feedback ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Seu comentário</p>
              <p className="text-sm text-amber-800 whitespace-pre-wrap">{item.client_feedback}</p>
            </div>
          ) : null
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-400">
                Comentário <span className="font-normal text-gray-300">(opcional)</span>
              </label>
              {savingFb && <span className="text-xs text-gray-300">Salvando...</span>}
              {fbSaved && !savingFb && <span className="text-xs text-green-500">Salvo</span>}
            </div>
            <textarea
              placeholder="Deixe aqui suas observações ou pedidos de ajuste..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-transparent resize-none"
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página pública de aprovação final ───────────────────────────────────────
export default function FinalApprovalPage() {
  const { token } = useParams<{ token: string }>()

  const [review,    setReview]    = useState<(FinalReview & { items: FinalReviewItem[] }) | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [finalized,  setFinalized]  = useState(false)
  const [finalError, setFinalError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/final-approve/${token}`)
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return }
        const d = await r.json()
        setReview(d)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  const handleStatusChange = useCallback(async (itemId: string, status: ApprovalStatus) => {
    await fetch(`/api/final-approve/${token}/item/${itemId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ approval_status: status }),
    })
    setReview((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((i) => i.id === itemId ? { ...i, approval_status: status } : i),
      }
    })
  }, [token])

  const handleFeedbackChange = useCallback(async (itemId: string, feedback: string) => {
    await fetch(`/api/final-approve/${token}/item/${itemId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ client_feedback: feedback }),
    })
    setReview((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((i) => i.id === itemId ? { ...i, client_feedback: feedback } : i),
      }
    })
  }, [token])

  const handleFinalize = async () => {
    setFinalError(null)
    setFinalizing(true)
    try {
      const res = await fetch(`/api/final-approve/${token}/finalize`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json()
        setFinalError(d.error || 'Erro ao finalizar.')
        return
      }
      setReview((prev) => prev ? { ...prev, status: 'completed' } : prev)
      setFinalized(true)
    } catch {
      setFinalError('Erro de conexão.')
    } finally {
      setFinalizing(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-xl mx-auto px-4 py-10 flex flex-col gap-4 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/2 mx-auto" />
          <div className="h-3 bg-gray-100 rounded w-1/3 mx-auto" />
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="aspect-video bg-gray-100 rounded-xl" />
              <div className="flex gap-2 mt-4">
                <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
                <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </main>
    )
  }

  // ── Not found / Draft ─────────────────────────────────────────────────────
  if (notFound || !review) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center py-20">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Link inválido</h2>
          <p className="text-sm text-gray-400">Este link de aprovação não foi encontrado ou ainda não está disponível.</p>
        </div>
      </main>
    )
  }

  const isCompleted = review.status === 'completed'
  const stats       = getReviewStats(review.items)
  const allReviewed = stats.pending === 0
  const canFinalize = allReviewed && !isCompleted

  // ── Tela de conclusão ─────────────────────────────────────────────────────
  if (isCompleted || finalized) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center py-20">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Aprovação concluída!</h2>
          <p className="text-sm text-gray-500 mt-1">
            Obrigado, {review.client_name}. Suas respostas foram registradas.
          </p>
          {stats.total > 0 && (
            <div className="mt-4 flex gap-3 justify-center text-sm">
              {stats.approved > 0 && (
                <span className="text-green-600 font-semibold">{stats.approved} aprovado{stats.approved !== 1 ? 's' : ''}</span>
              )}
              {stats.rejected > 0 && (
                <span className="text-red-500 font-semibold">{stats.rejected} reprovado{stats.rejected !== 1 ? 's' : ''}</span>
              )}
            </div>
          )}
        </div>
      </main>
    )
  }

  // ── Página de aprovação ───────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header público */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-xl mx-auto px-4 py-5">
          <h1 className="text-xl font-bold text-gray-900">{review.client_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{review.month_reference}</p>
          <p className="text-xs text-gray-400 mt-2">
            Revise cada conteúdo abaixo e clique em Aprovar ou Reprovar.
            Quando terminar tudo, clique em Finalizar aprovação.
          </p>

          {/* Barra de progresso */}
          {stats.total > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>{stats.total - stats.pending} de {stats.total} revisados</span>
                <span>{stats.approved} aprovado{stats.approved !== 1 ? 's' : ''} · {stats.rejected} reprovado{stats.rejected !== 1 ? 's' : ''}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-green-400 transition-all duration-500"
                  style={{ width: `${(stats.approved / stats.total) * 100}%` }} />
                <div className="bg-red-400 transition-all duration-500"
                  style={{ width: `${(stats.rejected / stats.total) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Itens */}
      <div className="max-w-xl mx-auto px-4 py-6 flex flex-col gap-5">
        {review.items.map((item) => (
          <ApprovalCard
            key={item.id}
            item={item}
            isCompleted={isCompleted}
            onStatusChange={handleStatusChange}
            onFeedbackChange={handleFeedbackChange}
          />
        ))}

        {/* Botão finalizar */}
        <div className="pt-2 pb-8">
          {finalError && (
            <p className="text-xs text-red-500 mb-2 text-center">{finalError}</p>
          )}
          <button
            onClick={handleFinalize}
            disabled={!canFinalize || finalizing}
            className={`w-full py-4 rounded-2xl text-sm font-bold transition-all ${
              canFinalize
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            {finalizing
              ? 'Finalizando...'
              : canFinalize
              ? 'Finalizar aprovação'
              : `Revise todos os conteúdos primeiro (${stats.pending} pendente${stats.pending !== 1 ? 's' : ''})`
            }
          </button>
        </div>
      </div>
    </main>
  )
}
