'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AppTabs from '@/components/AppTabs'
import {
  FinalReview,
  FinalReviewItem,
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

type ReviewStatus = 'draft' | 'sent' | 'completed'
type FilterTab    = 'all' | 'pending' | 'approved' | 'rejected'

// ─── Badge de status da review ────────────────────────────────────────────────
function StatusBadge({ status }: { status: ReviewStatus }) {
  const map = {
    draft:     { label: 'Rascunho',   cls: 'bg-gray-100 text-gray-500' },
    sent:      { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Finalizado', cls: 'bg-green-100 text-green-700' },
  }
  const { label, cls } = map[status]
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}

// ─── Badge de aprovação ───────────────────────────────────────────────────────
function ApprovalBadge({ status }: { status: FinalReviewItem['approval_status'] }) {
  const map = {
    pending:  { label: 'Pendente',   cls: 'bg-gray-100 text-gray-500' },
    approved: { label: 'Aprovado',   cls: 'bg-green-100 text-green-700' },
    rejected: { label: 'Reprovado',  cls: 'bg-red-100 text-red-600' },
  }
  const { label, cls } = map[status]
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}

// ─── Visualizador de mídia (item único) ───────────────────────────────────────
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
        <video
          src={safe}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-[480px]"
        />
      </div>
    )
  }

  // Link genérico
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
      )}
      {/* Miniaturas indicadoras */}
      {urls.length > 1 && (
        <div className="flex gap-1.5 justify-center">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-indigo-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Card de item ─────────────────────────────────────────────────────────────
function ItemCard({ item }: { item: FinalReviewItem }) {
  const kind       = getMediaKind(item.type)
  const mediaUrls  = item.media_items.map((m) => m.url).filter(Boolean)
  const isMulti    = kind === 'multi'

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
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
          <ApprovalBadge status={item.approval_status} />
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Mídia */}
        {mediaUrls.length > 0 && (
          <div>
            {isMulti ? (
              <CarouselViewer urls={mediaUrls} />
            ) : (
              <MediaViewer url={mediaUrls[0]} />
            )}
          </div>
        )}

        {/* Legenda final */}
        {item.caption && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Legenda</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.caption}</p>
          </div>
        )}

        {/* Observações */}
        {item.observations && (
          <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Observações</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.observations}</p>
          </div>
        )}

        {/* Feedback do cliente */}
        {item.client_feedback && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Feedback do cliente</p>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{item.client_feedback}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function FinalDetailPage() {
  const { id }     = useParams<{ id: string }>()
  const [review, setReview]   = useState<(FinalReview & { items: FinalReviewItem[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<FilterTab>('all')
  const [copied, setCopied]   = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/final-reviews/${id}`)
      .then((r) => r.json())
      .then((d) => { setReview(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <AppTabs />
        <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-4 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="aspect-video bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  if (!review) {
    return (
      <main className="min-h-screen bg-gray-50">
        <AppTabs />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <p className="text-gray-400 text-sm">Aprovação não encontrada.</p>
          <Link href="/final" className="inline-block mt-4 text-indigo-600 text-sm hover:underline">
            Voltar
          </Link>
        </div>
      </main>
    )
  }

  const stats        = getReviewStats(review.items)
  const shareUrl     = `${typeof window !== 'undefined' ? window.location.origin : ''}/final/aprovar/${review.share_token}`

  const filteredItems = review.items.filter((item) => {
    if (filter === 'all')      return true
    if (filter === 'pending')  return item.approval_status === 'pending'
    if (filter === 'approved') return item.approval_status === 'approved'
    if (filter === 'rejected') return item.approval_status === 'rejected'
    return true
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = async () => {
    if (review.status !== 'draft') return
    setSendError(null)
    setSending(true)
    try {
      const res = await fetch(`/api/final-reviews/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'sent' }),
      })
      const data = await res.json()
      if (!res.ok) return setSendError(data.error || 'Erro ao enviar.')
      setReview((prev) => prev ? { ...prev, status: 'sent' } : prev)
    } catch {
      setSendError('Erro de conexão.')
    } finally {
      setSending(false)
    }
  }

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',      label: 'Todos',      count: stats.total },
    { key: 'pending',  label: 'Pendentes',  count: stats.pending },
    { key: 'approved', label: 'Aprovados',  count: stats.approved },
    { key: 'rejected', label: 'Reprovados', count: stats.rejected },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      <AppTabs />

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Link href="/final" className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">←</Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{review.client_name}</h1>
                  <StatusBadge status={review.status} />
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{review.month_reference}</p>
                {stats.total > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    {stats.total} conteúdo{stats.total !== 1 ? 's' : ''}
                    {stats.approved > 0 && ` · ${stats.approved} aprovado${stats.approved !== 1 ? 's' : ''}`}
                    {stats.rejected > 0 && ` · ${stats.rejected} reprovado${stats.rejected !== 1 ? 's' : ''}`}
                    {stats.pending > 0  && ` · ${stats.pending} pendente${stats.pending !== 1 ? 's' : ''}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Link de compartilhamento */}
          {review.status !== 'draft' && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs text-gray-300 font-mono flex-1 truncate">
                /final/aprovar/{review.share_token}
              </span>
              <button
                onClick={handleCopy}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shrink-0 ${
                  copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-700'
                }`}
              >
                {copied ? 'Copiado' : 'Copiar link'}
              </button>
            </div>
          )}

          {/* Botão de enviar (draft → sent) */}
          {review.status === 'draft' && (
            <div className="mt-4">
              <button
                onClick={handleSend}
                disabled={sending}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                {sending ? 'Enviando...' : 'Gerar e enviar link'}
              </button>
              {sendError && <p className="text-xs text-red-500 mt-1">{sendError}</p>}
            </div>
          )}
        </div>

        {/* Abas de filtro */}
        {stats.total > 0 && (
          <div className="max-w-2xl mx-auto px-4 flex gap-0 border-t border-gray-50">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  filter === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full text-[10px]">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Itens */}
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">Nenhum conteúdo nesta categoria.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))
        )}
      </div>
    </main>
  )
}
